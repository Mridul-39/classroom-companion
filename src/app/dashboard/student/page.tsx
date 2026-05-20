"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { AssignmentCard } from "@/components/assignments/AssignmentCard";
import { FileText, Clock, AlertCircle, CheckCircle, BookOpen, Loader2 } from "lucide-react";
import { Assignment } from "@/lib/types";
import { useApiPoll } from "@/hooks/useApiPoll";
import { DEMO_STUDENT_ID, DASHBOARD_POLL_MS } from "@/lib/constants";

export default function StudentDashboard() {
  const { data, loading, error } = useApiPoll<any>(
    `/api/student/dashboard?studentId=${DEMO_STUDENT_ID}`,
    DASHBOARD_POLL_MS
  );

  if (loading) {
    return (
      <DashboardShell role="student">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </DashboardShell>
    );
  }

  if (error || !data || data.error) {
    return (
      <DashboardShell role="student">
        <div className="p-8 text-center text-red-500">Failed to load dashboard</div>
      </DashboardShell>
    );
  }

  const { student, stats, dueSoon } = data;

  return (
    <DashboardShell role="student">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-1">Welcome back, {student?.firstName} 👋</h1>
          <p className="text-zinc-500">Here's your study overview for today.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <StatCard title="Total" value={stats.completed + stats.inProgress + stats.needsAttention} icon={BookOpen} className="col-span-2 lg:col-span-1 border-zinc-200" />
          <StatCard title="To Do" value={stats.inProgress} icon={Clock} className="border-zinc-200" />
          <StatCard title="In Progress" value={stats.inProgress} icon={FileText} className="border-zinc-200" />
          <StatCard title="Completed" value={stats.completed} icon={CheckCircle} className="border-zinc-200" />
          <StatCard title="Needs Attention" value={stats.needsAttention} icon={AlertCircle} className={stats.needsAttention > 0 ? "border-zinc-200 bg-red-50/30" : "border-zinc-200"} />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {dueSoon && dueSoon.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Due Soon</h2>
                </div>
                <div className="grid gap-4">
                  {dueSoon.map((assignment: Assignment & { teacher?: { firstName: string; lastName: string } }) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} teacher={assignment.teacher} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
