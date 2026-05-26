import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import { registerHandlers } from '@/bot/handlers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reuse bot instance across warm invocations — avoids re-registering handlers on every request.
let bot: TelegramBot | null = null;

function getBot(): TelegramBot {
  if (!bot) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });
    registerHandlers(bot);
  }
  return bot;
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    getBot().processUpdate(update);
  } catch {
    // Never let a bad payload crash the endpoint — Telegram would keep retrying.
  }
  return NextResponse.json({ ok: true });
}
