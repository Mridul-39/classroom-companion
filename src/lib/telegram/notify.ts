import type TelegramBot from 'node-telegram-bot-api';
import { db } from '@/lib/db';

/**
 * Telegram "Markdown" is strict; user/assignment text often breaks parsing.
 * Fall back to plain text so callers never throw and recipients still get the message.
 */
export async function notifyUser(
  bot: TelegramBot,
  userId: string,
  text: string,
  options?: TelegramBot.SendMessageOptions
) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.telegramId) return false;

  const { parse_mode: _ignore, ...rest } = options ?? {};

  try {
    await bot.sendMessage(user.telegramId, text, {
      parse_mode: 'Markdown',
      ...rest,
    });
    return true;
  } catch (err) {
    console.warn('notifyUser Markdown failed, retrying plain:', err);
  }

  try {
    await bot.sendMessage(user.telegramId, text, {
      ...rest,
    });
    return true;
  } catch (err) {
    console.warn('notifyUser plain send failed:', err);
    return false;
  }
}
