import nodemailer from 'nodemailer';

export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
};

export type EmailDeliveryResult =
  | { sent: true }
  | { sent: false; reason: string };

function getEmailConfig() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = process.env.EMAIL_APP_PASS?.replace(/\s/g, '');

  if (!user || !pass) {
    return null;
  }

  return { user, pass };
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null && process.env.EMAIL_ENABLED !== 'false';
}

function friendlyEmailError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('535') || message.includes('BadCredentials') || message.includes('EAUTH')) {
    return (
      'Gmail rejected EMAIL_USER / EMAIL_APP_PASS. Use a Google *App Password* (16 characters), not your normal Gmail password. ' +
      'Create one at: Google Account → Security → 2-Step Verification → App passwords.'
    );
  }
  return message;
}

export async function sendEmail({ to, subject, text }: SendEmailParams): Promise<EmailDeliveryResult> {
  if (process.env.EMAIL_ENABLED === 'false') {
    return { sent: false, reason: 'Email is disabled (EMAIL_ENABLED=false).' };
  }

  const config = getEmailConfig();
  if (!config) {
    return {
      sent: false,
      reason: 'Email not configured. Set EMAIL_USER and EMAIL_APP_PASS in .env (see .env.example).',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    await transporter.sendMail({
      from: `"Classroom Companion" <${config.user}>`,
      to,
      subject,
      text,
    });

    return { sent: true };
  } catch (err) {
    const reason = friendlyEmailError(err);
    console.warn('[email] Send failed:', reason);
    return { sent: false, reason };
  }
}

export async function sendStudentInviteEmail({
  to,
  studentFirstName,
  studentLastName,
  teacherName,
  inviteCode,
}: {
  to: string;
  studentFirstName: string;
  studentLastName?: string;
  teacherName: string;
  inviteCode: string;
}): Promise<EmailDeliveryResult> {
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  const lastName = studentLastName ?? '';
  const registerLine = `/register student ${studentFirstName} ${lastName} ${to} ${inviteCode}`.replace(
    /\s+/g,
    ' '
  );

  return sendEmail({
    to,
    subject: `${teacherName} invited you to Classroom Companion`,
    text: [
      `Hi ${studentFirstName},`,
      '',
      `${teacherName} added you to their classroom on Classroom Companion.`,
      '',
      `Student dashboard: ${baseUrl}/dashboard/student`,
      '',
      'On Telegram, register with this exact command:',
      registerLine,
      '',
      `Invite code: ${inviteCode}`,
      '',
      '— Classroom Companion',
    ].join('\n'),
  });
}

export async function sendTeacherInviteEmail({
  to,
  teacherFirstName,
  teacherLastName,
  adminName,
  schoolName,
  inviteCode,
}: {
  to: string;
  teacherFirstName: string;
  teacherLastName?: string;
  adminName: string;
  schoolName?: string;
  inviteCode: string;
}): Promise<EmailDeliveryResult> {
  const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';
  const lastName = teacherLastName ?? '';
  const registerLine = `/register teacher ${teacherFirstName} ${lastName} ${to} ${inviteCode}`.replace(
    /\s+/g,
    ' '
  );

  return sendEmail({
    to,
    subject: `${adminName} invited you to Classroom Companion`,
    text: [
      `Hi ${teacherFirstName},`,
      '',
      `${adminName} invited you to join ${schoolName ?? 'Classroom Companion'} as a teacher.`,
      '',
      `Teacher dashboard: ${baseUrl}/dashboard/teacher`,
      '',
      'On Telegram, register with this exact command:',
      registerLine,
      '',
      `Invite code: ${inviteCode}`,
      '',
      '— Classroom Companion',
    ].join('\n'),
  });
}

export async function sendRegistrationConfirmationEmail({
  to,
  firstName,
  role,
}: {
  to: string;
  firstName: string;
  role: 'student' | 'teacher';
}): Promise<EmailDeliveryResult> {
  return sendEmail({
    to,
    subject: `Welcome to Classroom Companion`,
    text: [
      `Hi ${firstName},`,
      '',
      `Your ${role} account is now active on Classroom Companion.`,
      '',
      'You can continue using Telegram and the web dashboard with the same email address.',
      '',
      '— Classroom Companion',
    ].join('\n'),
  });
}
