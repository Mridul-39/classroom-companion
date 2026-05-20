"use client";

import { Teacher } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Bot, Key, Sparkles } from "lucide-react";

export function LLMSettings({ settings }: { settings?: Teacher['llmSettings'] }) {
  return (
    <Card className="shadow-sm border-zinc-200">
      <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-4">
        <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          AI Assistant Integration
        </CardTitle>
        <CardDescription className="text-zinc-500 mt-1">
          Configure the language model used to analyze student progress and draft feedback. 
          <span className="block mt-1.5 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-md w-fit">
            Backend connection will be added later. These are mock settings for the demo.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-zinc-700">Provider</Label>
            <Select defaultValue={settings?.llmProvider || "OpenAI"}>
              <SelectTrigger className="border-zinc-200 focus:ring-zinc-300">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OpenAI">OpenAI</SelectItem>
                <SelectItem value="Gemini">Google Gemini</SelectItem>
                <SelectItem value="Claude">Anthropic Claude</SelectItem>
                <SelectItem value="Custom">Custom Endpoint</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model" className="text-zinc-700">Model Name</Label>
            <div className="relative">
              <Bot className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input id="model" defaultValue={settings?.llmModel || "gpt-4o"} className="pl-9 border-zinc-200 focus-visible:ring-zinc-300" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey" className="text-zinc-700 flex items-center justify-between">
            API Key
            <span className="text-xs text-zinc-400 font-normal">Encrypted securely</span>
          </Label>
          <div className="relative">
            <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input id="apiKey" type="password" defaultValue={settings?.encryptedApiKey || ""} placeholder="sk-..." className="pl-9 font-mono border-zinc-200 focus-visible:ring-zinc-300" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-zinc-50/50 border-t border-zinc-100 flex justify-between p-4">
        <Button variant="outline" className="border-zinc-300 text-zinc-700">Test Connection</Button>
        <Button className="bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm px-6">Save AI Settings</Button>
      </CardFooter>
    </Card>
  );
}
