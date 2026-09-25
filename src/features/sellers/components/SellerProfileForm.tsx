"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SellerFormResult } from "@/features/sellers/actions";
import { publicEnv } from "@/config/publicEnv";

const profileHost = new URL(publicEnv.NEXT_PUBLIC_SITE_URL).host;

type Props = {
  mode: "create" | "edit";
  accountType: "individual" | "business";
  action: (prev: unknown, formData: FormData) => Promise<SellerFormResult>;
  defaultValues?: {
    displayName?: string;
    username?: string;
    bio?: string | null;
    city?: string;
    state?: string;
    websiteUrl?: string | null;
    instagramUrl?: string | null;
  };
};

export function SellerProfileForm({ mode, accountType, action, defaultValues }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [username, setUsername] = useState(defaultValues?.username ?? "");
  const originalUsername = defaultValues?.username ?? "";
  const usernameChanged = mode === "edit" && username !== originalUsername && username.length > 0;

  const fieldError = (field: string) =>
    state && "error" in state && state.field === field ? state.error : undefined;

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Profile updated");
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="accountType" value={accountType} />

      <div>
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          maxLength={80}
          defaultValue={defaultValues?.displayName}
          placeholder={accountType === "business" ? "716 Property Group" : "Jordan Miller"}
        />
        <FieldError id="displayName-error" message={fieldError("displayName")} />
      </div>

      <div>
        <Label htmlFor="username">Username</Label>
        <div className="flex items-center gap-1 text-sm text-[var(--color-muted)]">
          <span className="shrink-0">{profileHost}/@</span>
          <Input
            id="username"
            name="username"
            required
            maxLength={30}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="jordanmiller"
            className="text-[var(--color-foreground)]"
          />
        </div>
        <FieldError id="username-error" message={fieldError("username")} />
        {usernameChanged && (
          <p className="mt-1.5 text-sm text-[var(--color-warning)]" role="alert">
            Changing your username changes your public profile link. Anyone using your old link
            will see a 404.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" required defaultValue={defaultValues?.city} placeholder="Buffalo" />
          <FieldError id="city-error" message={fieldError("city")} />
        </div>
        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" required maxLength={2} defaultValue={defaultValues?.state} placeholder="NY" />
          <FieldError id="state-error" message={fieldError("state")} />
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" maxLength={1000} defaultValue={defaultValues?.bio ?? ""} rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="websiteUrl">Website (optional)</Label>
          <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={defaultValues?.websiteUrl ?? ""} placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="instagramUrl">Instagram (optional)</Label>
          <Input id="instagramUrl" name="instagramUrl" type="url" defaultValue={defaultValues?.instagramUrl ?? ""} placeholder="https://instagram.com/" />
        </div>
      </div>

      {state && "error" in state && !state.field && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" loading={pending}>
        {mode === "create" ? "Create seller page" : "Save changes"}
      </Button>
    </form>
  );
}
