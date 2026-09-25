import { createHash, randomUUID } from "node:crypto";
import type { DataBackend, LedgerRow } from "../lib/backend";
import { buildDateRefreshRows, buildDemoPayload, demoStoragePath, type DemoPayload } from "./payload";
import { validateDemoDataset, type DemoDataset, type PhotoManifest, type ValidationResult } from "./schema";
import { DEMO_DATASET_ID } from "../../supabase/demo/wny-demo-2026/dataset";

export const DEMO_BUCKET = "property-images";

type Log = (line: string) => void;
type TableName = "sellers" | "properties" | "property_images" | "open_houses";
const TABLES: TableName[] = ["sellers", "properties", "property_images", "open_houses"];

export type TableChanges = { create: string[]; update: { key: string; fields: string[] }[]; unchanged: string[]; remove: string[] };

export type SeedPlan = {
  dataset: string;
  referenceDate: string;
  validation: ValidationResult;
  schemaReady: boolean;
  visibility: "hidden" | "visible" | "unknown";
  changes: Record<TableName, TableChanges>;
  assets: { upload: string[]; reuse: string[]; supersede: string[] };
  blocked: boolean;
  blockers: string[];
};

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  if (typeof a === "string" && typeof b === "string" && /^\d{4}-\d{2}-\d{2}T/.test(a)) {
    const ta = Date.parse(a);
    const tb = Date.parse(b.includes("T") ? b : b.replace(" ", "T"));
    if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta === tb;
  }
  return String(a) === String(b);
}

function diffTable(desired: Record<string, unknown>[], existing: Record<string, unknown>[]): TableChanges {
  const byId = new Map(existing.map((r) => [String(r.id), r]));
  const changes: TableChanges = { create: [], update: [], unchanged: [], remove: [] };
  const keyOf = (r: Record<string, unknown>) => String(r.seed_key ?? r.id);
  for (const row of desired) {
    const current = byId.get(String(row.id));
    if (!current) {
      changes.create.push(keyOf(row));
      continue;
    }
    const fields = Object.keys(row).filter((f) => f !== "id" && !sameValue(row[f], current[f]));
    if (fields.length) changes.update.push({ key: keyOf(row), fields });
    else changes.unchanged.push(keyOf(row));
    byId.delete(String(row.id));
  }
  changes.remove = [...byId.values()].map(keyOf);
  return changes;
}

async function prepare(backend: DataBackend, dataset: DemoDataset, manifest: PhotoManifest, referenceDate: string) {
  const snapshot = await backend.snapshot(DEMO_DATASET_ID);
  const validation = validateDemoDataset(dataset, manifest, {
    requirePhotos: true,
    referenceDate,
    knownFeatureSlugs: snapshot.featureSlugs.length ? snapshot.featureSlugs : undefined,
  });
  const payload = validation.errors.length === 0 || validation.errors.every((e) => /photos of one house/.test(e))
    ? buildDemoPayload(dataset, manifest, referenceDate)
    : null;
  return { snapshot, validation, payload };
}

export async function planDemoSeed(args: { backend: DataBackend; dataset: DemoDataset; manifest: PhotoManifest; referenceDate: string }): Promise<SeedPlan> {
  const { backend, dataset, manifest, referenceDate } = args;
  const { snapshot, validation, payload } = await prepare(backend, dataset, manifest, referenceDate);

  const blockers = [...validation.errors];
  if (!snapshot.schemaReady) blockers.unshift("Migration 20260915000015_demo_content has not been applied to this project yet.");

  const empty: TableChanges = { create: [], update: [], unchanged: [], remove: [] };
  const changes = Object.fromEntries(
    TABLES.map((t) => [t, payload ? diffTable(payload[t] as Record<string, unknown>[], snapshot.rows[t]) : empty]),
  ) as Record<TableName, TableChanges>;

  const assets: SeedPlan["assets"] = { upload: [], reuse: [], supersede: [] };
  if (payload) {
    const live = snapshot.schemaReady ? await backend.ledger({ dataset: DEMO_DATASET_ID, states: ["live", "uploaded_pending"] }) : [];
    const liveByPath = new Map(live.map((r) => [r.path, r]));
    const wanted = new Set(payload.property_images.map((i) => i.storage_path));
    for (const path of wanted) (liveByPath.get(path)?.state === "live" ? assets.reuse : assets.upload).push(path);
    assets.supersede = live.filter((r) => !wanted.has(r.path)).map((r) => r.path);
  }

  return {
    dataset: DEMO_DATASET_ID,
    referenceDate,
    validation,
    schemaReady: snapshot.schemaReady,
    visibility: snapshot.visible === null ? "unknown" : snapshot.visible ? "visible" : "hidden",
    changes,
    assets,
    blocked: blockers.length > 0,
    blockers,
  };
}

async function deleteLedgered(backend: DataBackend, rows: Pick<LedgerRow, "bucket" | "path">[], log: Log) {
  const byBucket = new Map<string, string[]>();
  for (const r of rows) byBucket.set(r.bucket, [...(byBucket.get(r.bucket) ?? []), r.path]);
  const failed: string[] = [];
  let deleted = 0;
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      let failures: { path: string; error: string }[];
      try {
        failures = await backend.remove(bucket, chunk);
      } catch (err) {
        failures = chunk.map((path) => ({ path, error: (err as Error).message }));
      }
      const failedPaths = new Set(failures.map((f) => f.path));
      const ok = chunk.filter((p) => !failedPaths.has(p));
      if (ok.length) await backend.ledgerSet(bucket, ok, { state: "deleted", last_error: null });
      for (const f of failures) {
        await backend.ledgerSet(bucket, [f.path], { state: "delete_pending", last_error: f.error });
        log(`  ! could not delete ${bucket}/${f.path}: ${f.error} (kept in ledger for retry)`);
        failed.push(f.path);
      }
      deleted += ok.length;
    }
  }
  return { deleted, failed };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function applyDemoSeed(args: {
  backend: DataBackend;
  dataset: DemoDataset;
  manifest: PhotoManifest;
  referenceDate: string;
  readImage: (file: string) => Promise<Uint8Array>;
  log: Log;
  operationId?: string;
}) {
  const { backend, dataset, manifest, referenceDate, readImage, log } = args;
  const plan = await planDemoSeed({ backend, dataset, manifest, referenceDate });
  if (plan.blocked) throw new Error(`Demo seed is blocked:\n- ${plan.blockers.join("\n- ")}`);
  const payload = buildDemoPayload(dataset, manifest, referenceDate) as DemoPayload;
  const operationId = args.operationId ?? randomUUID();

  // Verify every local file before touching storage.
  const uploads: { path: string; bytes: Uint8Array; sha256: string }[] = [];
  const toReuse = new Set(plan.assets.reuse);
  for (const img of manifest.images) {
    const path = demoStoragePath(img);
    if (toReuse.has(path)) continue;
    const bytes = await readImage(img.file);
    if (sha256(bytes) !== img.sha256) throw new Error(`Local file ${img.file} does not match its manifest sha256; re-run the importer.`);
    uploads.push({ path, bytes, sha256: img.sha256 });
  }

  const created: string[] = [];
  const adopt: typeof uploads = [];
  const fresh: typeof uploads = [];
  for (const u of uploads) {
    const existingHash = await backend.objectHash(DEMO_BUCKET, u.path);
    if (existingHash === null) fresh.push(u);
    else if (existingHash === u.sha256) adopt.push(u);
    else throw new Error(`Storage object ${u.path} already exists with different content; refusing to overwrite.`);
  }

  // Intent is recorded before any upload so a crash leaves a retryable trace.
  await backend.ledgerPending(
    [...adopt, ...fresh].map((u) => ({ operation_id: operationId, dataset: DEMO_DATASET_ID, bucket: DEMO_BUCKET, path: u.path, sha256: u.sha256 })),
  );
  for (const u of fresh) {
    try {
      await backend.upload(DEMO_BUCKET, u.path, u.bytes, "image/webp");
      created.push(u.path);
    } catch (err) {
      await backend.ledgerSet(DEMO_BUCKET, [u.path], { last_error: (err as Error).message });
      throw new Error(`Upload failed for ${u.path}: ${(err as Error).message}. No database rows were changed; run demo:storage-retry to clean up.`);
    }
  }
  log(`  uploaded ${created.length}, reused ${adopt.length + toReuse.size}`);

  let summary: Record<string, unknown>;
  try {
    summary = await backend.applyDemoDataset(DEMO_DATASET_ID, operationId, payload);
  } catch (err) {
    log(`  database transaction failed; removing ${created.length} objects created by this run`);
    await backend.ledgerSet(DEMO_BUCKET, created, { state: "delete_pending" });
    await deleteLedgered(backend, created.map((path) => ({ bucket: DEMO_BUCKET, path })), log);
    throw err;
  }

  const superseded = await backend.ledger({ dataset: DEMO_DATASET_ID, states: ["delete_pending"] });
  const cleanup = await deleteLedgered(backend, superseded, log);
  return { operationId, summary, uploaded: created.length, supersededDeleted: cleanup.deleted, supersededFailed: cleanup.failed };
}

export async function refreshDemoDates(args: { backend: DataBackend; dataset: DemoDataset; referenceDate: string; apply: boolean }) {
  const rows = buildDateRefreshRows(args.dataset, args.referenceDate);
  const updated = args.apply ? await args.backend.refreshDemoDates(DEMO_DATASET_ID, rows) : 0;
  return { rows, updated };
}

export async function setDemoVisibility(args: { backend: DataBackend; visible: boolean; apply: boolean }) {
  if (!args.apply) return { changed: false };
  await args.backend.setDemoVisibility(args.visible);
  return { changed: true };
}

export async function removeDemoDataset(args: { backend: DataBackend; datasetId: string; apply: boolean; log: Log }) {
  const { backend, datasetId, apply, log } = args;
  if (!apply) {
    const snapshot = await backend.snapshot(datasetId);
    const ledger = snapshot.schemaReady ? await backend.ledger({ dataset: datasetId }) : [];
    return {
      rowsRemoved: false,
      wouldRemove: Object.fromEntries(TABLES.map((t) => [t, snapshot.rows[t].length])),
      storagePaths: ledger.filter((r) => r.state !== "deleted").map((r) => r.path),
      failed: [] as string[],
    };
  }
  const paths = await backend.removeDemoDataset(datasetId);
  log(`  removed dataset rows; deleting ${paths.length} storage objects`);
  const result = await deleteLedgered(backend, paths, log);
  return { rowsRemoved: true, wouldRemove: {}, storagePaths: paths.map((p) => p.path), failed: result.failed };
}

/**
 * Finishes interrupted storage work: deletes objects marked delete_pending
 * and uploads that never became live (older than olderThanMs, so a seed that
 * is still running is left alone).
 */
export async function retryDemoStorage(args: { backend: DataBackend; datasetId: string; apply: boolean; olderThanMs: number; log: Log; now?: Date }) {
  const { backend, datasetId, apply, olderThanMs, log } = args;
  const now = (args.now ?? new Date()).getTime();
  const rows = await backend.ledger({ dataset: datasetId, states: ["delete_pending", "uploaded_pending"] });
  const ready = rows.filter((r) => r.state === "delete_pending" || now - Date.parse(r.updated_at) >= olderThanMs);
  const skippedRecent = rows.length - ready.length;
  if (!apply) return { deleted: 0, pending: ready.map((r) => r.path), skippedRecent, failed: [] as string[] };
  const stale = ready.filter((r) => r.state === "uploaded_pending");
  if (stale.length) await backend.ledgerSet(DEMO_BUCKET, stale.map((r) => r.path), { state: "delete_pending" });
  const result = await deleteLedgered(backend, ready, log);
  return { deleted: result.deleted, pending: [] as string[], skippedRecent, failed: result.failed };
}
