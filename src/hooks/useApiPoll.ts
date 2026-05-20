"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Refetch JSON from the same APIs the Telegram bot writes to (shared SQLite DB).
 * This is the practical “realtime” layer until WebSockets exist.
 */
export function useApiPoll<T>(url: string | null, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    if (!url) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as T & { error?: string };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Request failed");
      } else {
        setError(null);
        setData(json as T);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
      setLastSyncedAt(Date.now());
    }
  }, [url]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(id);
  }, [refresh, intervalMs]);

  return { data, loading, error, lastSyncedAt, refresh };
}
