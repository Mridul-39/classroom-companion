import { format } from 'date-fns';
import type TelegramBot from 'node-telegram-bot-api';
import type { Assignment, User } from '@prisma/client';
import { db } from '@/lib/db';
import { notifyUser } from '@/lib/telegram/notify';
import { findAssignmentForUser } from '@/lib/telegram/assignments';

/** Offsets before due date (ms). `at_assign` is sent when the assignment is created. */
const REMINDER_SLOTS = [
  { type: 'at_assign', beforeDueMs: null as number | null },
  { type: '24h', beforeDueMs: 24 * 60 * 60 * 1000 },
  { type: '60m', beforeDueMs: 60 * 60 * 1000 },
  { type: '30m', beforeDueMs: 30 * 60 * 1000 },
  { type: '15m', beforeDueMs: 15 * 60 * 1000 },
] as const;

function buildReminderMessage(
  assignment: Assignment,
  student: User,
  teacher: User,
  slotType: string
): string {
  const dueStr = format(assignment.dueDate, 'MMM d, yyyy h:mm a');
  const base = `📚 *${assignment.title}*\nDue: ${dueStr}\n\n${assignment.description}`;

  switch (slotType) {
    case 'at_assign':
      return (
        `📚 New assignment from ${teacher.firstName}:\n*${assignment.title}*\nDue: ${dueStr}\n\n${assignment.description}\n\nid: \`${assignment.id}\``
      );
    case '24h':
      return `⏰ Reminder (${student.firstName}): "${assignment.title}" is due in about 24 hours.\n${base}`;
    case '60m':
      return `⏰ Reminder: "${assignment.title}" is due in about 1 hour.\n${base}`;
    case '30m':
      return `⏰ Reminder: "${assignment.title}" is due in about 30 minutes.\n${base}`;
    case '15m':
      return `⏰ Reminder: "${assignment.title}" is due in about 15 minutes.\n${base}`;
    case 'manual':
      return `⏰ Reminder from ${teacher.firstName}:\n${base}`;
    default:
      return `⏰ Reminder: "${assignment.title}" — due ${dueStr}`;
  }
}

export async function scheduleRemindersForAssignment(assignmentId: string) {
  const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) return { scheduled: 0, skipped: 0 };

  const [student, teacher] = await Promise.all([
    db.user.findUnique({ where: { id: assignment.studentId } }),
    db.user.findUnique({ where: { id: assignment.teacherId } }),
  ]);
  if (!student || !teacher) return { scheduled: 0, skipped: 0 };

  const now = Date.now();
  const dueMs = assignment.dueDate.getTime();
  let scheduled = 0;
  let skipped = 0;

  for (const slot of REMINDER_SLOTS) {
    const scheduledFor =
      slot.beforeDueMs === null ? new Date(now) : new Date(dueMs - slot.beforeDueMs);

    if (scheduledFor.getTime() > dueMs) {
      skipped++;
      continue;
    }
    if (slot.beforeDueMs !== null && scheduledFor.getTime() <= now) {
      skipped++;
      continue;
    }

    const message = buildReminderMessage(assignment, student, teacher, slot.type);

    await db.reminder.create({
      data: {
        assignmentId,
        reminderType: slot.type,
        message,
        scheduledFor,
        status: 'pending',
      },
    });
    scheduled++;
  }

  return { scheduled, skipped };
}

export async function processDueReminders(bot: TelegramBot) {
  const pending = await db.reminder.findMany({
    where: {
      status: 'pending',
      scheduledFor: { lte: new Date() },
    },
    take: 30,
    orderBy: { scheduledFor: 'asc' },
  });

  for (const reminder of pending) {
    const assignment = await db.assignment.findUnique({
      where: { id: reminder.assignmentId },
    });
    if (!assignment || assignment.status === 'completed') {
      await db.reminder.update({
        where: { id: reminder.id },
        data: { status: 'skipped' },
      });
      continue;
    }

    await notifyUser(bot, assignment.studentId, reminder.message);
    await db.reminder.update({
      where: { id: reminder.id },
      data: { status: 'sent', sentAt: new Date() },
    });
  }
}

export async function sendManualReminder(
  bot: TelegramBot,
  teacher: User,
  assignmentQuery: string,
  customNote?: string
) {
  const assignment = await findAssignmentForUser(teacher, assignmentQuery);
  if (!assignment) {
    return { ok: false as const, error: 'Assignment not found. Use the assignment id or title.' };
  }

  const student = await db.user.findUnique({ where: { id: assignment.studentId } });
  if (!student) {
    return { ok: false as const, error: 'Student not found for this assignment.' };
  }

  const message =
    customNote?.trim() ||
    buildReminderMessage(assignment, student, teacher, 'manual');

  await notifyUser(bot, student.id, message);

  await db.reminder.create({
    data: {
      assignmentId: assignment.id,
      reminderType: 'manual',
      message,
      scheduledFor: new Date(),
      sentAt: new Date(),
      status: 'sent',
    },
  });

  return {
    ok: true as const,
    assignment,
    student,
    message,
  };
}

export function formatReminderSummary(scheduled: number, skipped: number) {
  if (scheduled === 0) {
    return 'No future reminders were scheduled (deadline may be too soon for 24h/1h/30m/15m slots).';
  }
  const skipNote = skipped > 0 ? ` (${skipped} skipped — already passed or after deadline)` : '';
  return `Scheduled ${scheduled} reminder(s)${skipNote}: now, then 24h / 1h / 30m / 15m before due when applicable.`;
}
