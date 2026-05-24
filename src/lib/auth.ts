import "server-only";

import { cookies } from "next/headers";
import crypto from "node:crypto";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { isAdminTeacher } from "@/lib/telegram/admin";

export function isAdmin(user: Pick<User, "id" | "role">): boolean {
  return user.role === "teacher" && isAdminTeacher(user);
}

const COOKIE = "cc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function newSessionId() {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(userId: string): Promise<string> {
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.session.create({ data: { id, userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return id;
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (id) {
    await db.session.deleteMany({ where: { id } });
  }
  store.delete(COOKIE);
}

export async function getSession(): Promise<{ user: User; sessionId: string } | null> {
  const store = await cookies();
  const id = store.get(COOKIE)?.value;
  if (!id) return null;

  const row = await db.session.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!row) {
    store.delete(COOKIE);
    return null;
  }

  if (row.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id } }).catch(() => {});
    store.delete(COOKIE);
    return null;
  }

  if (row.user.suspendedAt) {
    // Kill all sessions for this user and clear cookie — they shouldn't be in.
    await db.session.deleteMany({ where: { userId: row.user.id } }).catch(() => {});
    store.delete(COOKIE);
    return null;
  }

  return { user: row.user, sessionId: row.id };
}

/** Convenience: throw a 401-style sentinel when caller wants to short-circuit. */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function requireSession(): Promise<{ user: User; sessionId: string }> {
  const s = await getSession();
  if (!s) throw new UnauthorizedError();
  return s;
}

export async function requireRole(role: "teacher" | "student"): Promise<{ user: User; sessionId: string }> {
  const s = await requireSession();
  if (s.user.role !== role) throw new UnauthorizedError(`Requires role: ${role}`);
  return s;
}

export async function requireAdmin(): Promise<{ user: User; sessionId: string }> {
  const s = await requireSession();
  if (!isAdmin(s.user)) throw new UnauthorizedError("Admin access required");
  return s;
}
