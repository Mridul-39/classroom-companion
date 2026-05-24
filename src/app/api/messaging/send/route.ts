import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, isAdmin } from '@/lib/auth';

const MAX_LEN = 3500; // Telegram caps a single sendMessage at 4096 chars; keep margin.

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.user.role !== 'teacher') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = typeof body.userId === 'string' ? body.userId : '';
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (!userId || !text) {
    return NextResponse.json({ error: 'userId and text are required' }, { status: 400 });
  }
  if (text.length > MAX_LEN) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_LEN} chars).` },
      { status: 400 }
    );
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
  }
  if (!target.telegramId) {
    return NextResponse.json(
      { error: `${target.firstName} has not linked Telegram yet, so the bot can't deliver a message.` },
      { status: 400 }
    );
  }
  if (target.suspendedAt) {
    return NextResponse.json(
      { error: 'Recipient is suspended.' },
      { status: 400 }
    );
  }

  // Authorization:
  //  - admin teachers can message anyone
  //  - any teacher can message another teacher in the workspace
  //  - a teacher can message a student that's in their class
  const actor = session.user;
  let allowed = isAdmin(actor);
  if (!allowed && target.role === 'teacher') {
    allowed = true;
  }
  if (!allowed && target.role === 'student') {
    const link = await db.teacherStudent.findFirst({
      where: { teacherId: actor.id, studentId: target.id },
    });
    allowed = !!link;
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "You don't have permission to message this user." },
      { status: 403 }
    );
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: 'Server is missing TELEGRAM_BOT_TOKEN.' },
      { status: 500 }
    );
  }

  const senderName = `${actor.firstName} ${actor.lastName}`.trim();
  const payload = `📩 *Message from ${senderName}*\n\n${text}`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: target.telegramId,
        text: payload,
        parse_mode: 'Markdown',
      }),
    });

    const data = await tgRes.json().catch(() => ({}));
    if (!tgRes.ok || !data?.ok) {
      const description: string =
        typeof data?.description === 'string' ? data.description : 'Telegram rejected the message';
      // Common case: target hasn't /start'd the bot yet → "bot was blocked by the user" / "chat not found".
      const friendly =
        description.toLowerCase().includes('blocked')
          ? `${target.firstName} has blocked the bot.`
          : description.toLowerCase().includes('chat not found')
            ? `${target.firstName} hasn't started a chat with the bot yet.`
            : description;
      return NextResponse.json({ error: friendly }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Send message failed:', err);
    return NextResponse.json({ error: 'Failed to reach Telegram.' }, { status: 502 });
  }
}
