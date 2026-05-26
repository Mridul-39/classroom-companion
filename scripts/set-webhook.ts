/**
 * Run once after deploying to register the Telegram webhook:
 *   npm run webhook:set
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const appBaseUrl = process.env.APP_BASE_URL;

if (!token || !appBaseUrl) {
  console.error('TELEGRAM_BOT_TOKEN and APP_BASE_URL must be set in .env');
  process.exit(1);
}

const webhookUrl = `${appBaseUrl.replace(/\/$/, '')}/api/telegram`;

const res = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
  }
);

const json = await res.json() as { ok: boolean; description?: string };
if (json.ok) {
  console.log(`✅ Webhook registered: ${webhookUrl}`);
} else {
  console.error('❌ Failed to set webhook:', json.description);
  process.exit(1);
}
