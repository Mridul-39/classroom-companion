import { addDays, addHours } from 'date-fns';
import type { Assignment, TeacherStudent, User } from '@prisma/client';
import { db } from '@/lib/db';

export async function findAssignmentForUser(
  user: User,
  idOrPrefix: string
) {
  const where =
    user.role === 'teacher'
      ? { teacherId: user.id }
      : { studentId: user.id };

  const assignments: Assignment[] = await db.assignment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  const needle = idOrPrefix.trim().toLowerCase();

  const byId =
    assignments.find(
      (a: Assignment) =>
        a.id === needle ||
        a.id.toLowerCase() === needle ||
        a.id.toLowerCase().startsWith(needle) ||
        a.id.toLowerCase().includes(needle)
    ) ?? null;
  if (byId) return byId;

  const titleNeedle = needle.replace(/\s+/g, ' ');
  if (titleNeedle.length < 3) return null;

  return (
    assignments.find((a: Assignment) => {
      const t = a.title.toLowerCase();
      return t === titleNeedle || t.includes(titleNeedle) || (t.length >= 4 && titleNeedle.includes(t));
    }) ?? null
  );
}

export async function listStudentsForTeacher(teacherId: string): Promise<User[]> {
  const links = await db.teacherStudent.findMany({
    where: { teacherId },
    include: { student: true },
  });
  return links.map((l) => l.student);
}

/** Only students linked to this teacher via TeacherStudent. */
export async function findStudentForTeacher(teacherId: string, query: string | null | undefined) {
  if (!query) return null;
  const students = await listStudentsForTeacher(teacherId);
  const q = query.trim().toLowerCase().replace(/^@/, '');
  if (!q || q.length < 2) return null;

  const exactFirst = students.find((s) => s.firstName.toLowerCase() === q);
  if (exactFirst) return exactFirst;

  const startsFirst = students.find((s) => s.firstName.toLowerCase().startsWith(q));
  if (startsFirst) return startsFirst;

  const byFullName = students.find((s) => {
    const full = `${s.firstName} ${s.lastName}`.toLowerCase();
    return full === q || full.includes(q) || s.lastName.toLowerCase().startsWith(q);
  });
  if (byFullName) return byFullName;

  const byUsername = students.find((s) => s.telegramUsername?.toLowerCase() === q);
  return byUsername ?? null;
}

export async function assertTeacherOwnsStudent(teacherId: string, studentId: string) {
  const link = await db.teacherStudent.findFirst({
    where: { teacherId, studentId },
  });
  if (!link) {
    const err = new Error('Student is not in this teacher\'s class');
    err.name = 'StudentNotLinkedError';
    throw err;
  }
}

export async function createAssignmentFromBot(
  teacherId: string,
  studentId: string,
  title: string,
  description: string,
  dueDate: Date,
  groupId?: string | null,
) {
  await assertTeacherOwnsStudent(teacherId, studentId);

  return db.assignment.create({
    data: {
      teacherId,
      studentId,
      title,
      description,
      dueDate,
      status: 'in_progress',
      ...(groupId ? { groupId } : {}),
    },
  });
}

/** For /assign command: days until due. */
export function dueDateFromDays(days: number) {
  return addDays(new Date(), days);
}

/** For natural language: hours until due. */
export function dueDateFromHours(hours: number) {
  return addHours(new Date(), hours);
}

export async function addProgressUpdate(
  assignmentId: string,
  studentId: string,
  message: string
) {
  const stuck =
    /\b(stuck|confused|help|don't understand|dont understand)\b/i.test(message);

  const [update, assignment] = await db.$transaction([
    db.progressUpdate.create({
      data: {
        assignmentId,
        studentId,
        message,
        aiStatus: stuck ? 'Stuck' : 'On track',
        needsTeacherAttention: stuck,
      },
    }),
    db.assignment.update({
      where: { id: assignmentId },
      data: { status: stuck ? 'stuck' : 'in_progress' },
    }),
  ]);

  return { update, assignment };
}

export async function addSubmission(
  assignmentId: string,
  studentId: string,
  content: string
) {
  const [submission, assignment] = await db.$transaction([
    db.submission.create({
      data: { assignmentId, studentId, content },
    }),
    db.assignment.update({
      where: { id: assignmentId },
      data: { status: 'submitted' },
    }),
  ]);

  return { submission, assignment };
}

export async function attachAssignmentFile(
  assignmentId: string,
  url: string,
  name: string
) {
  return db.assignment.update({
    where: { id: assignmentId },
    data: { attachmentUrl: url, attachmentName: name },
  });
}

export async function attachSubmissionFile(
  submissionId: string,
  url: string,
  name: string
) {
  return db.submission.update({
    where: { id: submissionId },
    data: { fileUrl: url, fileName: name },
  });
}

export async function addTeacherFeedback(
  assignmentId: string,
  teacherId: string,
  studentId: string,
  message: string
) {
  const [feedback, assignment] = await db.$transaction([
    db.feedback.create({
      data: { assignmentId, teacherId, studentId, message },
    }),
    db.assignment.update({
      where: { id: assignmentId },
      data: { status: 'completed' },
    }),
  ]);

  return { feedback, assignment };
}
