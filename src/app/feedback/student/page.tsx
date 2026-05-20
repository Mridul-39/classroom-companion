"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquareOff, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui-custom/StatusBadge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { DEMO_STUDENT_ID } from "@/lib/constants";

export default function StudentFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/feedback?studentId=${DEMO_STUDENT_ID}`)
      .then(res => res.json())
      .then(data => {
        setFeedbackList(data.feedback || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardShell role="student">
      <PageHeader 
        title="Feedback" 
        description="Review comments and grades from your teacher." 
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : feedbackList.length === 0 ? (
        <EmptyState 
          icon={MessageSquareOff}
          title="No feedback yet"
          description="When your teacher reviews your submissions, their feedback will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {feedbackList.map(item => (
            <Card key={item.id} className="shadow-sm border-zinc-200 overflow-hidden">
              <CardContent className="p-0">
                <div className="bg-zinc-50 border-b border-zinc-100 p-4 px-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-zinc-900">{item.assignment?.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-zinc-500">
                        {format(new Date(item.createdAt), "MMMM d, yyyy")}
                      </span>
                      {item.assignment && <StatusBadge status={item.assignment.status} />}
                    </div>
                  </div>
                  <Link href={`/assignments/student/${item.assignmentId}`} className={buttonVariants({ variant: "outline", size: "sm", className: "hidden sm:flex" })}>
                    View Assignment
                  </Link>
                </div>
                
                <div className="p-6 flex gap-4">
                  <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarImage src={item.teacher?.avatarUrl} />
                    <AvatarFallback>{item.teacher?.firstName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-2 text-zinc-900">
                      {item.teacher?.firstName} {item.teacher?.lastName}
                    </div>
                    <div className="text-sm text-zinc-700 leading-relaxed bg-white border border-zinc-100 p-4 rounded-lg shadow-sm whitespace-pre-wrap">
                      {item.message}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-zinc-50 border-t border-zinc-100 sm:hidden">
                  <Link href={`/assignments/student/${item.assignmentId}`} className={buttonVariants({ variant: "outline", size: "sm", className: "w-full" })}>
                    View Assignment
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
