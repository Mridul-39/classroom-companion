import type TelegramBot from 'node-telegram-bot-api';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import { getTelegramConfig } from '@/lib/telegram/config';
import { formatAssignmentLine } from '@/lib/telegram/format';
import {
  addProgressUpdate,
  addSubmission,
  addTeacherFeedback,
  createAssignmentFromBot,
  findAssignmentForUser,
  findStudentForTeacher,
} from '@/lib/telegram/assignments';
import { notifyUser } from '@/lib/telegram/notify';
import {
  parseRegisterCommand,
  RegistrationError,
  registerUser,
  requireUser,
  resolveUser,
} from '@/lib/telegram/users';

function helpText(role: string, appBaseUrl: string): string {
  const dash =
    role === 'teacher'
      ? `${appBaseUrl}/dashboard/teacher`
      : `${appBaseUrl}/dashboard/student`;

  const common = [
    '/start — sign in or register',
    '/help — this message',
    `/dashboard — open web dashboard\n${dash}`,
  ];

  if (role === 'teacher') {
    return (
      '*Teacher commands*\n' +
      common.join('\n') +
      '\n\n/students — list your students\n/assignments — list all assignments\n' +
      '/assign student | title | description | days\n' +
      'Example:\n`/assign riya | Essay on plants | 500 words | 7`\n\n' +
      '/feedback assignmentId | message\n' +
      'Send feedback on a submission\n\n' +
      '_Teacher sign-up is invite-only. Ask your admin for a verification code._'
    );
  }

  return (
    '*Student commands*\n' +
    common.join('\n') +
    '\n\n/myassignments — your assignments\n' +
    '/progress assignmentId | message\n' +
    '/submit assignmentId | message or file caption\n\n' +
    '_Student sign-up requires an invite code from your teacher._'
  );
}

export function registerHandlers(bot: TelegramBot) {
  const { appBaseUrl } = getTelegramConfig();

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from) return;

    const user = await resolveUser(from);

    if (!user) {
      await bot.sendMessage(
        chatId,
        'Welcome to *Classroom Companion*.\n\n' +
          'This Telegram account is not registered yet.\n\n' +
          '*Register (email required):*\n' +
          '`/register teacher FirstName LastName email@school.com INV-XXXX`\n' +
          '`/register student FirstName LastName email@school.com INV-XXXX`\n\n' +
          'Teachers and students must use the invite code sent by your administrator or teacher.\n' +
          'If you already use the web dashboard, use the *same email* to link this Telegram to that account.\n\n' +
          '*Examples:*\n' +
          '`/register teacher Meera Kapoor meera.kapoor@example.com INV-ABCD12`\n' +
          '`/register student Riya Sharma riya.sharma@example.com INV-ABCD12`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `Hi ${user.firstName}! You're signed in as *${user.role}*.\n\n${helpText(user.role, appBaseUrl)}`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.onText(/\/register (.+)/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from || !match?.[1]) return;

    const parsed = parseRegisterCommand(`/register ${match[1]}`);
    if (!parsed) {
      await bot.sendMessage(
        chatId,
        'Usage:\n`/register teacher FirstName LastName email@school.com`\n`/register student FirstName LastName email@school.com INV-XXXX`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (parsed.role === 'student' && !parsed.inviteCode) {
      await bot.sendMessage(
        chatId,
        'Student registration requires an invite code from your teacher. Please register like:\n`/register student FirstName LastName email@school.com INV-XXXX`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      const { user, linkedExisting } = await registerUser(from, parsed);
      await bot.sendMessage(
        chatId,
        linkedExisting
          ? `Welcome back, *${user.firstName}*! This Telegram is linked to your ${user.role} account.\n\n${helpText(user.role, appBaseUrl)}`
          : `Account created. Welcome, *${user.firstName}*! You're registered as *${user.role}*.\n\n${helpText(user.role, appBaseUrl)}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      if (err instanceof RegistrationError) {
        await bot.sendMessage(chatId, err.message);
        return;
      }
      console.error('Registration failed:', err);
      const existing = await resolveUser(from);
      if (existing) {
        await bot.sendMessage(
          chatId,
          `You're already signed in as *${existing.firstName}* (${existing.role}).\n\n${helpText(existing.role, appBaseUrl)}`,
          { parse_mode: 'Markdown' }
        );
        return;
      }
      await bot.sendMessage(
        chatId,
        'Could not create your account. Please try again.'
      );
    }
  });

  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }

    await bot.sendMessage(chatId, helpText(result.user.role, appBaseUrl), {
      parse_mode: 'Markdown',
    });
  });

  bot.onText(/\/dashboard/, async (msg) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }

    const url =
      result.user.role === 'teacher'
        ? `${appBaseUrl}/dashboard/teacher`
        : `${appBaseUrl}/dashboard/student`;

    await bot.sendMessage(chatId, `Open your dashboard:\n${url}`);
  });

  bot.onText(/\/students/, async (msg) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }
    if (result.user.role !== 'teacher') {
      await bot.sendMessage(chatId, 'This command is for teachers only.');
      return;
    }

    const links = await db.teacherStudent.findMany({
      where: { teacherId: result.user.id },
      include: { student: true },
    });

    if (links.length === 0) {
      await bot.sendMessage(chatId, 'No students linked yet.');
      return;
    }

    const lines = links.map(
      ({ student }) =>
        `• ${student.firstName} ${student.lastName} (\`${student.id}\`)`
    );

    await bot.sendMessage(chatId, `*Your students*\n\n${lines.join('\n')}`, {
      parse_mode: 'Markdown',
    });
  });

  bot.onText(/\/assignments/, async (msg) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }
    if (result.user.role !== 'teacher') {
      await bot.sendMessage(chatId, 'Use /myassignments as a student.');
      return;
    }

    const assignments = await db.assignment.findMany({
      where: { teacherId: result.user.id },
      orderBy: { dueDate: 'asc' },
    });

    if (assignments.length === 0) {
      await bot.sendMessage(chatId, 'No assignments yet.');
      return;
    }

    const withStudents = await Promise.all(
      assignments.map(async (a) => {
        const student = await db.user.findUnique({ where: { id: a.studentId } });
        return formatAssignmentLine(a, student);
      })
    );

    await bot.sendMessage(chatId, `*Assignments*\n\n${withStudents.join('\n\n')}`, {
      parse_mode: 'Markdown',
    });
  });

  bot.onText(/\/assign (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from || !match?.[1]) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }
    if (result.user.role !== 'teacher') {
      await bot.sendMessage(chatId, 'Only teachers can create assignments.');
      return;
    }

    const parts = match[1].split('|').map((p) => p.trim());
    if (parts.length < 4) {
      await bot.sendMessage(
        chatId,
        'Usage: `/assign student | title | description | days`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const [studentQuery, title, description, daysStr] = parts;
    const dueInDays = parseInt(daysStr, 10);
    if (Number.isNaN(dueInDays) || dueInDays < 1) {
      await bot.sendMessage(chatId, 'Days must be a positive number.');
      return;
    }

    const student = await findStudentForTeacher(result.user.id, studentQuery);
    if (!student) {
      await bot.sendMessage(chatId, `Student not found: ${studentQuery}`);
      return;
    }

    const assignment = await createAssignmentFromBot(
      result.user.id,
      student.id,
      title,
      description,
      dueInDays
    );

    await bot.sendMessage(
      chatId,
      `Created assignment for *${student.firstName}*:\n${formatAssignmentLine(assignment, student)}`,
      { parse_mode: 'Markdown' }
    );

    await notifyUser(
      bot,
      student.id,
      `📚 New assignment from ${result.user.firstName}:\n*${title}*\nDue: ${format(assignment.dueDate, 'MMM d, yyyy')}\n\n${description}\n\nid: \`${assignment.id}\``
    );
  });

  bot.onText(/\/myassignments/, async (msg) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }
    if (result.user.role !== 'student') {
      await bot.sendMessage(chatId, 'Use /assignments as a teacher.');
      return;
    }

    const assignments = await db.assignment.findMany({
      where: { studentId: result.user.id },
      orderBy: { dueDate: 'asc' },
    });

    if (assignments.length === 0) {
      await bot.sendMessage(chatId, 'No assignments yet.');
      return;
    }

    const lines = assignments.map((a) => formatAssignmentLine(a));
    await bot.sendMessage(chatId, `*Your assignments*\n\n${lines.join('\n\n')}`, {
      parse_mode: 'Markdown',
    });
  });

  bot.onText(/\/progress (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from || !match?.[1]) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }
    if (result.user.role !== 'student') {
      await bot.sendMessage(chatId, 'Only students can post progress updates.');
      return;
    }

    const pipe = match[1].indexOf('|');
    if (pipe === -1) {
      await bot.sendMessage(
        chatId,
        'Usage: `/progress assignmentId | your update`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const assignmentRef = match[1].slice(0, pipe).trim();
    const message = match[1].slice(pipe + 1).trim();
    if (!message) {
      await bot.sendMessage(chatId, 'Please include a progress message.');
      return;
    }

    const assignment = await findAssignmentForUser(result.user, assignmentRef);
    if (!assignment) {
      await bot.sendMessage(chatId, 'Assignment not found.');
      return;
    }

    const { assignment: updated } = await addProgressUpdate(
      assignment.id,
      result.user.id,
      message
    );

    await bot.sendMessage(
      chatId,
      `Progress saved. Status: *${updated.status}*`,
      { parse_mode: 'Markdown' }
    );

    const teacher = await db.user.findUnique({ where: { id: assignment.teacherId } });
    if (teacher) {
      await notifyUser(
        bot,
        teacher.id,
        `📝 *${result.user.firstName}* updated *${assignment.title}*:\n${message}\n\nStatus: ${updated.status}`
      );
    }
  });

  bot.onText(/\/submit (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from || !match?.[1]) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }
    if (result.user.role !== 'student') {
      await bot.sendMessage(chatId, 'Only students can submit work.');
      return;
    }

    const pipe = match[1].indexOf('|');
    if (pipe === -1) {
      await bot.sendMessage(
        chatId,
        'Usage: `/submit assignmentId | your submission text`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const assignmentRef = match[1].slice(0, pipe).trim();
    const content = match[1].slice(pipe + 1).trim();
    if (!content) {
      await bot.sendMessage(chatId, 'Please include submission content.');
      return;
    }

    const assignment = await findAssignmentForUser(result.user, assignmentRef);
    if (!assignment) {
      await bot.sendMessage(chatId, 'Assignment not found.');
      return;
    }

    await addSubmission(assignment.id, result.user.id, content);

    await bot.sendMessage(chatId, 'Submission received. Your teacher will review it in the dashboard.');

    const teacher = await db.user.findUnique({ where: { id: assignment.teacherId } });
    if (teacher) {
      await notifyUser(
        bot,
        teacher.id,
        `📤 *${result.user.firstName}* submitted *${assignment.title}*:\n${content}`
      );
    }
  });

  bot.onText(/\/feedback (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from || !match?.[1]) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }
    if (result.user.role !== 'teacher') {
      await bot.sendMessage(chatId, 'Only teachers can send feedback.');
      return;
    }

    const pipe = match[1].indexOf('|');
    if (pipe === -1) {
      await bot.sendMessage(
        chatId,
        'Usage: `/feedback assignmentId | your feedback`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const assignmentRef = match[1].slice(0, pipe).trim();
    const message = match[1].slice(pipe + 1).trim();
    if (!message) {
      await bot.sendMessage(chatId, 'Please include feedback text.');
      return;
    }

    const assignment = await findAssignmentForUser(result.user, assignmentRef);
    if (!assignment) {
      await bot.sendMessage(chatId, 'Assignment not found.');
      return;
    }

    await addTeacherFeedback(
      assignment.id,
      result.user.id,
      assignment.studentId,
      message
    );

    await bot.sendMessage(chatId, 'Feedback sent to the student.');

    await notifyUser(
      bot,
      assignment.studentId,
      `💬 Feedback on *${assignment.title}*:\n${message}`
    );
  });

  // Photo/document submissions with caption: assignmentId | note
  bot.on('photo', async (msg) => {
    const from = msg.from;
    const chatId = msg.chat.id;
    if (!from || !msg.photo?.length) return;

    const result = await requireUser(from);
    if ('error' in result || result.user.role !== 'student') return;

    const caption = msg.caption ?? '';
    const pipe = caption.indexOf('|');
    if (pipe === -1) return;

    const assignmentRef = caption.slice(0, pipe).trim();
    const note = caption.slice(pipe + 1).trim() || 'Photo submission';
    const assignment = await findAssignmentForUser(result.user, assignmentRef);
    if (!assignment) return;

    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const fileUrl = file.file_path
      ? `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`
      : undefined;

    await db.submission.create({
      data: {
        assignmentId: assignment.id,
        studentId: result.user.id,
        content: note,
        fileName: 'telegram-photo.jpg',
        fileUrl,
      },
    });
    await db.assignment.update({
      where: { id: assignment.id },
      data: { status: 'submitted' },
    });

    await bot.sendMessage(chatId, 'Photo submission saved.');
    await notifyUser(
      bot,
      assignment.teacherId,
      `📷 *${result.user.firstName}* submitted a photo for *${assignment.title}*`
    );
  });

  bot.on('message', async (msg) => {
    if (msg.text?.startsWith('/')) return;
    // Non-command text ignored for MVP
  });
}
