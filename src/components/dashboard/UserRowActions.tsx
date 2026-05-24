"use client";

import { useState } from "react";
import { MoreHorizontal, Pause, Play, Trash2, MailX, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui-custom/ConfirmDialog";

type Props = {
  userId: string;
  userLabel: string;
  /** True when the user has a Telegram link — i.e. they've accepted the invite. */
  isActive: boolean;
  /** True when User.suspendedAt is set. */
  isSuspended: boolean;
  /** Hides the menu when current viewer isn't an admin or is acting on themselves. */
  disabled?: boolean;
  onChange?: () => void;
};

type PendingAction = null | {
  kind: "suspend" | "unsuspend" | "delete" | "revoke";
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<Response>;
};

export function UserRowActions({
  userId,
  userLabel,
  isActive,
  isSuspended,
  disabled,
  onChange,
}: Props) {
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (disabled) return null;

  const callAdmin = (path: string, method: "POST" | "DELETE") =>
    fetch(path, { method });

  const actions = {
    suspend: {
      kind: "suspend" as const,
      title: `Suspend ${userLabel}?`,
      description:
        "They won't be able to sign in to the web app or use the Telegram bot until you unsuspend them. Their data is kept.",
      confirmLabel: "Suspend",
      run: () => callAdmin(`/api/admin/users/${userId}/suspend`, "POST"),
    },
    unsuspend: {
      kind: "unsuspend" as const,
      title: `Unsuspend ${userLabel}?`,
      description: "They'll get access back to the web app and the bot.",
      confirmLabel: "Unsuspend",
      run: () => callAdmin(`/api/admin/users/${userId}/unsuspend`, "POST"),
    },
    delete: {
      kind: "delete" as const,
      title: `Delete ${userLabel}?`,
      description:
        "This permanently removes the user along with all assignments, submissions, feedback and progress tied to them. Cannot be undone.",
      confirmLabel: "Delete forever",
      destructive: true,
      run: () => callAdmin(`/api/admin/users/${userId}`, "DELETE"),
    },
    revoke: {
      kind: "revoke" as const,
      title: `Revoke invite for ${userLabel}?`,
      description:
        "Removes the pending account. They'll need a fresh invite to join again.",
      confirmLabel: "Revoke",
      destructive: true,
      run: () => callAdmin(`/api/admin/users/${userId}`, "DELETE"),
    },
  };

  const runPending = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await pending.run();
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === "string" ? data.error : "Action failed");
        return;
      }
      onChange?.();
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
              aria-label="User actions"
            />
          }
        >
          <MoreHorizontal className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {!isActive ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setPending(actions.revoke)}
            >
              <MailX /> Revoke invite
            </DropdownMenuItem>
          ) : (
            <>
              {isSuspended ? (
                <DropdownMenuItem onClick={() => setPending(actions.unsuspend)}>
                  <Play /> Unsuspend
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setPending(actions.suspend)}>
                  <Pause /> Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setPending(actions.delete)}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.title ?? ""}
        description={
          (pending?.description ?? "") +
          (error ? `\n\nError: ${error}` : "")
        }
        confirmLabel={busy ? "Working…" : pending?.confirmLabel ?? "Confirm"}
        destructive={pending?.destructive}
        onConfirm={runPending}
      />

      {busy && (
        <span className="sr-only">
          <Loader2 /> Working
        </span>
      )}
    </>
  );
}
