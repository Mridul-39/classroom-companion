"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import { BookOpen, Loader2 } from "lucide-react";
import { Assignment } from "@/lib/types";
import { useSession } from "@/lib/session";

export default function StudentAssignments() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/student/dashboard?studentId=${session.userId}`)
      .then((res) => res.json())
      .then(() => setLoading(false))
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [session]);

  return (
    <DashboardShell role="student">
      <div className="flex flex-col gap-6">
        <PageHeader 
          title="My Assignments" 
          description="View and manage all your classroom tasks and homework." 
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="Assignments are managed through Telegram"
            description="Your teacher sends assignments via the Classroom Companion bot. Open Telegram to receive assignments, update progress, and get notified when new work arrives."
          />
        )}
      </div>
    </DashboardShell>
  );
}
