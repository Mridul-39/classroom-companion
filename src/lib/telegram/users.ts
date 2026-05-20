import type { User } from '@prisma/client';
import type TelegramBot from 'node-telegram-bot-api';
import { db } from '@/lib/db';
import { DEMO_TEACHER_ID } from '@/lib/constants';
import { sendRegistrationConfirmationEmail } from '@/lib/email';

type TelegramFrom = TelegramBot.User;

/** Only stable identifier: Telegram numeric user id (set on register/link). */
export async function resolveUser(from: TelegramFrom): Promise<User | null> {
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
): Promise<{ user: User; linkedExisting: boolean }> {
  const telegramId = String(from.id);
  const email = input.email.trim().toLowerCase();

  const byTelegram = await resolveUser(from);
  if (byTelegram) {
    return { user: byTelegram, linkedExisting: true };
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

    return { user, linkedExisting: true };
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

    return { user, linkedExisting: Boolean(pending.telegramId) };
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

  return { user, linkedExisting: false };
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
  const user = await resolveUser(from);
  if (!user) {
    return {
      error:
        'You are not signed in. Send /start to register, or /register with your details.',
    };
  }
  return { user };
}
