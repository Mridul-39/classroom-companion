"use client";

import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";

export function CreateAssignmentModal({ teacherId, students }: { teacherId: string, students: any[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    title: "", 
    description: "", 
    dueDate: "",
    studentIds: [] as string[],
    attachment: null as File | null,
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (formData.attachment) {
        const uploadForm = new FormData();
        uploadForm.append('file', formData.attachment);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadForm,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          attachmentUrl = uploadData.url;
          attachmentName = uploadData.name || formData.attachment.name;
        } else {
          console.error('File upload failed');
        }
      }

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          studentIds: formData.studentIds,
          title: formData.title,
          description: formData.description,
          dueDate: formData.dueDate,
          attachmentUrl,
          attachmentName,
        }),
      });

      if (res.ok) {
        setOpen(false);
        setFormData({ title: '', description: '', dueDate: '', studentIds: [], attachment: null });
        window.location.reload();
      } else {
        console.error('Failed to create assignment');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" /> Create Assignment
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
          <DialogDescription>
            Create a new assignment and assign it to a student.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input id="dueDate" type="datetime-local" required value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentIds">Assign To Student(s)</Label>
            <select
              id="studentIds"
              required
              multiple
              value={formData.studentIds}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map((option) => option.value);
                setFormData({ ...formData, studentIds: selected });
              }}
              className="flex h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">Hold Ctrl or Cmd to select multiple students.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachment">Optional Attachment</Label>
            <Input
              id="attachment"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setFormData({ ...formData, attachment: file });
              }}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
