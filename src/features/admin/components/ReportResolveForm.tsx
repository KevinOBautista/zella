"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { adminResolveReportAction } from "@/features/admin/actions";

export function ReportResolveForm({ reportId, defaultNote }: { reportId: string; defaultNote: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState(defaultNote ?? "");
  const [pending, setPending] = useState(false);

  async function resolve(status: "resolved" | "dismissed" | "reviewing") {
    setPending(true);
    const result = await adminResolveReportAction(reportId, status, note);
    setPending(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    toast.success("Report updated");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="note">Internal resolution note</Label>
      <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" loading={pending} onClick={() => resolve("reviewing")}>
          Mark Reviewing
        </Button>
        <Button size="sm" loading={pending} onClick={() => resolve("resolved")}>
          Resolve
        </Button>
        <Button size="sm" variant="secondary" loading={pending} onClick={() => resolve("dismissed")}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
