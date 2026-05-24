import { format } from 'date-fns';
import type { Assignment, User } from '@prisma/client';

/** Escape characters with special meaning in Telegram's legacy `Markdown` parse mode. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[])/g, '\\$1');
}

export function formatAssignmentLine(a: Assignment, student?: User | null): string {
  const due = format(new Date(a.dueDate), 'MMM d, yyyy');
  const title = escapeMarkdown(a.title);
  const status = escapeMarkdown(a.status);
  const who = student ? ` → ${escapeMarkdown(student.firstName)}` : '';
  return `• *${title}*${who}\n  id: \`${a.id}\` | ${status} | due ${due}`;
}
