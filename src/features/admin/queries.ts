import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getAdminOverview() {
  const supabase = await createClient();
  const [{ count: activeSellers }, { count: publishedProperties }, { count: openReports }, { count: suspendedSellers }] =
    await Promise.all([
      // Platform activity counts real content only; demo content is sample data.
      supabase.from("seller_profiles").select("id", { count: "exact", head: true }).eq("status", "active").eq("is_demo", false),
      supabase.from("properties").select("id", { count: "exact", head: true }).eq("is_demo", false).in("listing_status", ["for_sale", "coming_soon", "under_contract", "sold"]),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("seller_profiles").select("id", { count: "exact", head: true }).eq("status", "suspended").eq("is_demo", false),
    ]);

  return {
    activeSellers: activeSellers ?? 0,
    publishedProperties: publishedProperties ?? 0,
    openReports: openReports ?? 0,
    suspendedSellers: suspendedSellers ?? 0,
  };
}

/**
 * Least-privilege by design: this query never touches
 * inquiries/lead PII. It only selects what the /admin/users table renders.
 */
export async function searchAdminUsers(q: string | undefined) {
  const supabase = await createClient();

  let profileQuery = supabase.from("profiles").select("user_id, first_name, last_name, created_at").order("created_at", { ascending: false }).limit(100);
  if (q) profileQuery = profileQuery.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`);
  const { data: profiles } = await profileQuery;

  const userIds = (profiles ?? []).map((p) => p.user_id);
  const [{ data: roles }, { data: sellers }] = await Promise.all([
    supabase.from("user_roles").select("user_id, role").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("seller_profiles").select("user_id, username, status").in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  return (profiles ?? []).map((p) => ({
    ...p,
    roles: (roles ?? []).filter((r) => r.user_id === p.user_id).map((r) => r.role),
    seller: (sellers ?? []).find((s) => s.user_id === p.user_id) ?? null,
  }));
}

export async function searchAdminSellers(q: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("seller_profiles")
    .select("id, username, display_name, account_type, status, created_at, is_demo")
    .order("is_demo", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);
  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`);
  const { data: sellers } = await query;

  const sellerIds = (sellers ?? []).map((s) => s.id);
  const idsOrPlaceholder = sellerIds.length ? sellerIds : ["00000000-0000-0000-0000-000000000000"];
  const [{ data: activeCounts }, { data: reportCounts }, { data: entitlements }] = await Promise.all([
    supabase.from("properties").select("seller_id").in("seller_id", idsOrPlaceholder).in("listing_status", ["for_sale", "coming_soon", "under_contract"]),
    supabase.from("reports").select("seller_id").in("seller_id", idsOrPlaceholder),
    supabase.from("seller_entitlements").select("seller_id, additional_listing_slots").in("seller_id", idsOrPlaceholder),
  ]);

  return (sellers ?? []).map((s) => ({
    ...s,
    activePropertyCount: (activeCounts ?? []).filter((p) => p.seller_id === s.id).length,
    reportCount: (reportCounts ?? []).filter((r) => r.seller_id === s.id).length,
    additionalListingSlots: entitlements?.find((e) => e.seller_id === s.id)?.additional_listing_slots ?? 0,
  }));
}

export async function searchAdminProperties(q: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("properties")
    .select("id, title, address_line_1, city, state, listing_status, moderation_status, seller_id, is_demo, seller_profiles(username, display_name)")
    .order("is_demo", { ascending: true })
    .order("updated_at", { ascending: false })
    .limit(100);
  if (q) query = query.or(`title.ilike.%${q}%,address_line_1.ilike.%${q}%,city.ilike.%${q}%`);
  const { data } = await query;
  return data ?? [];
}

export async function getAdminReports(status: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from("reports")
    .select("*, properties(title, address_line_1, slug), seller_profiles(username, display_name)")
    .order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status as never);
  const { data } = await query;
  return data ?? [];
}

export async function getAdminReportById(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("*, properties(title, address_line_1, city, state, slug), seller_profiles(username, display_name)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getAuditLog() {
  const supabase = await createClient();
  const { data } = await supabase.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
  return data ?? [];
}
