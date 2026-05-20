"use client";

import { useState, useEffect } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { LLMSettings } from "@/components/settings/LLMSettings";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BellRing, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DEMO_TEACHER_ID } from "@/lib/constants";

export default function TeacherSettings() {
  const [data, setData] = useState<{ teacher: any, settings: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We can fetch both user and settings
    Promise.all([
      fetch(`/api/teacher/dashboard?teacherId=${DEMO_TEACHER_ID}`).then(res => res.json()),
      fetch(`/api/settings?teacherId=${DEMO_TEACHER_ID}`).then(res => res.json())
    ])
    .then(([teacherData, settingsData]) => {
      setData({
        teacher: teacherData.teacher,
        settings: settingsData.settings
      });
      setLoading(false);
    })
    .catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  return (
    <DashboardShell role="teacher">
      <div className="flex flex-col gap-6 max-w-4xl">
        <PageHeader 
          title="Settings" 
          description="Manage your account, preferences, and AI integrations." 
        />
        
        {loading || !data ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="mb-6 h-auto p-1 bg-zinc-100 border border-zinc-200">
              <TabsTrigger value="profile" className="data-[state=active]:shadow-sm">Profile</TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:shadow-sm">AI Assistant</TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:shadow-sm">Notifications</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <ProfileSettings user={data.teacher} />
            </TabsContent>
            
            <TabsContent value="ai" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <LLMSettings settings={data.settings} />
            </TabsContent>

            <TabsContent value="notifications" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="shadow-sm border-zinc-200">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
                  <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                    <BellRing className="h-6 w-6 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900">Notifications</h3>
                  <p className="text-zinc-500 mt-2 max-w-sm">
                    Notification settings and Telegram webhooks will be available in the backend integration phase.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardShell>
  );
}
