import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Overview data.
 *
 * The lead query deliberately carries NO `lead_status` filter: the previous
 * version fetched only `lead_status = 'new'`, so a lead disappeared from the
 * Overview the moment the seller categorized it. Every inquiry is fetched
 * and grouped by status in the pipeline component instead, which keeps each
 * category — closed and not-interested included — reachable, and keeps the
 * counts describing the complete dataset rather than the preview.
 */
export async function getDashboardOverview(sellerId: string) {
  const supabase = await createClient();

  const [{ data: properties }, { data: leads }, { data: upcomingOpenHouses }, { data: activity }] =
    await Promise.all([
      supabase.from("properties").select("id, listing_status").eq("seller_id", sellerId),
      supabase
        .from("inquiries")
        .select(
          "id, first_name, last_name, message, created_at, lead_status, property_id, properties(title, address_line_1, property_images(storage_path, is_cover, display_order))",
        )
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("open_houses")
        .select("id, starts_at, ends_at, properties(title, address_line_1, city)")
        .eq("seller_id", sellerId)
        .eq("status", "scheduled")
        .gt("ends_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(5),
      supabase
        .from("property_activity")
        .select("id, event_type, created_at, properties(title, address_line_1, city)")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const rows = properties ?? [];
  const countBy = (status: string) => rows.filter((p) => p.listing_status === status).length;

  return {
    counts: {
      for_sale: countBy("for_sale"),
      coming_soon: countBy("coming_soon"),
      under_contract: countBy("under_contract"),
      sold: countBy("sold"),
      drafts: countBy("draft"),
    },
    leads: leads ?? [],
    upcomingOpenHouses: upcomingOpenHouses ?? [],
    activity: activity ?? [],
  };
}
