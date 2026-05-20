"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquareOff, Loader2 } from "lucide-react";
import { DEMO_TEACHER_ID } from "@/lib/constants";

export default function TeacherFeedbackPage() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/feedback?teacherId=${DEMO_TEACHER_ID}`)
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
    <DashboardShell role="teacher">
      <PageHeader 
        title="Feedback History" 
        description="A log of all the feedback you have provided to your students." 
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : feedbackList.length === 0 ? (
        <EmptyState 
          icon={MessageSquareOff}
          title="No feedback sent"
          description="You haven't provided any feedback yet."
        />
      ) : (
        <div className="grid gap-4">
          {feedbackList.map(item => (
            <Card key={item.id} className="shadow-sm border-zinc-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 border shadow-sm">
                      <AvatarImage src={item.student?.avatarUrl} />
                      <AvatarFallback>{item.student?.firstName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-zinc-900">To: {item.student?.firstName} {item.student?.lastName}</div>
                      <div className="text-xs text-zinc-500">Re: {item.assignment?.title}</div>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 rounded-lg text-sm text-zinc-700 whitespace-pre-wrap border border-zinc-100">
                  "{item.message}"
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
