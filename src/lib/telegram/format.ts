import { format } from 'date-fns';
import type { Assignment, User } from '@prisma/client';

export function formatAssignmentLine(a: Assignment, student?: User | null): string {
  const due = format(new Date(a.dueDate), 'MMM d, yyyy');
  const who = student ? ` → ${student.firstName}` : '';
  return `• *${a.title}*${who}\n  id: \`${a.id}\` | ${a.status} | due ${due}`;
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
