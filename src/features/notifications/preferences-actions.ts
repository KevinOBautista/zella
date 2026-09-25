"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { TablesUpdate } from "@/types/database";

const FIELDS = [
  "email_followed_new_properties",
  "email_followed_coming_soon",
  "email_followed_open_houses",
  "email_new_leads",
  "email_open_house_rsvps",
] as const;

export async function updateNotificationPreferencesAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  const update: TablesUpdate<"notification_preferences"> = {};
  for (const field of FIELDS) {
    if (formData.has(field)) update[field] = formData.get(field) === "on";
  }

  await supabase.from("notification_preferences").update(update).eq("user_id", user.id);
  revalidatePath("/account/settings");
  revalidatePath("/dashboard/settings");
}
