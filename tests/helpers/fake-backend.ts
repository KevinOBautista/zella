import { createHash } from "node:crypto";
import type { DataBackend, DatasetSnapshot, LedgerRow, LedgerState } from "@scripts/lib/backend";

type Payload = {
  sellers: Record<string, unknown>[];
  properties: Record<string, unknown>[];
  property_images: { storage_path: string }[] & Record<string, unknown>[];
  open_houses: (Record<string, unknown> & { seed_key: string })[];
};

/** In-memory stand-in for the hosted project, mirroring the RPC semantics in migration 015. */
export class FakeBackend implements DataBackend {
  objects = new Map<string, Uint8Array>();
  ledgerRows = new Map<string, LedgerRow>();
  rows: DatasetSnapshot["rows"] = { sellers: [], properties: [], property_images: [], open_houses: [] };
  visible = false;
  calls: string[] = [];
  failUploadOn = new Set<string>();
  failRemoveOn = new Set<string>();
  failApply = false;
  schemaReady = true;

  private key(bucket: string, path: string) {
    return `${bucket}/${path}`;
  }

  async snapshot(): Promise<DatasetSnapshot> {
    return {
      schemaReady: this.schemaReady,
      visible: this.schemaReady ? this.visible : null,
      rows: structuredClone(this.rows),
      featureSlugs: ["hardwood-floors", "fireplace", "updated-kitchen", "finished-basement", "walk-in-closet", "laundry-room", "garage", "driveway", "backyard", "patio", "deck", "pool", "central-air", "solar", "smart-home-features", "accessibility-features"],
    };
  }

  async ledger(filter: { dataset: string; states?: LedgerState[] }) {
    return [...this.ledgerRows.values()].filter((r) => r.dataset === filter.dataset && (!filter.states || filter.states.includes(r.state)));
  }

  async ledgerPending(rows: { operation_id: string; dataset: string; bucket: string; path: string; sha256: string }[]) {
    this.calls.push(`ledgerPending:${rows.length}`);
    for (const r of rows) {
      const k = this.key(r.bucket, r.path);
      const existing = this.ledgerRows.get(k);
      if (existing?.state === "live") continue;
      this.ledgerRows.set(k, { ...r, state: "uploaded_pending", last_error: null, updated_at: new Date().toISOString() });
    }
  }

  async ledgerSet(bucket: string, paths: string[], patch: { state?: LedgerState; last_error?: string | null }) {
    for (const p of paths) {
      const row = this.ledgerRows.get(this.key(bucket, p));
      if (row) Object.assign(row, patch, { updated_at: new Date().toISOString() });
    }
  }

  async objectHash(bucket: string, path: string) {
    const bytes = this.objects.get(this.key(bucket, path));
    return bytes ? createHash("sha256").update(bytes).digest("hex") : null;
  }

  async upload(bucket: string, path: string, bytes: Uint8Array) {
    this.calls.push(`upload:${path}`);
    if (this.failUploadOn.has(path)) throw new Error("upload failed");
    const k = this.key(bucket, path);
    if (this.objects.has(k)) throw new Error("The resource already exists");
    this.objects.set(k, bytes);
  }

  async remove(bucket: string, paths: string[]) {
    this.calls.push(`remove:${paths.length}`);
    const failures: { path: string; error: string }[] = [];
    for (const p of paths) {
      if (this.failRemoveOn.has(p)) failures.push({ path: p, error: "remove failed" });
      else this.objects.delete(this.key(bucket, p));
    }
    return failures;
  }

  async applyDemoDataset(dataset: string, operationId: string, raw: unknown) {
    this.calls.push("applyDemoDataset");
    if (this.failApply) throw new Error("rpc failed");
    const payload = raw as Payload;
    const paths = new Set(payload.property_images.map((i) => i.storage_path));
    for (const p of paths) {
      const row = this.ledgerRows.get(this.key("property-images", p));
      if (!row || row.dataset !== dataset || !["uploaded_pending", "live"].includes(row.state)) throw new Error(`DEMO_STORAGE_NOT_LEDGERED ${p}`);
    }
    this.rows = structuredClone({ sellers: payload.sellers, properties: payload.properties, property_images: payload.property_images, open_houses: payload.open_houses });
    for (const row of this.ledgerRows.values()) {
      if (row.dataset !== dataset) continue;
      if (paths.has(row.path)) Object.assign(row, { state: "live", operation_id: operationId, last_error: null });
      else if (row.state === "live" || row.state === "uploaded_pending") row.state = "delete_pending";
    }
    return { sellers: payload.sellers.length, properties: payload.properties.length };
  }

  async refreshDemoDates(_dataset: string, rows: unknown[]) {
    this.calls.push("refreshDemoDates");
    let n = 0;
    for (const r of rows as { seed_key: string; starts_at: string; ends_at: string }[]) {
      const oh = this.rows.open_houses.find((o) => o.seed_key === r.seed_key);
      if (!oh) throw new Error(`DEMO_SEED_KEY_NOT_FOUND ${r.seed_key}`);
      Object.assign(oh, { starts_at: r.starts_at, ends_at: r.ends_at });
      n += 1;
    }
    return n;
  }

  async removeDemoDataset(dataset: string) {
    this.calls.push("removeDemoDataset");
    this.rows = { sellers: [], properties: [], property_images: [], open_houses: [] };
    const out: { bucket: string; path: string }[] = [];
    for (const row of this.ledgerRows.values()) {
      if (row.dataset !== dataset || row.state === "deleted") continue;
      row.state = "delete_pending";
      out.push({ bucket: row.bucket, path: row.path });
    }
    return out;
  }

  async setDemoVisibility(visible: boolean) {
    this.calls.push(`setDemoVisibility:${visible}`);
    this.visible = visible;
  }

  mutatingCalls() {
    return this.calls.filter((c) => !c.startsWith("snapshot"));
  }
}
