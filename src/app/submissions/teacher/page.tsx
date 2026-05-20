"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileIcon, SearchX, Loader2 } from "lucide-react";
import Link from "next/link";
import { DEMO_TEACHER_ID } from "@/lib/constants";

export default function TeacherSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/submissions?teacherId=${DEMO_TEACHER_ID}`)
      .then(res => res.json())
      .then(data => {
        setSubmissions(data.submissions || []);
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
        title="Submissions" 
        description="Review student submissions and provide feedback." 
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState 
          icon={SearchX}
          title="No submissions yet"
          description="When students submit their work, it will appear here for you to review."
        />
      ) : (
        <div className="grid gap-4">
          {submissions.map(({ sub, assignment, student }) => (
            <Card key={sub.id} className="overflow-hidden shadow-sm border-zinc-200">
              <CardContent className="p-0 flex flex-col sm:flex-row items-start sm:items-center">
                <div className="p-6 flex-1 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={student?.avatarUrl} />
                    <AvatarFallback>{student?.firstName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-zinc-900">{assignment?.title}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      Submitted by {student?.firstName} {student?.lastName} on {format(new Date(sub.submittedAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                    <FileIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">{sub.content || sub.fileName}</span>
                  </div>
                </div>
                <div className="bg-zinc-50 p-6 sm:p-8 border-t sm:border-t-0 sm:border-l border-zinc-100 flex items-center justify-center w-full sm:w-auto h-full">
                  <Link href={`/assignments/teacher/${assignment?.id}`} className={buttonVariants()}>Review</Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
