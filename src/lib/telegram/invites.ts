import type { User } from '@prisma/client';
import { db } from '@/lib/db';
import type { EmailDeliveryResult } from '@/lib/email';
import { sendStudentInviteEmail, sendTeacherInviteEmail } from '@/lib/email';
import { isAdminTeacher } from '@/lib/telegram/admin';

function generateInviteCode() {
  return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function findUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const users = await db.user.findMany({ where: { email: { not: null } } });
  return users.find((u) => u.email?.toLowerCase() === normalized) ?? null;
}

export function parseInviteCommand(text: string): {
  role: 'teacher' | 'student';
  firstName: string;
  lastName: string;
  email: string;
} | null {
  const match = text.match(/^\/invite\s+(teacher|student)\s+(.+)$/i);
  if (!match) return null;

  const role = match[1].toLowerCase() as 'teacher' | 'student';
  const tokens = match[2].trim().split(/\s+/).filter(Boolean);
  const emailIndex = tokens.findIndex((t) => t.includes('@'));
  if (emailIndex < 2) return null;

  const email = tokens[emailIndex];
  const firstName = tokens[0];
  const lastName = tokens.slice(1, emailIndex).join(' ');
  if (!firstName || !lastName) return null;

  return { role, firstName, lastName, email };
}

export class InviteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InviteError';
  }
}

/** Admin only — creates a pending teacher account with invite code. */
export async function inviteTeacher(admin: User, firstName: string, lastName: string, email: string) {
  if (!isAdminTeacher(admin)) {
    throw new InviteError('Only the admin teacher can invite other teachers.');
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.role !== 'teacher') {
      throw new InviteError('This email is already used by a student account.');
    }
    if (existing.telegramId) {
      throw new InviteError(`${existing.firstName} is already a registered teacher.`);
    }
    const code = existing.inviteCode ?? generateInviteCode();
    if (!existing.inviteCode) {
      await db.user.update({ where: { id: existing.id }, data: { inviteCode: code } });
    }
    const emailResult = await sendTeacherInviteEmail({
      to: email,
      teacherFirstName: existing.firstName,
      teacherLastName: existing.lastName,
      adminName: `${admin.firstName} ${admin.lastName}`,
      schoolName: admin.schoolName ?? undefined,
      inviteCode: code,
    });
    return { user: existing, inviteCode: code, resent: true, emailResult };
  }

  const inviteCode = generateInviteCode();
  const user = await db.user.create({
    data: {
      id: `teacher-pending-${Date.now()}`,
      role: 'teacher',
      firstName,
      lastName,
      email: email.trim().toLowerCase(),
      inviteCode,
      schoolName: admin.schoolName ?? undefined,
    },
  });

  const emailResult = await sendTeacherInviteEmail({
    to: email,
    teacherFirstName: firstName,
    teacherLastName: lastName,
    adminName: `${admin.firstName} ${admin.lastName}`,
    schoolName: admin.schoolName ?? undefined,
    inviteCode,
  });

  return { user, inviteCode, resent: false, emailResult };
}

/** Admin or any teacher — creates student + class link with invite code. */
export async function inviteStudent(
  inviter: User,
  firstName: string,
  lastName: string,
  email: string
) {
  if (inviter.role !== 'teacher') {
    throw new InviteError('Only teachers can invite students.');
  }

  const teacherId = inviter.id;
  let student = await findUserByEmail(email);

  if (student && student.role === 'teacher') {
    throw new InviteError('This email is already used by a teacher account.');
  }

  const inviteCode = generateInviteCode();

  if (!student) {
    student = await db.user.create({
      data: {
        id: `student-pending-${Date.now()}`,
        role: 'student',
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
      },
    });
  } else if (student.telegramId) {
    const existingLink = await db.teacherStudent.findFirst({
      where: { teacherId, studentId: student.id },
    });
    if (existingLink) {
      throw new InviteError(`${student.firstName} is already in your class.`);
    }
  }

  const existingLink = await db.teacherStudent.findFirst({
    where: { teacherId, studentId: student.id },
  });

  if (existingLink) {
    await db.teacherStudent.update({
      where: { id: existingLink.id },
      data: { inviteCode },
    });
  } else {
    await db.teacherStudent.create({
      data: { teacherId, studentId: student.id, inviteCode },
    });
  }

  const emailResult = await sendStudentInviteEmail({
    to: email,
    studentFirstName: firstName,
    studentLastName: lastName,
    teacherName: `${inviter.firstName} ${inviter.lastName}`,
    inviteCode,
  });

  return { student, inviteCode, emailResult };
}

export function formatEmailStatusNote(emailResult: EmailDeliveryResult): string {
  if (emailResult.sent) {
    return `\n📧 Invitation email sent to the address above.`;
  }
  return (
    `\n⚠️ *Email was not sent* — share the register command below manually (WhatsApp, etc.).\n` +
    `Reason: ${emailResult.reason}`
  );
}

export async function listPendingInvites(admin: User) {
  if (!isAdminTeacher(admin)) {
    throw new InviteError('Only the admin teacher can list all pending invites.');
  }

  const pendingTeachers = await db.user.findMany({
    where: { role: 'teacher', inviteCode: { not: null } },
    orderBy: { createdAt: 'desc' },
  });

  const pendingStudentLinks = await db.teacherStudent.findMany({
    where: { inviteCode: { not: null } },
    include: { student: true, teacher: true },
    orderBy: { linkedAt: 'desc' },
  });

  return { pendingTeachers, pendingStudentLinks };
}
