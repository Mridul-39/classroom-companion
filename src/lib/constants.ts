/**
 * Demo IDs until auth exists. Override via .env for your DB / Telegram-linked users.
 * NEXT_PUBLIC_* is required for client-side reads in Next.js.
 */
export const DEMO_TEACHER_ID =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEMO_TEACHER_ID) || "teacher-meera";

export const DEMO_STUDENT_ID =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DEMO_STUDENT_ID) || "student-mridul";

/** How often dashboards/lists refetch to stay in sync with the Telegram bot (same DB). */
export const DASHBOARD_POLL_MS = Number(process.env.NEXT_PUBLIC_DASHBOARD_POLL_MS) || 8000;
