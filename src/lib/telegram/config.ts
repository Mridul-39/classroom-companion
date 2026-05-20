export function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const appBaseUrl = process.env.APP_BASE_URL ?? 'http://localhost:3000';

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  return { token, appBaseUrl };
}
