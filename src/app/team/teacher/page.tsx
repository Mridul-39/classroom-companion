"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { AddTeacherModal } from "@/components/dashboard/AddTeacherModal";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2, Mail } from "lucide-react";
import { EmptyState } from "@/components/ui-custom/EmptyState";

export default function TeacherTeamPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/teachers')
      .then((res) => res.json())
      .then((data) => {
        setTeachers(data.teachers || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardShell role="teacher">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Manage Team"
          description="Invite teachers, track pending accounts, and manage your school team."
          action={<AddTeacherModal teacherId="teacher-meera" />}
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teachers yet"
            description="Invite teachers to join your organization and collaborate on assignments."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teachers.map((teacher) => (
              <Card key={teacher.id} className="shadow-sm border-zinc-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border shadow-sm">
                        <AvatarImage src={teacher.avatarUrl} />
                        <AvatarFallback>{teacher.firstName?.[0]}{teacher.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-zinc-900">{teacher.firstName} {teacher.lastName}</h3>
                        <p className="text-sm text-zinc-500">{teacher.email}</p>
                      </div>
                    </div>
                    <Badge variant={teacher.telegramId ? 'secondary' : 'outline'}>
                      {teacher.telegramId ? 'Active' : 'Pending'}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-sm text-zinc-600">
                    <div>
                      <span className="font-medium text-zinc-900">Organization</span>
                      <div>{teacher.schoolName || 'Not set'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-zinc-900">Role</span>
                      <div>Teacher</div>
                    </div>
                  </div>

                  {teacher.telegramId ? (
                    <div className="mt-5 flex items-center gap-2">
                      <Button variant="outline" className="gap-2" asChild>
                        <Link href={`/settings/teacher`}>
                          <Mail className="h-4 w-4" />
                          View Profile
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-5 text-xs text-zinc-500">
                      Invitation sent. The teacher can complete registration using the invite code in their email.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
