"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { PageHeader } from "@/components/ui-custom/PageHeader";
import { AddTeacherModal } from "@/components/dashboard/AddTeacherModal";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Users,
} from "lucide-react";
import { EmptyState } from "@/components/ui-custom/EmptyState";
import { UserRowActions } from "@/components/dashboard/UserRowActions";
import { MessageDialog } from "@/components/dashboard/MessageDialog";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type TeacherRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  avatarUrl?: string | null;
  telegramUsername?: string | null;
  telegramId?: string | null;
  suspendedAt?: string | null;
  inviteCode?: string | null;
};

type StatusLabel = "Active" | "Pending" | "Suspended";

function statusFor(t: TeacherRow): StatusLabel {
  if (t.suspendedAt) return "Suspended";
  if (!t.telegramId) return "Pending";
  return "Active";
}

const statusStyles: Record<StatusLabel, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Suspended: "bg-red-50 text-red-700 border-red-200",
};

function buildInviteMessage(t: TeacherRow): string {
  const code = t.inviteCode ?? "INV-XXXX";
  return `Hi ${t.firstName}!\n\nUse this command on the Classroom Companion Telegram bot to register:\n/register teacher ${t.firstName} ${t.lastName} ${t.email ?? "your@email"} ${code}\n\nInvite code: ${code}`;
}

function CopyButton({ text, title }: { text: string; title: string }) {
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

export default function TeacherTeamPage() {
  const { session } = useSession();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [messageTarget, setMessageTarget] = useState<{ id: string; label: string } | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/teachers")
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

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      [t.firstName, t.lastName, t.email, t.telegramUsername]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [teachers, query]);

  const counts = useMemo(() => {
    const acc = { total: teachers.length, active: 0, pending: 0, suspended: 0 };
    for (const t of teachers) {
      const s = statusFor(t);
      if (s === "Active") acc.active++;
      else if (s === "Pending") acc.pending++;
      else if (s === "Suspended") acc.suspended++;
    }
    return acc;
  }, [teachers]);

  return (
    <DashboardShell role="teacher">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Team"
          description="Teachers in your workspace. Admins can invite, suspend, or remove members."
          action={session?.isAdmin ? <AddTeacherModal teacherId={session.userId} /> : null}
        />

        {!loading && teachers.length > 0 && (
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
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teachers yet"
            description="Invite teachers to join and collaborate on assignments."
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
                    <TableHead className="pl-4">Teacher</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-[180px] pr-4">
                      <div className="flex items-center justify-end">Actions</div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((teacher) => {
                    const label = statusFor(teacher);
                    const isActive = Boolean(teacher.telegramId);
                    const isSuspended = Boolean(teacher.suspendedAt);
                    const isSelf = session?.userId === teacher.id;
                    const canManage = Boolean(session?.isAdmin && !isSelf);
                    const tgUsername = teacher.telegramUsername?.replace(/^@/, "");

                    return (
                      <TableRow key={teacher.id} className="align-middle">
                        <TableCell className="pl-4 py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9 border shrink-0">
                              <AvatarImage src={teacher.avatarUrl ?? undefined} />
                              <AvatarFallback className="bg-zinc-100 text-zinc-600 text-xs">
                                {teacher.firstName?.[0]}
                                {teacher.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-zinc-900 truncate">
                                  {teacher.firstName} {teacher.lastName}
                                </span>
                                {isSelf && (
                                  <Badge
                                    variant="outline"
                                    className="border-zinc-200 bg-white text-zinc-500 text-[10px] px-1.5 py-0"
                                  >
                                    You
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-zinc-500 truncate">{teacher.id}</div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="text-xs space-y-0.5 max-w-[240px]">
                            {teacher.email ? (
                              <div className="flex items-center gap-1.5 text-zinc-700 truncate">
                                <Mail className="h-3 w-3 shrink-0 text-zinc-400" />
                                <span className="truncate">{teacher.email}</span>
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

                        <TableCell className="w-[180px] pr-4 py-3">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            {isActive ? (
                              <>
                                <a
                                  href={teacher.email ? `mailto:${teacher.email}` : undefined}
                                  aria-disabled={!teacher.email}
                                  title={teacher.email ? `Email ${teacher.email}` : "No email on file"}
                                  className={cn(
                                    buttonVariants({ variant: "outline", size: "icon" }),
                                    "h-8 w-8",
                                    !teacher.email && "pointer-events-none opacity-40"
                                  )}
                                >
                                  <Mail className="h-3.5 w-3.5" />
                                  <span className="sr-only">Email</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMessageTarget({
                                      id: teacher.id,
                                      label: `${teacher.firstName} ${teacher.lastName}`,
                                    })
                                  }
                                  disabled={!teacher.telegramId || isSuspended}
                                  title={
                                    !teacher.telegramId
                                      ? "Teacher hasn't linked Telegram yet"
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
                                text={buildInviteMessage(teacher)}
                                title={
                                  teacher.inviteCode
                                    ? `Copy invite (code ${teacher.inviteCode})`
                                    : "Copy invite message"
                                }
                              />
                            )}
                            <UserRowActions
                              userId={teacher.id}
                              userLabel={`${teacher.firstName} ${teacher.lastName}`}
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
