"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createOpenHouseAction } from "@/features/open-houses/actions";

type EligibleProperty = { id: string; label: string };

export function CreateOpenHouseForm({
  eligibleProperties,
  defaultPropertyId,
}: {
  eligibleProperties: EligibleProperty[];
  defaultPropertyId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (eligibleProperties.length === 0) {
    return (
      <p className="max-w-md text-sm text-[var(--color-muted)]">
        None of your properties are eligible yet. A property must be published (For Sale, Coming
        Soon, or Under Contract) with its address set to fully public before you can schedule an
        open house.
      </p>
    );
  }

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const date = String(formData.get("date"));
        const startTime = String(formData.get("startTime"));
        const endTime = String(formData.get("endTime"));

        setPending(true);
        const result = await createOpenHouseAction({
          propertyId: String(formData.get("propertyId")),
          startsAt: new Date(`${date}T${startTime}`).toISOString(),
          endsAt: new Date(`${date}T${endTime}`).toISOString(),
          registrationType: String(formData.get("registrationType")),
          instructions: String(formData.get("instructions") ?? ""),
          hostType: String(formData.get("hostType")),
        });
        setPending(false);

        if ("error" in result) {
          toast.error(result.error);
          return;
        }
        toast.success("Open house scheduled");
        router.push("/dashboard/open-houses");
      }}
    >
      <div>
        <Label htmlFor="propertyId">Property</Label>
        <select id="propertyId" name="propertyId" defaultValue={defaultPropertyId} className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
          {eligibleProperties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input id="startTime" name="startTime" type="time" required />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input id="endTime" name="endTime" type="time" required />
        </div>
      </div>
      <p className="text-xs text-[var(--color-muted-foreground)]">Times are in America/New_York.</p>
      <div>
        <Label htmlFor="registrationType">RSVP Requirement</Label>
        <select id="registrationType" name="registrationType" defaultValue="optional" className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
          <option value="none">None</option>
          <option value="optional">Optional</option>
          <option value="required">Required</option>
        </select>
      </div>
      <div>
        <Label htmlFor="hostType">Hosted by</Label>
        <select id="hostType" name="hostType" defaultValue="seller" className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm">
          <option value="seller">Seller</option>
          <option value="agent">Agent</option>
          <option value="both">Both</option>
        </select>
      </div>
      <div>
        <Label htmlFor="instructions">Instructions (optional)</Label>
        <Textarea id="instructions" name="instructions" rows={3} />
      </div>
      <Button type="submit" loading={pending}>
        Schedule Open House
      </Button>
    </form>
  );
}
