"use client";

import { User, Teacher } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageCircle, Mail, User as UserIcon, Link as LinkIcon } from "lucide-react";

export function ProfileSettings({ user }: { user: User }) {
  const isTeacher = user.role === 'teacher';
  
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
              <Input id="firstName" defaultValue={user.firstName} className="pl-9 border-zinc-200 focus-visible:ring-zinc-300" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-zinc-700">Last Name</Label>
            <Input id="lastName" defaultValue={user.lastName} className="border-zinc-200 focus-visible:ring-zinc-300" />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-700">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input id="email" type="email" defaultValue={user.email} className="pl-9 border-zinc-200 focus-visible:ring-zinc-300" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="telegramUsername" className="text-zinc-700">Telegram Username</Label>
            <div className="relative">
              <MessageCircle className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input id="telegramUsername" defaultValue={user.telegramUsername} className="pl-9 border-zinc-200 focus-visible:ring-zinc-300" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegramId" className="text-zinc-700 flex items-center justify-between">
              Telegram ID
              <span className="text-xs text-zinc-400 font-normal">Optional</span>
            </Label>
            <Input id="telegramId" defaultValue={user.telegramId || ""} placeholder="e.g. 123456789" className="border-zinc-200 focus-visible:ring-zinc-300" />
          </div>
        </div>

        {isTeacher && (
          <div className="space-y-2">
            <Label htmlFor="schoolName" className="text-zinc-700">School / Organization</Label>
            <Input id="schoolName" defaultValue={(user as Teacher).schoolName || ""} className="border-zinc-200 focus-visible:ring-zinc-300" />
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
      </CardContent>
      <CardFooter className="bg-zinc-50/50 border-t border-zinc-100 flex justify-end p-4">
        <Button className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm px-6">Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
