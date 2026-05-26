import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { format } from 'date-fns';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { assignmentId } = await request.json();
    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.teacherId !== session.user.id) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.status === 'completed' || assignment.status === 'submitted') {
      return NextResponse.json({ error: 'Assignment is already submitted or completed' }, { status: 400 });
    }

    const student = await db.user.findUnique({ where: { id: assignment.studentId } });
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    if (!student.telegramId) {
      return NextResponse.json(
        { error: `${student.firstName} hasn't linked Telegram yet — can't send a reminder.` },
        { status: 400 }
      );
    }

    const dueStr = format(assignment.dueDate, 'MMM d, yyyy');
    const message = `⏰ Reminder from ${session.user.firstName}:\n\n📚 *${assignment.title}*\nDue: ${dueStr}\n\n${assignment.description}`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 });
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: student.telegramId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const tgData = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || !tgData?.ok) {
      const desc: string = typeof tgData?.description === 'string' ? tgData.description : 'Telegram rejected the message';
      const friendly = desc.toLowerCase().includes('blocked')
        ? `${student.firstName} has blocked the bot.`
        : desc.toLowerCase().includes('chat not found')
          ? `${student.firstName} hasn't started a chat with the bot yet.`
          : desc;
      return NextResponse.json({ error: friendly }, { status: 502 });
    }

    await db.reminder.create({
      data: {
        assignmentId,
        reminderType: 'manual',
        message,
        scheduledFor: new Date(),
        sentAt: new Date(),
        status: 'sent',
      },
    });

    return NextResponse.json({ ok: true, studentName: student.firstName });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
