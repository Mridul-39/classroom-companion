"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/session";

export default function StudentSettings() {
  const { session } = useSession();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/student/dashboard?studentId=${session.userId}`)
      .then(res => res.json())
      .then(data => {
        setStudent(data.student);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [session]);

  return (
    <DashboardShell role="student">
      <div className="flex flex-col gap-6 max-w-4xl">
        <PageHeader 
          title="Account Settings" 
          description="Manage your personal information and preferences." 
        />
        
        {loading || !student ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <ProfileSettings user={student} />
        )}
      </div>
    </DashboardShell>
  );
}
