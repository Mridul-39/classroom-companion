import { Submission } from "@/lib/types";
import { format } from "date-fns";
import { FileIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SubmissionPanel({ submission, isStudent }: { submission?: Submission, isStudent: boolean }) {
  if (!submission) {
    if (isStudent) {
      return (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center border-2 border-dashed rounded-lg bg-muted/20">
          <Upload className="h-8 w-8 text-muted-foreground mb-3" />
          <h3 className="font-medium">No submission yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Upload your work or submit a link to complete this assignment.
          </p>
          <Button>Submit Work</Button>
        </div>
      );
    }
    return <div className="text-sm text-muted-foreground italic">The student hasn't submitted yet.</div>;
  }

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
          <FileIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-sm">{submission.content || submission.fileName || 'Submission received'}</p>
          <p className="text-xs text-muted-foreground">
            Submitted {format(new Date(submission.submittedAt), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
      </div>
      {submission.fileUrl && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center gap-2 text-sm text-zinc-700">
            <FileIcon className="h-4 w-4 text-zinc-500" />
            <span>{submission.fileName || 'Attachment'}</span>
          </div>
          <a href={submission.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm">
            Open
          </a>
        </div>
      )}
      {!submission.fileUrl && (
        <div className="mt-4 text-right">
          <Button variant="outline" size="sm">View File</Button>
        </div>
      )}
    </div>
  );
}
