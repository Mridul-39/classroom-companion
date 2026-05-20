"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddStudentModal } from "@/components/dashboard/AddStudentModal";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, MoreHorizontal, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import { DEMO_TEACHER_ID } from "@/lib/constants";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students?teacherId=${DEMO_TEACHER_ID}`)
      .then(res => res.json())
      .then(data => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardShell role="teacher">
      <div className="flex flex-col gap-6">
        <PageHeader 
          title="Students" 
          description="Manage your classroom roster and view student profiles."
          action={<AddStudentModal teacherId="teacher-meera" />}
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState 
            icon={MessageSquare}
            title="No students yet"
            description="Invite students to your classroom to get started."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {students.map(({ student, activeAssignments, status }) => (
              <Card key={student.id} className="shadow-sm border-zinc-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border shadow-sm">
                        <AvatarImage src={student.avatarUrl} />
                        <AvatarFallback>{student.firstName[0]}{student.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-zinc-900">{student.firstName} {student.lastName}</h3>
                        <p className="text-sm text-zinc-500">@{student.telegramUsername}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-100 mb-4">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Status</div>
                      <Badge variant="outline" className={
                        status === 'Active' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200' 
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }>
                        {status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Active Tasks</div>
                      <div className="font-medium text-sm text-zinc-900">{activeAssignments}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2 border-zinc-200 text-zinc-700">
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2 border-zinc-200 text-zinc-700">
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
