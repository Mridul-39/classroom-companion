"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddStudentModal } from "@/components/dashboard/AddStudentModal";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AtSign,
  Check,
  Copy,
  Loader2,
  Mail,
  Search,
  Send,
  UserPlus,
} from "lucide-react";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import { UserRowActions } from "@/components/dashboard/UserRowActions";
import { MessageDialog } from "@/components/dashboard/MessageDialog";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type StudentRow = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    telegramUsername?: string | null;
    telegramId?: string | null;
    suspendedAt?: string | null;
    email?: string | null;
  };
  activeAssignments: number;
  status: string;
  inviteCode?: string | null;
};

type StatusLabel = "Active" | "Pending" | "Suspended" | "Idle";

function statusFor(row: StudentRow): StatusLabel {
  if (row.student.suspendedAt) return "Suspended";
  if (!row.student.telegramId) return "Pending";
  return row.activeAssignments > 0 ? "Active" : "Idle";
}

const statusStyles: Record<StatusLabel, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Idle: "bg-zinc-100 text-zinc-600 border-zinc-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Suspended: "bg-red-50 text-red-700 border-red-200",
};

function buildInviteMessage(row: StudentRow): string {
  const code = row.inviteCode ?? "INV-XXXX";
  const { firstName, lastName, email } = row.student;
  return `Hi ${firstName}!\n\nUse this command on the Classroom Companion Telegram bot to register:\n/register student ${firstName} ${lastName} ${email ?? "your@email"} ${code}\n\nInvite code: ${code}`;
}

function CopyButton({
  text,
  title,
}: {
  text: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={copied ? "Copied!" : title}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className={cn(
        buttonVariants({ variant: "outline", size: "icon" }),
        "h-8 w-8"
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="sr-only">{title}</span>
    </button>
  );
}

export default function TeacherStudentsPage() {
  const { session } = useSession();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [messageTarget, setMessageTarget] = useState<{ id: string; label: string } | null>(null);

  const refresh = useCallback(() => {
    if (!session) return;
    setLoading(true);
    fetch("/api/students")
      .then((res) => res.json())
      .then((data) => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(({ student }) =>
      [student.firstName, student.lastName, student.email, student.telegramUsername]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [students, query]);

  const counts = useMemo(() => {
    const acc = { total: students.length, active: 0, pending: 0, suspended: 0 };
    for (const row of students) {
      const s = statusFor(row);
      if (s === "Active" || s === "Idle") acc.active++;
      else if (s === "Pending") acc.pending++;
      else if (s === "Suspended") acc.suspended++;
    }
    return acc;
  }, [students]);

  return (
    <DashboardShell role="teacher">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Students"
          description="Your classroom roster. Invite new students, message them, or manage their access."
          action={session ? <AddStudentModal teacherId={session.userId} /> : null}
        />

        {!loading && students.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or @username"
                className="pl-9 bg-white border-zinc-200"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Badge variant="outline" className="border-zinc-200 bg-white">
                {counts.total} total
              </Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                {counts.active} active
              </Badge>
              {counts.pending > 0 && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  {counts.pending} pending
                </Badge>
              )}
              {counts.suspended > 0 && (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                  {counts.suspended} suspended
                </Badge>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No students yet"
            description="Invite your first student to start tracking assignments."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`Nothing matched "${query}". Try a different search.`}
          />
        ) : (
          <Card className="shadow-sm border-zinc-200 overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50/60 hover:bg-zinc-50/60">
                    <TableHead className="pl-4">Student</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-32">
                      <div className="flex items-center justify-center">Active tasks</div>
                    </TableHead>
                    <TableHead className="w-[220px] pr-4">
                      <div className="flex items-center justify-end">Actions</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const { student, activeAssignments } = row;
                    const label = statusFor(row);
                    const isActive = Boolean(student.telegramId);
                    const isSuspended = Boolean(student.suspendedAt);
                    const canManage = Boolean(session?.isAdmin && session.userId !== student.id);
                    const tgUsername = student.telegramUsername?.replace(/^@/, "");

                    return (
                      <TableRow key={student.id} className="align-middle">
                        <TableCell className="pl-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9 border shrink-0">
                              <AvatarImage src={student.avatarUrl ?? undefined} />
                              <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs">
                                {student.firstName[0]}
                                {student.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium text-zinc-900 truncate">
                                {student.firstName} {student.lastName}
                              </div>
                              <div className="text-xs text-zinc-500 truncate">
                                {student.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="text-xs space-y-0.5 max-w-[220px]">
                            {student.email ? (
                              <div className="flex items-center gap-1.5 text-zinc-700 truncate">
                                <Mail className="h-3 w-3 shrink-0 text-zinc-400" />
                                <span className="truncate">{student.email}</span>
                              </div>
                            ) : (
                              <div className="text-zinc-400 italic">no email</div>
                            )}
                            {tgUsername ? (
                              <div className="flex items-center gap-1.5 text-zinc-500">
                                <AtSign className="h-3 w-3 shrink-0" />
                                <span>{tgUsername}</span>
                              </div>
                            ) : (
                              <div className="text-zinc-400 italic">no Telegram link</div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <Badge variant="outline" className={statusStyles[label]}>
                            {label}
                          </Badge>
                        </TableCell>

                        <TableCell className="w-32 py-3 font-medium text-zinc-900 tabular-nums">
                          <div className="flex items-center justify-center">
                            {isActive && !isSuspended ? activeAssignments : <span className="text-zinc-300">—</span>}
                          </div>
                        </TableCell>

                        <TableCell className="w-[220px] pr-4 py-3">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {isActive ? (
                              <>
                                <a
                                  href={student.email ? `mailto:${student.email}` : undefined}
                                  aria-disabled={!student.email}
                                  title={student.email ? `Email ${student.email}` : "No email on file"}
                                  className={cn(
                                    buttonVariants({ variant: "outline", size: "icon" }),
                                    "h-8 w-8",
                                    !student.email && "pointer-events-none opacity-40"
                                  )}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  <span className="sr-only">Email</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMessageTarget({
                                      id: student.id,
                                      label: `${student.firstName} ${student.lastName}`,
                                    })
                                  }
                                  disabled={!student.telegramId || isSuspended}
                                  title={
                                    !student.telegramId
                                      ? "Student hasn't linked Telegram yet"
                                      : isSuspended
                                        ? "Suspended"
                                        : "Send a message via the bot"
                                  }
                                  className={cn(
                                    buttonVariants({ variant: "outline", size: "icon" }),
                                    "h-8 w-8 disabled:opacity-40 disabled:cursor-not-allowed"
                                  )}
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span className="sr-only">Message</span>
                                </button>
                              </>
                            ) : (
                              <CopyButton
                                text={buildInviteMessage(row)}
                                title={
                                  row.inviteCode
                                    ? `Copy invite (code ${row.inviteCode})`
                                    : "Copy invite message"
                                }
                              />
                            )}
                            <UserRowActions
                              userId={student.id}
                              userLabel={`${student.firstName} ${student.lastName}`}
                              isActive={isActive}
                              isSuspended={isSuspended}
                              disabled={!canManage}
                              onChange={refresh}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {messageTarget && (
        <MessageDialog
          open={!!messageTarget}
          onOpenChange={(open) => !open && setMessageTarget(null)}
          userId={messageTarget.id}
          userLabel={messageTarget.label}
        />
      )}
    </DashboardShell>
  );
}
