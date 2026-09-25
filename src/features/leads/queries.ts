import "server-only";
import { createClient } from "@/lib/supabase/server";
import { countLeadsByStatus } from "@/features/leads/pipeline";
import { escapeSearch } from "@/features/leads/search-params";

export type LeadListFilters = {
  status?: string;
  propertyId?: string;
  q?: string;
  sort?: "newest" | "oldest";
};

const SEARCHABLE = ["first_name", "last_name", "email", "phone"] as const;

export async function getLeads(sellerId: string, filters: LeadListFilters) {
  const supabase = await createClient();
  const search = filters.q ? escapeSearch(filters.q) : "";
  const orFilter = search ? SEARCHABLE.map((c) => `${c}.ilike.%${search}%`).join(",") : null;

  let rows = supabase
    .from("inquiries")
    .select("*, properties(title, slug, address_line_1, city, property_images(storage_path, is_cover, display_order))")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: filters.sort === "oldest" });
  if (filters.propertyId) rows = rows.eq("property_id", filters.propertyId);
  if (orFilter) rows = rows.or(orFilter);
  // Status narrows the visible rows only — the counts below stay over the
  // whole matching dataset so every category keeps an accurate total.
  if (filters.status && filters.status !== "all") rows = rows.eq("lead_status", filters.status as never);

  let statuses = supabase.from("inquiries").select("lead_status").eq("seller_id", sellerId);
  if (filters.propertyId) statuses = statuses.eq("property_id", filters.propertyId);
  if (orFilter) statuses = statuses.or(orFilter);

  const [{ data }, { data: statusRows }] = await Promise.all([rows, statuses]);

  return {
    leads: data ?? [],
    countsByStatus: countLeadsByStatus(statusRows ?? []),
    total: (statusRows ?? []).length,
  };
}

export async function getLeadById(inquiryId: string) {
  const supabase = await createClient();
  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("*, properties(title, slug, address_line_1, city, state)")
    .eq("id", inquiryId)
    .maybeSingle();
  if (!inquiry) return null;

  const [{ data: notes }, { data: activity }] = await Promise.all([
    supabase.from("lead_notes").select("*").eq("inquiry_id", inquiryId).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("lead_activity").select("*").eq("inquiry_id", inquiryId).order("created_at", { ascending: false }),
  ]);

  return { inquiry, notes: notes ?? [], activity: activity ?? [] };
}

export async function getOwnSellerProperties(sellerId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("properties").select("id, title, address_line_1").eq("seller_id", sellerId).order("created_at", { ascending: false });
  return data ?? [];
}
