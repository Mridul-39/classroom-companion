import { Badge } from "@/components/ui/badge";
import { AssignmentStatus } from "@/lib/types";
import { CheckCircle2, Circle, Clock, FileWarning, Timer, UploadCloud } from "lucide-react";

export function StatusBadge({ status }: { status: AssignmentStatus }) {
  const variants: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending: { 
      label: "Pending", 
      className: "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-zinc-200",
      icon: Circle
    },
    assigned: {
      label: "Assigned",
      className: "bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border-zinc-200",
      icon: Circle,
    },
    in_progress: { 
      label: "In Progress", 
      className: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200",
      icon: Timer
    },
    stuck: { 
      label: "Needs Help", 
      className: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
      icon: FileWarning
    },
    submitted: { 
      label: "Submitted", 
      className: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200",
      icon: UploadCloud
    },
    overdue: { 
      label: "Overdue", 
      className: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200",
      icon: Clock
    },
    completed: { 
      label: "Completed", 
      className: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
      icon: CheckCircle2
    },
  };

  const variant = variants[status] ?? { label: String(status ?? 'Unknown'), className: 'bg-zinc-100 text-zinc-600', icon: Circle };
  const { label, className, icon: Icon } = variant;

  return (
    <Badge className={`px-2.5 py-0.5 flex items-center gap-1.5 font-medium transition-colors shadow-none ${className}`} variant="outline">
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
