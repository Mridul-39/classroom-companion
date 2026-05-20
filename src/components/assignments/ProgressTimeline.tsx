import { ProgressUpdate } from "@/lib/types";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";

export function ProgressTimeline({ updates }: { updates: ProgressUpdate[] }) {
  if (!updates.length) {
    return <div className="text-sm text-muted-foreground italic">No progress updates yet.</div>;
  }

  return (
    <div className="space-y-4">
      {updates.map((update) => (
        <div key={update.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="flex-1 w-px bg-border my-2" />
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center justify-between mb-2 gap-3">
              <span className="text-sm font-medium">Progress update</span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(update.createdAt), "MMM d, h:mm a")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 bg-muted p-3 rounded-lg whitespace-pre-wrap">
              {update.message}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
