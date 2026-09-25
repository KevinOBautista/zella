"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addLeadNoteAction } from "@/features/leads/actions";
import type { Tables } from "@/types/database";

export function LeadNotes({ inquiryId, notes }: { inquiryId: string; notes: Tables<"lead_notes">[] }) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Add a private note (only visible to you)…" />
        <Button
          size="sm"
          className="mt-2"
          loading={pending}
          onClick={async () => {
            setPending(true);
            const result = await addLeadNoteAction(inquiryId, note);
            setPending(false);
            if ("error" in result) {
              toast.error(result.error);
              return;
            }
            setNote("");
            router.refresh();
          }}
        >
          Add Note
        </Button>
      </div>
      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
            <p>{n.note}</p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{new Date(n.created_at).toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
