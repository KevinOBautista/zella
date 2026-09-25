import type { Metadata } from "next";
import { requireSeller } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canScheduleOpenHouse } from "@/features/open-houses/domain";
import { CreateOpenHouseForm } from "@/features/open-houses/components/CreateOpenHouseForm";

export const metadata: Metadata = { title: "Schedule Open House" };

export default async function NewOpenHousePage({ searchParams }: { searchParams: Promise<{ propertyId?: string }> }) {
  const { seller } = await requireSeller();
  const { propertyId } = await searchParams;

  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, address_line_1, address_visibility, listing_status")
    .eq("seller_id", seller.id);

  const eligible = (properties ?? [])
    .filter((p) => canScheduleOpenHouse({ addressVisibility: p.address_visibility, listingStatus: p.listing_status }).ok)
    .map((p) => ({ id: p.id, label: p.title || p.address_line_1 }));

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Schedule Open House</h1>
      <CreateOpenHouseForm eligibleProperties={eligible} defaultPropertyId={propertyId} />
    </div>
  );
}
