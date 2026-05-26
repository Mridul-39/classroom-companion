import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { processDueReminders } from '@/lib/telegram/reminders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
  await processDueReminders(bot);
  return NextResponse.json({ ok: true });
}
