import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Whether any of the given targets is demo content. Reads with the service
 * role so the answer does not depend on the public visibility switch; the
 * database triggers remain the final guarantee.
 */
export async function isDemoTarget(target: { propertyId?: string | null; sellerId?: string | null; openHouseId?: string | null }): Promise<boolean> {
  const admin = createAdminClient();
  const checks: PromiseLike<boolean>[] = [];
  if (target.propertyId) {
    checks.push(admin.from("properties").select("is_demo").eq("id", target.propertyId).maybeSingle().then((r) => Boolean(r.data?.is_demo)));
  }
  if (target.sellerId) {
    checks.push(admin.from("seller_profiles").select("is_demo").eq("id", target.sellerId).maybeSingle().then((r) => Boolean(r.data?.is_demo)));
  }
  if (target.openHouseId) {
    checks.push(admin.from("open_houses").select("is_demo").eq("id", target.openHouseId).maybeSingle().then((r) => Boolean(r.data?.is_demo)));
  }
  return (await Promise.all(checks)).some(Boolean);
}
