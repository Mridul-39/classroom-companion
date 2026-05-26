"use client";

import { useState } from "react";
import { User, Teacher } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail, User as UserIcon, Link as LinkIcon, Loader2, CheckCircle2 } from "lucide-react";

export function ProfileSettings({ user }: { user: User }) {
  const isTeacher = user.role === 'teacher';

  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [telegramUsername, setTelegramUsername] = useState(user.telegramUsername ?? '');
  const [schoolName, setSchoolName] = useState((user as Teacher).schoolName ?? '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, telegramUsername, schoolName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to save');
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
        <CardTitle className="text-base font-semibold text-zinc-900">Personal Information</CardTitle>
        <CardDescription className="text-zinc-500">
          Update your contact details and how you appear to others.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-zinc-700">First Name</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="pl-9 border-zinc-200 focus-visible:ring-zinc-300"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-zinc-700">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="border-zinc-200 focus-visible:ring-zinc-300"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-700">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="pl-9 border-zinc-200 focus-visible:ring-zinc-300"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="telegramUsername" className="text-zinc-700">Telegram Username</Label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                id="telegramUsername"
                value={telegramUsername}
                onChange={e => setTelegramUsername(e.target.value)}
                className="pl-9 border-zinc-200 focus-visible:ring-zinc-300"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegramId" className="text-zinc-700 flex items-center justify-between">
              Telegram ID
              <span className="text-xs text-zinc-400 font-normal">Set by bot</span>
            </Label>
            <Input
              id="telegramId"
              value={user.telegramId ?? ''}
              readOnly
              className="border-zinc-200 bg-zinc-50 text-zinc-500 cursor-not-allowed"
            />
          </div>
        </div>

        {isTeacher && (
          <div className="space-y-2">
            <Label htmlFor="schoolName" className="text-zinc-700">School / Organization</Label>
            <Input
              id="schoolName"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              className="border-zinc-200 focus-visible:ring-zinc-300"
            />
          </div>
        )}

        {!isTeacher && (
          <div className="space-y-2">
            <Label htmlFor="linkedTeacher" className="text-zinc-700">Linked Teacher</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input id="linkedTeacher" defaultValue="Meera Kapoor" readOnly className="pl-9 bg-zinc-50 border-zinc-200 text-zinc-500 cursor-not-allowed" />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
      <CardFooter className="bg-zinc-50/50 border-t border-zinc-100 flex justify-end gap-3 p-4">
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Saved
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm px-6"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save Changes'}
        </Button>
      </CardFooter>
    </Card>
  );
}
