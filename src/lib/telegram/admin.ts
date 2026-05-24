import type { User } from '@prisma/client';

const ADMIN_TEACHER_IDS = new Set(
  (process.env.ADMIN_TEACHER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

export function isAdminTeacher(user: Pick<User, 'id'>): boolean {
  return ADMIN_TEACHER_IDS.has(user.id);
}
