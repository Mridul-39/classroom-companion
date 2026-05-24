"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";

const MAX_LEN = 3500;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userLabel: string;
};

export function MessageDialog({ open, onOpenChange, userId, userLabel }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) {
      setText("");
      setError(null);
      setSent(false);
      setSending(false);
    }
  }, [open]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/messaging/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, text: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Failed to send");
        return;
      }
      setSent(true);
      setTimeout(() => onOpenChange(false), 900);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Message {userLabel}</DialogTitle>
          <DialogDescription>
            Delivered via the Classroom Companion bot on Telegram. They&apos;ll see your name attached.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Type a message to ${userLabel}…`}
            maxLength={MAX_LEN}
            rows={5}
            disabled={sending || sent}
            className="w-full rounded-md border border-zinc-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none"
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              {text.length}/{MAX_LEN}
            </span>
            {sent && <span className="text-emerald-600">Sent ✓</span>}
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending || sent || !text.trim()} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Sending…" : "Send via bot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
