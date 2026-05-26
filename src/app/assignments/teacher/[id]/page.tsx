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
import { ArrowLeft, Clock, Bell, SearchX, Mail, MessageSquare, Loader2, FileIcon, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TeacherAssignmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [reminderState, setReminderState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [reminderError, setReminderError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/assignments/${id}`)
      .then(res => res.json())
      .then(res => {
        setData(res);
        setFeedbackItems(res.feedback || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <DashboardShell role="teacher">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </DashboardShell>
    );
  }

  if (!data || data.error || !data.assignment) {
    return (
      <DashboardShell role="teacher">
        <div className="mb-6">
          <Link href="/assignments/teacher" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to assignments
          </Link>
        </div>
        <EmptyState 
          icon={SearchX} 
          title="Assignment Not Found" 
          description="The assignment you are looking for does not exist." 
          actionLabel="View All Assignments"
          actionHref="/assignments/teacher"
        />
      </DashboardShell>
    );
  }

  const { assignment, student, progressUpdates, submission } = data;
  const isOverdue = assignment.status === 'overdue';

  if (!student) {
    return (
      <DashboardShell role="teacher">
        <div className="mb-6">
          <Link href="/assignments/teacher" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to assignments
          </Link>
        </div>
        <EmptyState 
          icon={SearchX} 
          title="Student Not Found" 
          description="The student for this assignment could not be found." 
          actionLabel="View All Assignments"
          actionHref="/assignments/teacher"
        />
      </DashboardShell>
    );
  }

  const handleSendFeedback = async (message: string) => {
    if (!assignment || !student || !data?.teacher) {
      return false;
    }

    setIsSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
          teacherId: data.teacher.id,
          studentId: student.id,
          message,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        console.error(result.error || "Failed to send feedback");
        return false;
      }

      setFeedbackItems((current) => [result.feedback, ...current]);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReminder = async () => {
    setReminderState('sending');
    setReminderError(null);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: assignment.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        setReminderState('error');
        setReminderError(result.error ?? 'Failed to send reminder');
      } else {
        setReminderState('sent');
        setTimeout(() => setReminderState('idle'), 3000);
      }
    } catch {
      setReminderState('error');
      setReminderError('Could not reach the server');
    }
  };

  return (
    <DashboardShell role="teacher">
      <div className="flex flex-col gap-8">
        <div>
          <Link href="/assignments/teacher" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-6 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to assignments
          </Link>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-4">{assignment.title}</h1>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-medium text-zinc-600">
                <div className="flex items-center gap-2">
                  <Clock className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-zinc-400"}`} />
                  <span className={isOverdue ? "text-red-600" : ""}>
                    Due: {format(new Date(assignment.dueDate), "MMM d, yyyy")}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-3">
                <StatusBadge status={assignment.status} />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shadow-sm border-zinc-200"
                  onClick={handleSendReminder}
                  disabled={reminderState === 'sending' || assignment.status === 'completed'}
                >
                  {reminderState === 'sending' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : reminderState === 'sent' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Bell className="h-4 w-4 text-zinc-500" />
                  )}
                  {reminderState === 'sent' ? 'Reminder sent' : 'Send Reminder'}
                </Button>
              </div>
              {reminderState === 'error' && reminderError && (
                <p className="text-xs text-red-600">{reminderError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-sm border-zinc-200">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                <CardTitle className="text-base font-semibold text-zinc-900">Assignment Details</CardTitle>
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
                <TabsTrigger value="submission" className="data-[state=active]:shadow-sm">Submission & Feedback</TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:shadow-sm">Progress History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="submission" className="space-y-6 m-0 focus-visible:outline-none focus-visible:ring-0">
                <Card className="shadow-sm border-zinc-200">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                    <CardTitle className="text-base font-semibold text-zinc-900">Student Submission</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <SubmissionPanel submission={submission} isStudent={false} />
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-zinc-200">
                  <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                    <CardTitle className="text-base font-semibold text-zinc-900">Feedback</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <FeedbackPanel
                      feedback={feedbackItems}
                      isTeacher={true}
                      teacher={data.teacher}
                      onSendFeedback={handleSendFeedback}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="m-0 focus-visible:outline-none focus-visible:ring-0">
                <Card className="shadow-sm border-zinc-200">
                  <CardContent className="pt-6">
                    <ProgressTimeline updates={progressUpdates || []} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <Card className="shadow-sm border-zinc-200">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
                <CardTitle className="text-base font-semibold text-zinc-900">Student Profile</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-12 w-12 border shadow-sm">
                    <AvatarImage src={student.avatarUrl} />
                    <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-zinc-900">{student.firstName} {student.lastName}</h3>
                    <p className="text-sm text-zinc-500">@{student.telegramUsername}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                    <span className="text-zinc-500 flex items-center gap-2"><Mail className="h-4 w-4" /> Email</span>
                    <span className="font-medium">{student.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                    <span className="text-zinc-500 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Telegram ID</span>
                    <span className="font-medium">{student.telegramId || 'Not linked'}</span>
                  </div>
                </div>
                <Button className="w-full mt-6 text-zinc-700 hover:text-zinc-900 border-zinc-200" variant="outline">View Full Profile</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
