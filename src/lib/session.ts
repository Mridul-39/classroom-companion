"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";

const EVENT = "cc:session-change";

export type SessionUser = {
  userId: string;
  role: Role;
  firstName: string;
  lastName: string;
  email: string | null;
  avatarUrl?: string | null;
  schoolName?: string | null;
  telegramUsername?: string | null;
  telegramId?: string | null;
  isAdmin: boolean;
};

type Status = "loading" | "authenticated" | "unauthenticated";

export async function signOut(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore network error — we still drop client state
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

/**
 * Broadcast to other useSession() instances after a successful login.
 * Call this from the login page after the login POST returns 200.
 */
export function notifySessionChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

type MeResponse = {
  user: null | {
    id: string;
    role: string;
    firstName: string;
    lastName: string;
    email: string | null;
    avatarUrl?: string | null;
    schoolName?: string | null;
    telegramUsername?: string | null;
    telegramId?: string | null;
    isAdmin?: boolean;
  };
};

export function useSession() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setSession(null);
            setStatus("unauthenticated");
          }
          return;
        }
        const data: MeResponse = await res.json();
        if (cancelled) return;
        if (!data.user || (data.user.role !== "teacher" && data.user.role !== "student")) {
          setSession(null);
          setStatus("unauthenticated");
          return;
        }
        setSession({
          userId: data.user.id,
          role: data.user.role as Role,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          avatarUrl: data.user.avatarUrl,
          schoolName: data.user.schoolName,
          telegramUsername: data.user.telegramUsername,
          telegramId: data.user.telegramId,
          isAdmin: Boolean(data.user.isAdmin),
        });
        setStatus("authenticated");
      } catch {
        if (!cancelled) {
          setSession(null);
          setStatus("unauthenticated");
        }
      }
    }

    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, onChange);
    };
  }, []);

  return { session, status };
}
