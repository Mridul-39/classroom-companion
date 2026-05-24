import Link from "next/link";
import { format } from "date-fns";
import { MoreHorizontal, Paperclip } from "lucide-react";
import { Assignment } from "@/lib/types";
import { StatusBadge } from "@/components/ui-custom/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableBody
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AssignmentTable({ assignments }: { assignments: Assignment[] }) {
  if (assignments.length === 0) {
    return (
      <div className="text-center p-8 border border-dashed rounded-xl bg-white/50 text-zinc-500 text-sm">
        No assignments found.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-zinc-50 border-b">
          <TableRow>
            <TableHead className="font-medium">Assignment</TableHead>
            <TableHead className="font-medium">Student</TableHead>
            <TableHead className="font-medium">Status</TableHead>
            <TableHead className="font-medium">Due Date</TableHead>
            <TableHead className="text-right font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment: any) => {
            const student = assignment.student;
            return (
              <TableRow key={assignment.id} className="hover:bg-zinc-50/50 transition-colors">
                <TableCell>
                  <div className="flex flex-col max-w-xs">
                    <Link href={`/assignments/teacher/${assignment.id}`} className="font-medium text-zinc-900 hover:text-blue-600 hover:underline transition-colors truncate flex items-center gap-1.5">
                      <span className="truncate">{assignment.title}</span>
                      {assignment.attachmentUrl && (
                        <Paperclip
                          className="h-3.5 w-3.5 shrink-0 text-zinc-400"
                          aria-label={assignment.attachmentName || 'Has attachment'}
                        />
                      )}
                    </Link>
                    <span className="text-xs text-zinc-500 truncate mt-0.5">
                      {assignment.description}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-7 w-7 border">
                      <AvatarImage src={student?.avatarUrl} />
                      <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs">{student?.firstName?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-zinc-700">{student?.firstName} {student?.lastName}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={assignment.status} />
                </TableCell>
                <TableCell className="text-zinc-500 text-sm">
                  {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/assignments/teacher/${assignment.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    View
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
