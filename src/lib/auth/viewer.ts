import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AccountState } from "@/lib/seller-routing";
import type { User } from "@supabase/supabase-js";

export type Viewer = {
  user: User | null;
  seller: { id: string; username: string; display_name: string; status: string } | null;
  state: AccountState;
  initial: string;
};

/**
 * Real session + seller status for the current request, deduped across the
 * header, page, and footer with React `cache` so each request hits Supabase
 * once. A seller keeps every buyer capability — `state` only says which
 * seller entry points to show, it never gates browsing, saves, or follows.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, seller: null, state: "guest", initial: "" };

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("id, username, display_name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user,
    seller: seller ?? null,
    state: seller ? "seller" : "buyer",
    initial: (user.email ?? "U").charAt(0).toUpperCase(),
  };
});
