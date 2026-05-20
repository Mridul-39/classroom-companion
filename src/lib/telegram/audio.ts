import type TelegramBot = require('node-telegram-bot-api');
import { transcribeAudio } from '../../../lib/llm.js';

function mimeTypeFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp3':
    case 'mpeg':
      return 'audio/mpeg';
    case 'm4a':
      return 'audio/mp4';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    case 'oga':
    case 'ogg':
    default:
      return 'audio/ogg';
  }
}

export async function transcribeTelegramAudio(bot: TelegramBot, fileId: string) {
  const file = await bot.getFile(fileId);
  if (!file.file_path) {
    throw new Error('Could not resolve Telegram file path');
  }

  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error(`Failed to download audio file: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const mimeType = mimeTypeFromPath(file.file_path);
  const fileName = file.file_path.split('/').pop() ?? 'voice.ogg';

  return transcribeAudio(audioBuffer, mimeType, fileName);
}
