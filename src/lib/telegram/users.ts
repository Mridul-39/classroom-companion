import type { User } from '@prisma/client';
import type TelegramBot from 'node-telegram-bot-api';
import { db } from '@/lib/db';
import { sendRegistrationConfirmationEmail, sendLoginCredentialsEmail } from '@/lib/email';
import { generateTempPassword, hashPassword } from '@/lib/passwords';

type TelegramFrom = TelegramBot.User;

/** Only stable identifier: Telegram numeric user id (set on register/link). */
export async function resolveUser(from: TelegramFrom): Promise<User | null> {
  const user = await db.user.findFirst({ where: { telegramId: String(from.id) } });
  // Treat suspended users as not signed in; callers will tell them why.
  if (user?.suspendedAt) return null;
  return user;
}

/** Look up the user including suspended accounts — used for clearer messaging. */
export async function resolveUserIncludingSuspended(from: TelegramFrom): Promise<User | null> {
  return db.user.findFirst({ where: { telegramId: String(from.id) } });
}

async function attachTelegramProfile(
  userId: string,
  from: TelegramFrom
): Promise<User> {
  const username = from.username?.replace(/^@/, '') ?? null;

  return db.user.update({
    where: { id: userId },
    data: {
      telegramId: String(from.id),
      ...(username ? { telegramUsername: username } : {}),
    },
  });
}

/**
 * Issue a fresh temp password for a user that has no password yet.
 * Sends the plaintext via email (best-effort) and returns it so the bot can
 * also DM it in chat. Returns null if the user already has a password.
 */
async function issueTempPasswordIfMissing(user: User): Promise<string | null> {
  if (user.passwordHash) return null;

  const tempPassword = generateTempPassword();
  const hash = await hashPassword(tempPassword);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: hash } });

  if (user.email) {
    await sendLoginCredentialsEmail({
      to: user.email,
      firstName: user.firstName,
      role: user.role as 'student' | 'teacher',
      tempPassword,
    }).catch((err) => console.warn('[email] credentials email failed:', err));
  }

  return tempPassword;
}

export type RegisterInput = {
  role: 'teacher' | 'student';
  firstName: string;
  lastName: string;
  email: string;
  inviteCode?: string;
};

export class RegistrationError extends Error {
  constructor(
    message: string,
    readonly code: 'EMAIL_LINKED_OTHER' | 'ALREADY_REGISTERED'
  ) {
    super(message);
    this.name = 'RegistrationError';
  }
}

export async function registerUser(
  from: TelegramFrom,
  input: RegisterInput
): Promise<{ user: User; linkedExisting: boolean; tempPassword: string | null }> {
  const telegramId = String(from.id);
  const email = input.email.trim().toLowerCase();

  const byTelegram = await resolveUser(from);
  if (byTelegram) {
    return { user: byTelegram, linkedExisting: true, tempPassword: null };
  }

  const withEmail: User[] = await db.user.findMany({ where: { email: { not: null } } });
  const byEmail = withEmail.find((u: User) => u.email?.toLowerCase() === email) ?? null;

  if (byEmail) {
    if (byEmail.role !== input.role) {
      throw new RegistrationError(
        `This email is registered as a ${byEmail.role}. Use /register ${byEmail.role} instead.`,
        'ALREADY_REGISTERED'
      );
    }

    if (byEmail.telegramId && byEmail.telegramId !== telegramId) {
      throw new RegistrationError(
        'This email is already linked to another Telegram account.',
        'EMAIL_LINKED_OTHER'
      );
    }

    if (input.role === 'teacher' && byEmail.inviteCode) {
      if (!input.inviteCode || byEmail.inviteCode !== input.inviteCode) {
        throw new RegistrationError(
          'Teacher registration requires a valid invite code.',
          'ALREADY_REGISTERED'
        );
      }
    }

    if (input.role === 'student') {
      const invite = await db.teacherStudent.findFirst({
        where: { studentId: byEmail.id },
      });
      if (invite?.inviteCode && invite.inviteCode !== input.inviteCode) {
        throw new RegistrationError(
          'Student registration requires a valid invite code from your teacher.',
          'ALREADY_REGISTERED'
        );
      }
      if (!invite) {
        throw new RegistrationError(
          'You need to be invited by a teacher before registering as a student.',
          'ALREADY_REGISTERED'
        );
      }
    }

    const user = await attachTelegramProfile(byEmail.id, from);

    if (!byEmail.telegramId) {
      await sendRegistrationConfirmationEmail({
        to: byEmail.email ?? email,
        firstName: byEmail.firstName,
        role: byEmail.role as 'student' | 'teacher',
      });
    }

    if (input.role === 'teacher' && byEmail.inviteCode) {
      await db.user.update({
        where: { id: byEmail.id },
        data: { inviteCode: null },
      });
    }

    const tempPassword = await issueTempPasswordIfMissing(user);
    return { user, linkedExisting: true, tempPassword };
  }

  if (input.role === 'student') {
    throw new RegistrationError(
      'Student registration is by invitation only. Ask your teacher or admin for an invite code.',
      'ALREADY_REGISTERED'
    );
  }

  if (!input.inviteCode) {
    const existingTeacherCount = await db.user.count({ where: { role: 'teacher' } });
    if (existingTeacherCount > 0) {
      throw new RegistrationError(
        'Teacher registration requires an invite code from your administrator.',
        'ALREADY_REGISTERED'
      );
    }
  } else {
    const pending = await db.user.findFirst({
      where: { role: 'teacher', inviteCode: input.inviteCode },
    });
    if (!pending || pending.email?.toLowerCase() !== email) {
      throw new RegistrationError(
        'Invalid invite code or email does not match the invitation.',
        'ALREADY_REGISTERED'
      );
    }
    if (pending.telegramId && pending.telegramId !== telegramId) {
      throw new RegistrationError(
        'This teacher invitation was already used on another Telegram account.',
        'EMAIL_LINKED_OTHER'
      );
    }

    const user = await attachTelegramProfile(pending.id, from);
    await db.user.update({
      where: { id: pending.id },
      data: { inviteCode: null },
    });

    if (!pending.telegramId) {
      await sendRegistrationConfirmationEmail({
        to: user.email ?? email,
        firstName: user.firstName,
        role: 'teacher',
      });
    }

    const tempPassword = await issueTempPasswordIfMissing(user);
    return { user, linkedExisting: Boolean(pending.telegramId), tempPassword };
  }

  const id = `teacher-tg-${telegramId}`;
  const user = await db.user.create({
    data: {
      id,
      role: 'teacher',
      firstName: input.firstName,
      lastName: input.lastName,
      email,
      telegramId,
      telegramUsername: from.username?.replace(/^@/, '') ?? null,
    },
  });

  await sendRegistrationConfirmationEmail({
    to: user.email ?? email,
    firstName: user.firstName,
    role: 'teacher',
  });

  const tempPassword = await issueTempPasswordIfMissing(user);
  return { user, linkedExisting: false, tempPassword };
}

export function parseRegisterCommand(text: string): RegisterInput | null {
  const match = text.match(/^\/register\s+(teacher|student)\s+(.+)$/i);
  if (!match) return null;

  const role = match[1].toLowerCase() as 'teacher' | 'student';
  const tokens = match[2].trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  const emailTokenIndex = tokens.findIndex((token) => token.includes('@'));
  if (emailTokenIndex < 2) return null;

  const email = tokens[emailTokenIndex];
  const inviteCode = tokens[emailTokenIndex + 1];
  const nameTokens = tokens.slice(0, emailTokenIndex);
  if (nameTokens.length < 2) return null;

  const firstName = nameTokens[0];
  const lastName = nameTokens.slice(1).join(' ');

  return { role, firstName, lastName, email, inviteCode };
}

export async function requireUser(
  from: TelegramFrom
): Promise<{ user: User } | { error: string }> {
  const raw = await resolveUserIncludingSuspended(from);
  if (raw?.suspendedAt) {
    return {
      error: 'This account is suspended. Contact your administrator.',
    };
  }
  if (!raw) {
    return {
      error:
        'You are not signed in. Send /start to register, or /register with your details.',
    };
  }
  return { user: raw };
}

/**
 * Set or update the password for a Telegram-linked user. Used by /setpassword.
 */
export async function setUserPassword(userId: string, plaintext: string): Promise<void> {
  const hash = await hashPassword(plaintext);
  await db.user.update({ where: { id: userId }, data: { passwordHash: hash } });
}
