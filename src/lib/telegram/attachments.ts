import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type TelegramBot = require('node-telegram-bot-api');

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — Telegram bot API download cap
const PENDING_TTL_MS = 60 * 1000;

export type PendingAttachmentInput =
  | { kind: 'assignment'; assignmentId?: string; assignmentIds?: string[] }
  | { kind: 'submission'; submissionId: string };

export type PendingAttachment =
  | { kind: 'assignment'; assignmentIds: string[]; expiresAt: number }
  | { kind: 'submission'; submissionId: string; expiresAt: number };

const pending = new Map<string, PendingAttachment>();

function gc() {
  const now = Date.now();
  for (const [key, val] of pending.entries()) {
    if (val.expiresAt <= now) pending.delete(key);
  }
}

export function setPending(telegramId: string, state: PendingAttachmentInput) {
  gc();
  const expiresAt = Date.now() + PENDING_TTL_MS;
  if (state.kind === 'assignment') {
    const ids = state.assignmentIds ?? (state.assignmentId ? [state.assignmentId] : []);
    if (ids.length === 0) return;
    pending.set(telegramId, { kind: 'assignment', assignmentIds: ids, expiresAt });
  } else {
    pending.set(telegramId, { kind: 'submission', submissionId: state.submissionId, expiresAt });
  }
}

export function consumePending(telegramId: string): PendingAttachment | null {
  gc();
  const found = pending.get(telegramId);
  if (!found) return null;
  pending.delete(telegramId);
  return found;
}

export function clearPending(telegramId: string) {
  pending.delete(telegramId);
}

export function peekPending(telegramId: string): PendingAttachment | null {
  gc();
  return pending.get(telegramId) ?? null;
}

type TelegramFile = {
  file_id: string;
  /** Telegram-provided file name (documents). */
  file_name?: string;
  file_size?: number;
};

/**
 * Pick the best file_id from a Telegram message. Returns the largest photo
 * size when photos are present, otherwise the document file. Returns null
 * if nothing attachable is in the message.
 */
export function pickAttachableFile(msg: TelegramBot.Message): TelegramFile | null {
  if (msg.document) {
    return {
      file_id: msg.document.file_id,
      file_name: msg.document.file_name,
      file_size: msg.document.file_size,
    };
  }
  if (msg.photo && msg.photo.length > 0) {
    const largest = msg.photo.reduce((best, p) =>
      (p.file_size ?? 0) > (best.file_size ?? 0) ? p : best
    );
    return { file_id: largest.file_id, file_size: largest.file_size };
  }
  return null;
}

export type SavedAttachment = {
  url: string;
  name: string;
  bytes: number;
};

/**
 * Download a Telegram file by file_id, save it under public/uploads/<bucket>/,
 * and return the public URL + display name.
 */
export async function downloadAndSaveTelegramFile(
  bot: TelegramBot,
  file: TelegramFile,
  bucket: 'assignments' | 'submissions'
): Promise<SavedAttachment> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');

  if (file.file_size && file.file_size > MAX_BYTES) {
    throw new Error(
      `File is ${Math.round(file.file_size / 1024 / 1024)} MB. Max supported is 20 MB.`
    );
  }

  const tgFile = await bot.getFile(file.file_id);
  if (!tgFile.file_path) {
    throw new Error('Telegram did not return a file_path');
  }

  const url = `https://api.telegram.org/file/bot${token}/${tgFile.file_path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download from Telegram (${res.status})`);
  }
  const ab = await res.arrayBuffer();
  if (ab.byteLength > MAX_BYTES) {
    throw new Error(
      `File is ${Math.round(ab.byteLength / 1024 / 1024)} MB. Max supported is 20 MB.`
    );
  }

  const tgExt = path.extname(tgFile.file_path) || path.extname(file.file_name ?? '');
  const safeExt = tgExt && tgExt.length <= 12 ? tgExt : '.bin';
  const baseName = `${randomUUID()}${safeExt}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', bucket);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, baseName), Buffer.from(ab));

  return {
    url: `/uploads/${bucket}/${baseName}`,
    name: file.file_name ?? baseName,
    bytes: ab.byteLength,
  };
}
