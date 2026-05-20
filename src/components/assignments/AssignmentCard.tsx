import Link from "next/link";
import { format } from "date-fns";
import { Clock, MessageSquare, ChevronRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui-custom/StatusBadge";
import { Assignment, User } from "@/lib/types";

export function AssignmentCard({
  assignment,
  teacher,
}: {
  assignment: Assignment;
  teacher?: Pick<User, "firstName" | "lastName"> | null;
}) {
  const isOverdue = assignment.status === "overdue";
  const teacherName = teacher ?? { firstName: 'Teacher', lastName: '' };

  return (
    <Card className="hover:shadow-md transition-shadow border-zinc-200 bg-white flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-base font-semibold text-zinc-900 leading-tight line-clamp-2">
            {assignment.title}
          </CardTitle>
          <StatusBadge status={assignment.status} />
        </div>
      </CardHeader>
      <CardContent className="pb-4 flex-1">
        <p className="text-sm text-zinc-500 line-clamp-2 mb-4 leading-relaxed">
          {assignment.description}
        </p>
        <div className="flex flex-col gap-2.5 text-xs font-medium">
          <div className="flex items-center text-zinc-500 gap-2">
            <Clock className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-zinc-400"}`} />
            <span className={isOverdue ? "text-red-600" : ""}>
              Due {format(new Date(assignment.dueDate), "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center text-zinc-500 gap-2">
            <MessageSquare className="h-4 w-4 text-zinc-400" />
            <span>{teacherName.firstName} {teacherName.lastName}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 mt-auto">
        <Link 
          href={`/assignments/student/${assignment.id}`}
          className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-200 bg-white hover:bg-zinc-50 hover:text-zinc-900 text-zinc-700 h-9 px-4 mt-2"
        >
          View Details
          <ChevronRight className="ml-1.5 h-4 w-4 text-zinc-400" />
        </Link>
      </CardFooter>
    </Card>
  );
}
