import { Role } from "@/lib/types";
import { Sidebar } from "./Sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  role: Role;
}

export function DashboardShell({ children, role }: DashboardShellProps) {
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
