import TelegramBot from 'node-telegram-bot-api';
import { getTelegramConfig } from '@/lib/telegram/config';
import { processDueReminders } from '@/lib/telegram/reminders';
import { registerHandlers } from './handlers';

async function main() {
  const { token } = getTelegramConfig();

  // Polling conflicts with webhooks and with a second bot process using the same token.
  const bot = new TelegramBot(token, { polling: false });
  await bot.deleteWebHook();

  registerHandlers(bot);
  await bot.startPolling();

  const reminderIntervalMs = 30_000;
  setInterval(() => {
    processDueReminders(bot).catch((err) => console.error('Reminder tick failed:', err));
  }, reminderIntervalMs);
  void processDueReminders(bot);

  console.log('Classroom Companion Telegram bot is running (polling)...');

  const shutdown = async () => {
    console.log('Stopping bot...');
    await bot.stopPolling();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err) => {
  console.error('Bot failed to start:', err);
  process.exit(1);
});
