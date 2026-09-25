import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DataBackend, DatasetSnapshot, LedgerRow, LedgerState } from "./backend";

const SNAPSHOT_COLUMNS = {
  sellers: "id, seed_key, account_type, display_name, username, bio, city, state",
  properties:
    "id, seed_key, seller_id, slug, title, description, property_type, listing_status, address_visibility, city, state, postal_code, county, bedrooms, full_bathrooms, half_bathrooms, square_feet, lot_size, lot_size_unit, year_built, stories, parking_spaces, garage_spaces, number_of_units, basement_type, heating_type, cooling_type, parking_type, hoa_fee_cents, property_taxes_annual_cents, pricing_type, asking_price_cents, expected_price_min_cents, expected_price_max_cents, published_at",
  property_images: "id, seed_key, property_id, storage_path, display_order, is_cover, width, height, alt_text, credit",
  open_houses: "id, seed_key, property_id, seller_id, starts_at, ends_at, registration_type, host_type, instructions",
} as const;

const TABLE_NAMES = { sellers: "seller_profiles", properties: "properties", property_images: "property_images", open_houses: "open_houses" } as const;

function fail(context: string, error: { message: string; code?: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}${error?.code ? ` (${error.code})` : ""}`);
}

export function createServiceClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export class SupabaseBackend implements DataBackend {
  constructor(private readonly db: SupabaseClient) {}

  async snapshot(dataset: string): Promise<DatasetSnapshot> {
    const features = await this.db.from("features").select("slug");
    if (features.error) fail("read features", features.error);
    const featureSlugs = (features.data ?? []).map((f) => f.slug as string);

    const probe = await this.db.from("properties").select("is_demo").limit(1);
    if (probe.error) {
      if (probe.error.code === "42703" || /is_demo/.test(probe.error.message)) {
        return { schemaReady: false, visible: null, rows: { sellers: [], properties: [], property_images: [], open_houses: [] }, featureSlugs };
      }
      fail("probe demo schema", probe.error);
    }

    const setting = await this.db.from("app_settings").select("value").eq("key", "public_demo_content_visible").maybeSingle();
    if (setting.error) fail("read visibility", setting.error);

    const rows = {} as DatasetSnapshot["rows"];
    for (const key of Object.keys(TABLE_NAMES) as (keyof typeof TABLE_NAMES)[]) {
      const columns: string = SNAPSHOT_COLUMNS[key];
      const res = await this.db.from(TABLE_NAMES[key] as string).select(columns).eq("demo_dataset", dataset).order("seed_key");
      if (res.error) fail(`read ${TABLE_NAMES[key]}`, res.error);
      rows[key] = (res.data ?? []) as unknown as Record<string, unknown>[];
    }
    return { schemaReady: true, visible: setting.data ? setting.data.value === true : false, rows, featureSlugs };
  }

  async ledger(filter: { dataset: string; states?: LedgerState[] }): Promise<LedgerRow[]> {
    let q = this.db.from("demo_storage_ledger").select("operation_id, dataset, bucket, path, sha256, state, last_error, updated_at").eq("dataset", filter.dataset);
    if (filter.states) q = q.in("state", filter.states);
    const res = await q.order("path");
    if (res.error) fail("read storage ledger", res.error);
    return (res.data ?? []) as LedgerRow[];
  }

  async ledgerPending(rows: { operation_id: string; dataset: string; bucket: string; path: string; sha256: string }[]) {
    if (!rows.length) return;
    const existing = await this.db.from("demo_storage_ledger").select("path, state").in("path", rows.map((r) => r.path));
    if (existing.error) fail("read storage ledger", existing.error);
    const live = new Set((existing.data ?? []).filter((r) => r.state === "live").map((r) => r.path as string));
    const toWrite = rows.filter((r) => !live.has(r.path)).map((r) => ({ ...r, state: "uploaded_pending", last_error: null, updated_at: new Date().toISOString() }));
    if (!toWrite.length) return;
    const res = await this.db.from("demo_storage_ledger").upsert(toWrite, { onConflict: "bucket,path" });
    if (res.error) fail("record pending uploads", res.error);
  }

  async ledgerSet(bucket: string, paths: string[], patch: { state?: LedgerState; last_error?: string | null }) {
    if (!paths.length) return;
    const res = await this.db.from("demo_storage_ledger").update({ ...patch, updated_at: new Date().toISOString() }).eq("bucket", bucket).in("path", paths);
    if (res.error) fail("update storage ledger", res.error);
  }

  async objectHash(bucket: string, objectPath: string): Promise<string | null> {
    const slash = objectPath.lastIndexOf("/");
    const folder = objectPath.slice(0, slash);
    const name = objectPath.slice(slash + 1);
    const listed = await this.db.storage.from(bucket).list(folder, { search: name, limit: 100 });
    if (listed.error) fail(`list ${bucket}/${folder}`, listed.error);
    if (!(listed.data ?? []).some((o) => o.name === name)) return null;
    const file = await this.db.storage.from(bucket).download(objectPath);
    if (file.error) fail(`download ${bucket}/${objectPath}`, file.error);
    return createHash("sha256").update(Buffer.from(await file.data.arrayBuffer())).digest("hex");
  }

  async upload(bucket: string, objectPath: string, bytes: Uint8Array, contentType: string) {
    const res = await this.db.storage.from(bucket).upload(objectPath, bytes, { contentType, upsert: false, cacheControl: "31536000" });
    if (res.error) fail(`upload ${bucket}/${objectPath}`, res.error);
  }

  async remove(bucket: string, paths: string[]) {
    const res = await this.db.storage.from(bucket).remove(paths);
    if (res.error) return paths.map((p) => ({ path: p, error: res.error.message }));
    return [];
  }

  async applyDemoDataset(dataset: string, operationId: string, payload: unknown) {
    const res = await this.db.rpc("admin_apply_demo_dataset", { p_dataset: dataset, p_operation_id: operationId, p_payload: payload });
    if (res.error) fail("admin_apply_demo_dataset", res.error);
    return res.data as Record<string, unknown>;
  }

  async refreshDemoDates(dataset: string, rows: unknown[]) {
    const res = await this.db.rpc("admin_refresh_demo_open_house_dates", { p_dataset: dataset, p_rows: rows });
    if (res.error) fail("admin_refresh_demo_open_house_dates", res.error);
    return res.data as number;
  }

  async removeDemoDataset(dataset: string) {
    const res = await this.db.rpc("admin_remove_demo_dataset", { p_dataset: dataset });
    if (res.error) fail("admin_remove_demo_dataset", res.error);
    return (res.data ?? []) as { bucket: string; path: string }[];
  }

  async setDemoVisibility(visible: boolean) {
    const res = await this.db.rpc("admin_set_demo_visibility", { p_visible: visible });
    if (res.error) fail("admin_set_demo_visibility", res.error);
  }
}
