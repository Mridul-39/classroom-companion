"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { AssignmentTable } from "@/components/assignments/AssignmentTable";
import { CreateAssignmentModal } from "@/components/assignments/CreateAssignmentModal";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSession } from "@/lib/session";

export default function TeacherAssignments() {
  const { session } = useSession();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const teacherId = session.userId;
    const assignmentsPromise = fetch(`/api/assignments?role=teacher&teacherId=${teacherId}`).then((res) => res.json());
    const studentsPromise = fetch(`/api/students?teacherId=${teacherId}`).then((res) => res.json());

    Promise.all([assignmentsPromise, studentsPromise])
      .then(([assignmentData, studentData]) => {
        setAssignments(assignmentData.assignments || []);
        setStudents((studentData.students || []).map((ts: any) => ts.student));
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [session]);

  return (
    <DashboardShell role="teacher">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Assignments"
          description="Track and manage all student assignments and tasks."
          action={
            <CreateAssignmentModal teacherId={session?.userId ?? ''} students={students} />
          }
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input type="text" placeholder="Search assignments..." className="pl-9 bg-white border-zinc-200" />
            </div>
            <AssignmentTable assignments={assignments} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
