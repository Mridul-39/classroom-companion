"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatCard } from "@/components/dashboard/StatCard";
import { AssignmentTable } from "@/components/assignments/AssignmentTable";
import { Users, FileText, Sparkles, CheckCircle, ArrowRight, Loader2, FileIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function TeacherDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/teacher/dashboard?teacherId=teacher-meera')
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <DashboardShell role="teacher">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </DashboardShell>
    );
  }

  if (!data || data.error) {
    return (
      <DashboardShell role="teacher">
        <div className="p-8 text-center text-red-500">Failed to load dashboard</div>
      </DashboardShell>
    );
  }

  const { teacher, stats, recentAssignments, studentsNeedingAttention, recentSubmissions, aiInsight } = data;

  return (
    <DashboardShell role="teacher">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-1">Welcome back, {teacher?.firstName} 👋</h1>
            <p className="text-zinc-500">Here's what's happening in your classroom today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard title="Active Assignments" value={stats.activeAssignments} icon={FileText} className="border-zinc-200" />
          <StatCard title="Needs Review" value={stats.needsReview} icon={CheckCircle} className="border-zinc-200" />
          <StatCard title="Total Students" value={stats.totalStudents} icon={Users} className="col-span-2 md:col-span-1 border-zinc-200" />
        </div>

        {aiInsight && (
          <Card className="bg-amber-50/50 border-amber-200/50 shadow-none">
            <CardContent className="p-4 flex gap-4 items-start">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">AI Insight</h3>
                <p className="text-amber-700/80 text-sm mt-1">{aiInsight}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Recent Assignments</h2>
                <Link href="/assignments/teacher">
                  <Button variant="ghost" size="sm" className="gap-1 text-zinc-500 hover:text-zinc-900">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <AssignmentTable assignments={recentAssignments} />
            </div>
            
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Recent Submissions</h2>
              <Link href="/submissions/teacher">
                <Button variant="link" size="sm" className="text-zinc-500 h-auto p-0">View All</Button>
              </Link>
            </div>
            
            <Card className="border-zinc-200 shadow-sm">
              <CardContent className="p-0 divide-y divide-zinc-100">
                {recentSubmissions && recentSubmissions.length > 0 ? (
                  recentSubmissions.map((item: any) => (
                    <div key={item.sub.id} className="p-4 flex gap-4 hover:bg-zinc-50/50 transition-colors">
                      <Avatar className="h-9 w-9 border mt-0.5">
                        <AvatarImage src={item.student?.avatarUrl} />
                        <AvatarFallback>{item.student?.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {item.student?.firstName} {item.student?.lastName}
                          </p>
                          <span className="text-xs text-zinc-400 whitespace-nowrap">
                            {format(new Date(item.sub.submittedAt), "MMM d")}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 truncate mb-2">{item.assignment?.title}</p>
                        <div className="flex items-center gap-2 p-2 bg-zinc-50 rounded border border-zinc-100 text-xs text-zinc-600 truncate">
                          <FileIcon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <span className="truncate">{item.sub.content || item.sub.fileName}</span>
                        </div>
                        <Link href={`/assignments/teacher/${item.assignment?.id}`}>
                          <Button variant="link" size="sm" className="h-auto p-0 mt-2 text-blue-600">Review Submission</Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-zinc-500">
                    No recent submissions.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
