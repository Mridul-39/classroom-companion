/** How often dashboards/lists refetch to stay in sync with the Telegram bot (same DB). */
export const DASHBOARD_POLL_MS = Number(process.env.NEXT_PUBLIC_DASHBOARD_POLL_MS) || 8000;
