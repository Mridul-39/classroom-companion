"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { StatusBadge } from "@/components/ui-custom/StatusBadge";
import { ProgressTimeline } from "@/components/assignments/ProgressTimeline";
import { SubmissionPanel } from "@/components/assignments/SubmissionPanel";
import { FeedbackPanel } from "@/components/assignments/FeedbackPanel";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, MessageSquare, Send, SearchX, Loader2, FileIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function StudentAssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/assignments/${id}`)
      .then(res => res.json())
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <DashboardShell role="student">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </DashboardShell>
    );
  }

  if (!data || data.error || !data.assignment) {
    return (
      <DashboardShell role="student">
        <div className="mb-6">
          <Link href="/assignments/student" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to assignments
          </Link>
        </div>
        <EmptyState 
          icon={SearchX} 
          title="Assignment Not Found" 
          description="The assignment you are looking for does not exist or has been removed." 
          actionLabel="View All Assignments"
          actionHref="/assignments/student"
        />
      </DashboardShell>
    );
  }

  const { assignment, teacher, progressUpdates, submission, feedback } = data;
  const isOverdue = assignment.status === 'overdue';

  return (
    <DashboardShell role="student">
      <div className="flex flex-col gap-8">
        <div>
          <Link href="/assignments/student" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-6 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to assignments
          </Link>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-4">{assignment.title}</h1>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-medium text-zinc-600">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-zinc-400" />
                  <span>Teacher: {teacher?.firstName} {teacher?.lastName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-zinc-400"}`} />
                  <span className={isOverdue ? "text-red-600" : ""}>
                    Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
            <StatusBadge status={assignment.status} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-sm border-zinc-200">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                <CardTitle className="text-base font-semibold text-zinc-900">Instructions</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="whitespace-pre-wrap text-zinc-700 leading-relaxed">{assignment.description}</p>
                {assignment.attachmentUrl && (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium text-zinc-900">Attachment</p>
                    <a
                      href={assignment.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                    >
                      <FileIcon className="h-4 w-4" />
                      {assignment.attachmentName || 'Open attachment'}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Tabs defaultValue="submission" className="w-full">
              <TabsList className="mb-4 h-auto p-1 bg-zinc-100 border border-zinc-200">
                <TabsTrigger value="submission" className="data-[state=active]:shadow-sm">Submission</TabsTrigger>
                <TabsTrigger value="feedback" className="data-[state=active]:shadow-sm">Feedback ({feedback?.length || 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="submission" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <SubmissionPanel submission={submission} isStudent={true} />
              </TabsContent>
              <TabsContent value="feedback" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <Card className="shadow-sm border-zinc-200">
                  <CardContent className="pt-6">
                    <FeedbackPanel feedback={feedback || []} isTeacher={false} teacher={teacher} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-zinc-200">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                <CardTitle className="text-base font-semibold text-zinc-900">Update Progress</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  Write any update in your own words. The bot will interpret your progress using natural language processing and share it with your teacher.
                </div>
                <Textarea placeholder="I spent an hour reading the chapter and started the worksheet..." className="min-h-[120px] resize-none border-zinc-200 focus-visible:ring-zinc-300" />
                <Button className="w-full gap-2 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm">
                  <Send className="h-4 w-4" />
                  Send Update
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-zinc-200">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                <CardTitle className="text-base font-semibold text-zinc-900">History</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ProgressTimeline updates={progressUpdates || []} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
