"use client";

import { useState } from "react";
import type { AppSettings } from "@prisma/client";
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
import { Bot, Key, Sparkles, Loader2, CheckCircle2 } from "lucide-react";

export function LLMSettings({ settings }: { settings?: AppSettings | null }) {
  const [provider, setProvider] = useState(settings?.llmProvider ?? 'OpenAI');
  const [model, setModel] = useState(settings?.llmModel ?? 'gpt-4o');
  const [apiKey, setApiKey] = useState(settings?.encryptedApiKey ?? '');

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmProvider: provider, llmModel: model, encryptedApiKey: apiKey }),
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
        <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          AI Assistant Integration
        </CardTitle>
        <CardDescription className="text-zinc-500 mt-1">
          Configure the language model used to analyze student progress and draft feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-zinc-700">Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
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
              <Input
                id="model"
                value={model}
                onChange={e => setModel(e.target.value)}
                className="pl-9 border-zinc-200 focus-visible:ring-zinc-300"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey" className="text-zinc-700 flex items-center justify-between">
            API Key
            <span className="text-xs text-zinc-400 font-normal">Stored encrypted</span>
          </Label>
          <div className="relative">
            <Key className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="pl-9 font-mono border-zinc-200 focus-visible:ring-zinc-300"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
      <CardFooter className="bg-zinc-50/50 border-t border-zinc-100 flex justify-between p-4">
        <div />
        <div className="flex items-center gap-3">
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
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : 'Save AI Settings'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
