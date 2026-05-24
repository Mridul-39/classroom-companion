import type TelegramBot from 'node-telegram-bot-api';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import { getTelegramConfig } from '@/lib/telegram/config';
import { escapeMarkdown, formatAssignmentLine } from '@/lib/telegram/format';
import {
  addProgressUpdate,
  addSubmission,
  addTeacherFeedback,
  attachAssignmentFile,
  attachSubmissionFile,
  createAssignmentFromBot,
  dueDateFromDays,
  findAssignmentForUser,
  findStudentForTeacher,
  listStudentsForTeacher,
} from '@/lib/telegram/assignments';
import {
  clearPending,
  consumePending,
  downloadAndSaveTelegramFile,
  peekPending,
  pickAttachableFile,
  setPending,
} from '@/lib/telegram/attachments';
import { notifyUser } from '@/lib/telegram/notify';
import {
  parseRegisterCommand,
  RegistrationError,
  registerUser,
  requireUser,
  resolveUser,
  setUserPassword,
} from '@/lib/telegram/users';
import {
  buildStudentChatContext,
  buildTeacherChatContext,
  userProfileFromDbUser,
} from '@/lib/telegram/chatContext';
import { transcribeTelegramAudio } from '@/lib/telegram/audio';
import { answerQuestion, detectMessageIntent, findAssignmentInText, parseAssignIntent } from '../../lib/llm.js';

function helpText(role: string, appBaseUrl: string): string {
  const dash =
    role === 'teacher'
      ? `${appBaseUrl}/dashboard/teacher`
      : `${appBaseUrl}/dashboard/student`;

  const common = [
    '*/start* — show this message',
    '*/help* — show this message',
    `*/dashboard* — open your web dashboard\n  ${dash}`,
    '*/setpassword* <new> — set or change your web login password',
    '*/skip* — cancel a pending file upload',
  ].join('\n');

  if (role === 'teacher') {
    return (
      '*👩‍🏫 Teacher commands*\n\n' +
      '*— General —*\n' +
      common +
      '\n\n*— Students & Assignments —*\n' +
      '*/students* — list all your students\n' +
      '*/assignments* — list all assignments with status\n\n' +
      '*— Create assignment —*\n' +
      '*/assign* student | title | description | days\n' +
      '  Example: `/assign Riya | Essay on plants | 500 words | 7`\n' +
      '  _Or just type naturally: "assign Riya an essay on plants due in 7 days"_\n' +
      '  _After creating, send a file within 60s to attach it._\n\n' +
      '*— Feedback —*\n' +
      '*/feedback* assignmentId | message\n' +
      '  Send feedback on a student submission\n\n' +
      '*— Other natural language —*\n' +
      '  _"Ask Mridul to share his file for Essay of 1000 words"_\n' +
      '  _"Remind Riya about her homework"_'
    );
  }

  return (
    '*🎒 Student commands*\n\n' +
    '*— General —*\n' +
    common +
    '\n\n*— Assignments —*\n' +
    '*/myassignments* — list your assignments and due dates\n\n' +
    '*— Progress update —*\n' +
    '*/progress* assignmentId | message\n' +
    '  Example: `/progress abc123 | Done with the introduction`\n' +
    '  _Or just type: "I finished the intro for the essay"_\n\n' +
    '*— Submit work —*\n' +
    '*/submit* — shows your pending assignments to pick from\n' +
    '*/submit* assignmentId | optional note\n' +
    '  _Or just type: "I completed the essay assignment"_\n' +
    '  _After submitting, send your file within 60s to attach it._'
  );
}

const TEACHER_COMMANDS: TelegramBot.BotCommand[] = [
  { command: 'start',       description: 'Show all commands' },
  { command: 'help',        description: 'Show all commands' },
  { command: 'dashboard',   description: 'Open your web dashboard' },
  { command: 'students',    description: 'List your students' },
  { command: 'assignments', description: 'List all assignments with status' },
  { command: 'assign',      description: 'Create an assignment: student | title | description | days' },
  { command: 'feedback',    description: 'Send feedback on a submission: assignmentId | message' },
  { command: 'setpassword', description: 'Change your web login password' },
  { command: 'skip',        description: 'Cancel a pending file upload' },
];

const STUDENT_COMMANDS: TelegramBot.BotCommand[] = [
  { command: 'start',          description: 'Show all commands' },
  { command: 'help',           description: 'Show all commands' },
  { command: 'dashboard',      description: 'Open your web dashboard' },
  { command: 'myassignments',  description: 'List your assignments and due dates' },
  { command: 'submit',         description: 'Submit an assignment: assignmentId | optional note' },
  { command: 'progress',       description: 'Post a progress update: assignmentId | message' },
  { command: 'setpassword',    description: 'Change your web login password' },
  { command: 'skip',           description: 'Cancel a pending file upload' },
];

async function setCommandsForChat(bot: TelegramBot, role: string, chatId: number) {
  const commands = role === 'teacher' ? TEACHER_COMMANDS : STUDENT_COMMANDS;
  try {
    await (bot as any).setMyCommands(commands, {
      scope: { type: 'chat', chat_id: chatId },
    });
  } catch (err) {
    console.warn('setMyCommands failed:', err);
  }
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

    await setCommandsForChat(bot, user.role, chatId);
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
      const { user, linkedExisting, tempPassword } = await registerUser(from, parsed);

      const baseMessage = linkedExisting
        ? `Welcome back, *${user.firstName}*! This Telegram is linked to your ${user.role} account.`
        : `Account created. Welcome, *${user.firstName}*! You're registered as *${user.role}*.`;

      await setCommandsForChat(bot, user.role, chatId);
      await bot.sendMessage(
        chatId,
        `${baseMessage}\n\n${helpText(user.role, appBaseUrl)}`,
        { parse_mode: 'Markdown' }
      );

      if (tempPassword) {
        await bot.sendMessage(
          chatId,
          [
            '*Web dashboard login*',
            `Sign-in URL: ${appBaseUrl}/login`,
            `Email: \`${user.email ?? ''}\``,
            `Password: \`${tempPassword}\``,
            '',
            'Change it any time with: `/setpassword <new password>`',
            '_(We also emailed these to you.)_',
          ].join('\n'),
          { parse_mode: 'Markdown' }
        );
      }
    } catch (err) {
      if (err instanceof RegistrationError) {
        await bot.sendMessage(chatId, err.message);
        return;
      }
      console.error('Registration failed:', err);
      const existing = await resolveUser(from);
      if (existing) {
        await setCommandsForChat(bot, existing.role, chatId);
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

  bot.onText(/^\/skip$/i, async (msg) => {
    const from = msg.from;
    if (!from) return;
    const had = peekPending(String(from.id));
    clearPending(String(from.id));
    await bot.sendMessage(
      msg.chat.id,
      had ? 'OK, no attachment.' : 'Nothing pending to skip.'
    );
  });

  bot.onText(/^\/setpassword(?:\s+(.+))?$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }

    const newPassword = match?.[1]?.trim();
    if (!newPassword) {
      await bot.sendMessage(
        chatId,
        'Usage: `/setpassword <new password>`\nExample: `/setpassword Mango42!`\nMinimum 8 characters.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (newPassword.length < 8) {
      await bot.sendMessage(chatId, 'Password must be at least 8 characters.');
      return;
    }

    try {
      await setUserPassword(result.user.id, newPassword);
      await bot.sendMessage(
        chatId,
        [
          'Password updated.',
          '',
          `Sign in at ${appBaseUrl}/login with your email and the new password.`,
          '',
          '_(For security, you may want to delete the message containing your password.)_',
        ].join('\n'),
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('setpassword failed:', err);
      await bot.sendMessage(chatId, 'Could not update password. Please try again.');
    }
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
      dueDateFromDays(dueInDays)
    );

    await bot.sendMessage(
      chatId,
      `Created assignment for *${escapeMarkdown(student.firstName)}*:\n${formatAssignmentLine(assignment, student)}\n\n` +
        '📎 Attach a file/image in the next 60 seconds, or send `/skip` to finish without one.',
      { parse_mode: 'Markdown' }
    );

    if (from.id) {
      setPending(String(from.id), { kind: 'assignment', assignmentId: assignment.id });
    }

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

  bot.onText(/^\/submit\s*$/i, async (msg) => {
    const chatId = msg.chat.id;
    const from = msg.from;
    if (!from) return;

    const result = await requireUser(from);
    if ('error' in result) {
      await bot.sendMessage(chatId, result.error);
      return;
    }
    if (result.user.role !== 'student') {
      await bot.sendMessage(chatId, 'Only students can submit work.');
      return;
    }

    const pending = await db.assignment.findMany({
      where: { studentId: result.user.id, status: { not: 'submitted' } },
      orderBy: { dueDate: 'asc' },
    });

    if (pending.length === 0) {
      await bot.sendMessage(chatId, 'You have no pending assignments to submit.');
      return;
    }

    const lines = pending.map((a) => `• \`${a.id}\` — ${a.title}`);
    await bot.sendMessage(
      chatId,
      `Which assignment are you submitting? Reply with:\n\`/submit <id> | optional note\`\n\n*Pending assignments:*\n${lines.join('\n')}`,
      { parse_mode: 'Markdown' }
    );
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
    const assignmentRef = (pipe === -1 ? match[1] : match[1].slice(0, pipe)).trim();
    const content = pipe === -1 ? '' : match[1].slice(pipe + 1).trim();

    if (!assignmentRef) {
      await bot.sendMessage(
        chatId,
        'Usage: `/submit assignmentId | optional note`\nThen send a file/image as a follow-up if you want to attach work.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const assignment = await findAssignmentForUser(result.user, assignmentRef);
    if (!assignment) {
      await bot.sendMessage(chatId, 'Assignment not found.');
      return;
    }

    const { submission } = await addSubmission(assignment.id, result.user.id, content);

    await bot.sendMessage(
      chatId,
      'Submission saved. 📎 Send a file/image in the next 60 seconds to attach work, or `/skip` to finish.',
      { parse_mode: 'Markdown' }
    );

    if (from.id) {
      setPending(String(from.id), { kind: 'submission', submissionId: submission.id });
    }

    const teacher = await db.user.findUnique({ where: { id: assignment.teacherId } });
    if (teacher) {
      await notifyUser(
        bot,
        teacher.id,
        `📤 *${result.user.firstName}* submitted *${assignment.title}*${content ? `:\n${content}` : '.'}`
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
    // Skip commands — they are handled by their own onText listeners.
    if (msg.text?.startsWith('/')) return;

    const from = msg.from;
    if (!from) return;

    // Only handle DMs to the bot. Avoid noise in group chats unless mentioned.
    if (msg.chat.type !== 'private') return;

    // Pending file attachment (after /assign or /submit) — intercept document/photo.
    const tgId = String(from.id);
    const pendingFile = pickAttachableFile(msg);
    if (pendingFile) {
      const pending = consumePending(tgId);
      if (pending) {
        try {
          await bot.sendChatAction(msg.chat.id, 'upload_document');
          const bucket = pending.kind === 'assignment' ? 'assignments' : 'submissions';
          const saved = await downloadAndSaveTelegramFile(bot, pendingFile, bucket);

          if (pending.kind === 'assignment') {
            await attachAssignmentFile(pending.assignmentId, saved.url, saved.name);
            await bot.sendMessage(msg.chat.id, `📎 Attached *${escapeMarkdown(saved.name)}* to the assignment.`, {
              parse_mode: 'Markdown',
            });

            // Relay the file to the student via Telegram and post a notice with the dashboard link.
            const assignment = await db.assignment.findUnique({
              where: { id: pending.assignmentId },
            });
            if (assignment) {
              const student = await db.user.findUnique({ where: { id: assignment.studentId } });
              if (student?.telegramId) {
                const caption = `📎 Attached to "${assignment.title}"`;
                try {
                  if (msg.photo) {
                    await bot.sendPhoto(student.telegramId, pendingFile.file_id, { caption });
                  } else {
                    await bot.sendDocument(student.telegramId, pendingFile.file_id, { caption });
                  }
                } catch (relayErr) {
                  console.warn('Direct file relay failed, sending URL instead:', relayErr);
                  await notifyUser(
                    bot,
                    student.id,
                    `📎 New attachment on *${escapeMarkdown(assignment.title)}*: ${appBaseUrl}${saved.url}`,
                  );
                }
                await notifyUser(
                  bot,
                  student.id,
                  `Open it in your dashboard: ${appBaseUrl}/assignments/student/${assignment.id}`,
                );
              }
            }
          } else {
            await attachSubmissionFile(pending.submissionId, saved.url, saved.name);
            await bot.sendMessage(msg.chat.id, `📎 Attached *${escapeMarkdown(saved.name)}* to your submission.`, {
              parse_mode: 'Markdown',
            });

            // Relay the file to the teacher
            try {
              const submission = await db.submission.findUnique({ where: { id: pending.submissionId } });
              if (submission) {
                const assignment = await db.assignment.findUnique({ where: { id: submission.assignmentId } });
                if (assignment) {
                  const [student, teacher] = await Promise.all([
                    db.user.findUnique({ where: { id: submission.studentId } }),
                    db.user.findUnique({ where: { id: assignment.teacherId } }),
                  ]);
                  if (teacher) {
                    const caption = `📎 *${escapeMarkdown(student?.firstName ?? 'Student')}* attached a file to *${escapeMarkdown(assignment.title)}*`;
                    try {
                      if (msg.photo) {
                        await bot.sendPhoto(teacher.telegramId!, pendingFile.file_id, { caption, parse_mode: 'Markdown' });
                      } else {
                        await bot.sendDocument(teacher.telegramId!, pendingFile.file_id, { caption, parse_mode: 'Markdown' });
                      }
                    } catch {
                      await notifyUser(
                        bot,
                        teacher.id,
                        `${caption}\n${appBaseUrl}${saved.url}`
                      );
                    }
                  }
                }
              }
            } catch (relayErr) {
              console.warn('Teacher submission file relay failed:', relayErr);
            }
          }
        } catch (err) {
          console.error('Attachment upload failed:', err);
          const message = err instanceof Error ? err.message : 'Could not save the file.';
          await bot.sendMessage(msg.chat.id, `Sorry — ${message}`);
        }
        return;
      }
      // No pending attachment context — silently fall through to NLP path,
      // which will ignore non-text messages anyway.
    }

    // Extract text — either typed message, or transcribed from voice/audio.
    let text = msg.text?.trim() ?? '';
    let fromVoice = false;

    const audioFileId = msg.voice?.file_id ?? msg.audio?.file_id;
    if (!text && audioFileId) {
      try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        text = (await transcribeTelegramAudio(bot, audioFileId))?.trim() ?? '';
        fromVoice = true;
      } catch (err) {
        console.error('Voice transcription failed:', err);
        await bot.sendMessage(
          msg.chat.id,
          'Sorry, I could not understand that voice message. Try typing it out?',
        );
        return;
      }
      if (!text) {
        await bot.sendMessage(msg.chat.id, 'I heard nothing in that voice note. Try again?');
        return;
      }
    }

    if (!text) return;

    const user = await resolveUser(from);
    if (!user) {
      await bot.sendMessage(
        msg.chat.id,
        'You are not signed in yet. Send /start to register first.',
      );
      return;
    }

    // Natural-language "assign X ... due in Y" → create assignment + open file window.
    // Mirrors the /assign command so the teacher can follow up with a file in 60s.
    if (user.role === 'teacher' && detectMessageIntent(text, 'teacher') === 'ASSIGN') {
      try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        const roster = await listStudentsForTeacher(user.id);
        const rosterNames = roster.flatMap((s) =>
          s.lastName ? [s.firstName, `${s.firstName} ${s.lastName}`] : [s.firstName]
        );
        const parsed = await parseAssignIntent(text, rosterNames);

        if (parsed) {
          if (!parsed.dueDate) {
            await bot.sendMessage(
              msg.chat.id,
              "I couldn't figure out a due date from your message. Please include a deadline, e.g. \"due tomorrow\" or \"due in 3 days\".",
            );
            return;
          }

          const student = await findStudentForTeacher(user.id, parsed.studentName);
          if (!student) {
            await bot.sendMessage(
              msg.chat.id,
              `I couldn't find a student matching "${parsed.studentName}" in your class. Try /students to see your roster.`,
            );
            return;
          }

          const assignment = await createAssignmentFromBot(
            user.id,
            student.id,
            parsed.title,
            parsed.description,
            parsed.dueDate,
          );

          setPending(String(from.id), { kind: 'assignment', assignmentId: assignment.id });

          await bot.sendMessage(
            msg.chat.id,
            `Created *${escapeMarkdown(parsed.title)}* for *${escapeMarkdown(student.firstName)}* ` +
              `(due ${format(parsed.dueDate, 'MMM d, yyyy')}).\n\n` +
              '📎 Send a file/image in the next 60 seconds to attach it, or `/skip` to finish.',
            { parse_mode: 'Markdown' },
          );

          await notifyUser(
            bot,
            student.id,
            `📚 New assignment from ${user.firstName}:\n*${escapeMarkdown(parsed.title)}*\nDue: ${format(parsed.dueDate, 'MMM d, yyyy')}\n\n${parsed.description}\n\nid: \`${assignment.id}\``,
          );
          return;
        }
        // Parse failed — fall through to the chat LLM which will hint at the format.
      } catch (err) {
        console.error('NL assignment create failed:', err);
        await bot.sendMessage(
          msg.chat.id,
          "Sorry, I couldn't create that assignment. Try /assign, or rephrase with student, task, and deadline.",
        );
        return;
      }
    }

    // Teacher asks student to share a file for an assignment
    if (user.role === 'teacher' && detectMessageIntent(text, 'teacher') === 'REQUEST_FILE') {
      try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        const teacherAssignments = await db.assignment.findMany({
          where: { teacherId: user.id },
          orderBy: { dueDate: 'asc' },
        });

        const assignment = findAssignmentInText(text, teacherAssignments);
        if (!assignment) {
          await bot.sendMessage(
            msg.chat.id,
            "I couldn't identify which assignment you mean. Mention the title or id, e.g. \"ask Mridul to share the file for *Essay of 1000 words*\".",
            { parse_mode: 'Markdown' }
          );
          return;
        }

        const student = await db.user.findUnique({ where: { id: assignment.studentId } });
        if (!student?.telegramId) {
          await bot.sendMessage(
            msg.chat.id,
            `${student?.firstName ?? 'That student'} hasn't linked Telegram, so I can't message them directly.`
          );
          return;
        }

        // Find their latest submission so we can attach the file to it
        const latestSubmission = await db.submission.findFirst({
          where: { assignmentId: assignment.id, studentId: student.id },
          orderBy: { submittedAt: 'desc' },
        });

        if (latestSubmission) {
          setPending(String(student.telegramId), { kind: 'submission', submissionId: latestSubmission.id });
        }

        await notifyUser(
          bot,
          student.id,
          `📎 *${escapeMarkdown(user.firstName)}* (your teacher) is asking you to share your file for *${escapeMarkdown(assignment.title)}*.\n\nJust send the file here and it will be attached to your submission.${!latestSubmission ? `\n\nOr use /submit ${assignment.id} to create a new submission first.` : ''}`
        );

        await bot.sendMessage(
          msg.chat.id,
          `Done — asked *${escapeMarkdown(student.firstName)}* to share their file for *${escapeMarkdown(assignment.title)}*. They'll be prompted to send it here.`,
          { parse_mode: 'Markdown' }
        );
        return;
      } catch (err) {
        console.error('REQUEST_FILE handler failed:', err);
        await bot.sendMessage(msg.chat.id, "Sorry, couldn't send that request. Try messaging the student directly.");
        return;
      }
    }

    // Natural-language submission from student ("I completed the assignment...")
    if (user.role === 'student' && detectMessageIntent(text, 'student') === 'SUBMIT') {
      try {
        await bot.sendChatAction(msg.chat.id, 'typing');
        const studentAssignments = await db.assignment.findMany({
          where: { studentId: user.id, status: { not: 'submitted' } },
          orderBy: { dueDate: 'asc' },
        });

        const assignment = findAssignmentInText(text, studentAssignments);
        if (assignment) {
          const { submission } = await addSubmission(assignment.id, user.id, text);
          setPending(tgId, { kind: 'submission', submissionId: submission.id });

          await bot.sendMessage(
            msg.chat.id,
            `Submission recorded for *${escapeMarkdown(assignment.title)}*. 📎 Send your file in the next 60 seconds to attach it, or /skip to finish without one.`,
            { parse_mode: 'Markdown' }
          );

          const teacher = await db.user.findUnique({ where: { id: assignment.teacherId } });
          if (teacher) {
            await notifyUser(
              bot,
              teacher.id,
              `📤 *${escapeMarkdown(user.firstName)}* submitted *${escapeMarkdown(assignment.title)}*.`
            );
          }
          return;
        }
        // Could not identify which assignment — fall through to LLM chat to ask for clarification
      } catch (err) {
        console.error('NL submit failed:', err);
        await bot.sendMessage(
          msg.chat.id,
          "Sorry, I couldn't record that submission. Try /submit with the assignment id or name."
        );
        return;
      }
    }

    try {
      await bot.sendChatAction(msg.chat.id, 'typing');

      const role = user.role as 'teacher' | 'student';
      const classroomContext =
        role === 'teacher'
          ? await buildTeacherChatContext(user.id, appBaseUrl)
          : await buildStudentChatContext(user.id);

      const dbContext = {
        currentUser: userProfileFromDbUser(user),
        fromVoice,
        ...classroomContext,
      };

      const reply = await answerQuestion(text, dbContext, role);

      if (typeof reply === 'string' && reply.trim()) {
        const prefix = fromVoice ? `_(voice: "${text}")_\n\n` : '';
        await bot.sendMessage(msg.chat.id, prefix + reply, { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(
          msg.chat.id,
          "Hmm, I'm not sure how to help with that. Try /help to see what I can do.",
        );
      }
    } catch (err) {
      console.error('NLP handler failed:', err);
      await bot.sendMessage(
        msg.chat.id,
        "Something went wrong while answering. Please try again or use /help.",
      );
    }
  });
}
