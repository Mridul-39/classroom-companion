import { useState } from "react";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type FeedbackItem = {
  id: string;
  message?: string;
  content?: string;
  createdAt: string;
  teacher?: { firstName: string; lastName: string; avatarUrl?: string | null };
};

export function FeedbackPanel({
  feedback,
  isTeacher,
  teacher,
  onSendFeedback,
}: {
  feedback: FeedbackItem[];
  isTeacher: boolean;
  teacher?: { firstName: string; lastName: string; avatarUrl?: string | null };
  onSendFeedback?: (message: string) => Promise<boolean>;
}) {
  const defaultTeacher = teacher ?? { firstName: 'Teacher', lastName: '', avatarUrl: null };
  const [message, setMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    if (!onSendFeedback || !message.trim()) {
      return;
    }

    setIsSending(true);
    try {
      const success = await onSendFeedback(message.trim());
      if (success) {
        setMessage("");
        setIsOpen(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {feedback.length === 0 && !isTeacher && (
        <div className="text-sm text-muted-foreground italic">No feedback from the teacher yet.</div>
      )}

      {feedback.length > 0 && (
        <div className="space-y-4">
          {feedback.map((item) => {
            const author = item.teacher ?? defaultTeacher;
            return (
              <div key={item.id} className="flex gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={author.avatarUrl ?? undefined} />
                  <AvatarFallback>{author.firstName?.[0] ?? 'T'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        {author.firstName} {author.lastName}
                      </p>
                      <p className="text-xs text-zinc-500">Teacher feedback</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-zinc-700 whitespace-pre-wrap">{item.message ?? item.content ?? ""}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isTeacher && (
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-sm font-semibold text-zinc-900">Assignment feedback</h4>
              <p className="text-sm text-zinc-500">This feedback is tied to the current assignment and will be visible to the student on that assignment.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsOpen((open) => !open)}>
              {isOpen ? "Hide form" : "Add feedback"}
            </Button>
          </div>

          {isOpen && (
            <div className="mt-5 space-y-4">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Write your feedback here..."
                className="min-h-[120px]"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Feedback is saved directly on the assignment and shown to the student here.</p>
                <Button onClick={handleSubmit} disabled={isSending || !message.trim()}>
                  {isSending ? 'Sending...' : 'Send feedback'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
