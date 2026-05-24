"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Role } from "@/lib/types";
import { useSession } from "@/lib/session";
import { Sidebar } from "./Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  role: Role;
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  const router = useRouter();
  const { session, status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?role=${role}`);
    } else if (status === "authenticated" && session && session.role !== role) {
      router.replace(`/dashboard/${session.role}`);
    }
  }, [status, session, role, router]);

  if (status !== "authenticated" || !session || session.role !== role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 overflow-hidden">
      <Sidebar role={role} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
