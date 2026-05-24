"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  FileText,
} from "lucide-react";
import { Role } from "@/lib/types";
import { signOut, useSession } from "@/lib/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  const studentLinks = [
    { name: "Dashboard", href: "/dashboard/student", icon: LayoutDashboard },
    { name: "Assignments", href: "/assignments/student", icon: BookOpen },
    { name: "Settings", href: "/settings/student", icon: Settings },
  ];

  const teacherLinks = [
    { name: "Dashboard", href: "/dashboard/teacher", icon: LayoutDashboard },
    { name: "Team", href: "/team/teacher", icon: Users },
    { name: "Students", href: "/students/teacher", icon: Users },
    { name: "Assignments", href: "/assignments/teacher", icon: BookOpen },
    { name: "Submissions", href: "/submissions/teacher", icon: FileText },
    { name: "Settings", href: "/settings/teacher", icon: Settings },
  ];

  const links = role === "teacher" ? teacherLinks : studentLinks;

  return (
    <div className="flex h-screen w-[260px] shrink-0 flex-col border-r bg-white">
      <div className="px-6 pt-6 pb-4 border-b border-zinc-200">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-zinc-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base tracking-tight">Classroom Companion</div>
            <div className="text-xs text-zinc-500">{session?.schoolName || 'Learning organization'}</div>
          </div>
        </Link>

        <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border">
              <AvatarImage src={session?.avatarUrl ?? undefined} alt={session?.firstName ?? ""} />
              <AvatarFallback className="bg-zinc-100 text-zinc-600">
                {session ? `${session.firstName[0] ?? ""}${session.lastName[0] ?? ""}` : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {session ? `${session.firstName} ${session.lastName}` : "Loading…"}
              </p>
              <p className="text-xs text-zinc-500">{role === 'teacher' ? 'Teacher' : 'Student'}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-3 text-sm font-medium">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100",
                  isActive ? "bg-zinc-100 text-zinc-900 font-semibold" : ""
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    isActive ? "text-zinc-900" : "text-zinc-500"
                  )}
                />
                {link.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 mt-auto border-t border-zinc-100 text-xs text-zinc-500">
        {session?.schoolName || 'Classroom Companion'}
      </div>
    </div>
  );
}
