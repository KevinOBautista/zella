// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  applyDemoSeed,
  planDemoSeed,
  refreshDemoDates,
  removeDemoDataset,
  retryDemoStorage,
  setDemoVisibility,
} from "@scripts/demo/operations";
import { demoStoragePath } from "@scripts/demo/payload";
import type { PhotoManifest } from "@scripts/demo/schema";
import { demoDataset, DEMO_DATASET_ID } from "../../supabase/demo/wny-demo-2026/dataset";
import { FakeBackend } from "@tests/helpers/fake-backend";
import { fullManifest } from "@tests/helpers/demo-manifest";

const REF = "2026-09-16";
const BUCKET = "property-images";

/** A manifest whose sha256 values match the bytes readImage returns. */
function realisticManifest(): { manifest: PhotoManifest; files: Map<string, Uint8Array> } {
  const manifest = fullManifest(demoDataset);
  const files = new Map<string, Uint8Array>();
  for (const img of manifest.images) {
    const bytes = new TextEncoder().encode(`image:${img.file}`);
    img.sha256 = createHash("sha256").update(bytes).digest("hex");
    files.set(img.file, bytes);
  }
  return { manifest, files };
}

describe("demo seed operations", () => {
  let backend: FakeBackend;
  let manifest: PhotoManifest;
  let files: Map<string, Uint8Array>;
  const readImage = async (file: string) => files.get(file)!;
  const logs: string[] = [];
  const log = (line: string) => logs.push(line);

  beforeEach(() => {
    backend = new FakeBackend();
    ({ manifest, files } = realisticManifest());
    logs.length = 0;
  });

  it("plans without mutating anything", async () => {
    const plan = await planDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF });
    expect(backend.mutatingCalls()).toEqual([]);
    expect(plan.blocked).toBe(false);
    expect(plan.changes.properties.create).toHaveLength(8);
    expect(plan.assets.upload).toHaveLength(48);
    expect(plan.visibility).toBe("hidden");
  });

  it("reports the photo gate as a blocker and refuses to apply", async () => {
    const plan = await planDemoSeed({ backend, dataset: demoDataset, manifest: { images: [] }, referenceDate: REF });
    expect(plan.blocked).toBe(true);
    expect(plan.blockers.join("\n")).toMatch(/at least 5 photos/);
    await expect(applyDemoSeed({ backend, dataset: demoDataset, manifest: { images: [] }, referenceDate: REF, readImage, log })).rejects.toThrow(/blocked/);
    expect(backend.mutatingCalls()).toEqual([]);
  });

  it("reports a pending migration instead of failing", async () => {
    backend.schemaReady = false;
    const plan = await planDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF });
    expect(plan.blocked).toBe(true);
    expect(plan.blockers.join("\n")).toMatch(/migration/i);
  });

  it("uploads, applies, and is idempotent", async () => {
    await applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log });
    expect(backend.objects.size).toBe(48);
    expect([...backend.ledgerRows.values()].every((r) => r.state === "live")).toBe(true);
    expect(backend.rows.properties).toHaveLength(8);

    backend.calls.length = 0;
    const plan = await planDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF });
    expect(plan.changes.properties.unchanged).toHaveLength(8);
    expect(plan.assets.upload).toHaveLength(0);

    await applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log });
    expect(backend.calls.filter((c) => c.startsWith("upload:"))).toEqual([]);
    expect(backend.objects.size).toBe(48);
  });

  it("never overwrites an existing object and reuses one with matching content", async () => {
    const img = manifest.images[0]!;
    backend.objects.set(`${BUCKET}/${demoStoragePath(img)}`, files.get(img.file)!);
    await applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log });
    expect(backend.calls).not.toContain(`upload:${demoStoragePath(img)}`);
  });

  it("refuses to adopt an existing object with different content", async () => {
    const img = manifest.images[0]!;
    backend.objects.set(`${BUCKET}/${demoStoragePath(img)}`, new TextEncoder().encode("something else"));
    await expect(applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log })).rejects.toThrow(/different content/);
    expect(backend.calls).not.toContain("applyDemoDataset");
  });

  it("refuses local files that do not match the manifest hash", async () => {
    files.set(manifest.images[3]!.file, new TextEncoder().encode("tampered"));
    await expect(applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log })).rejects.toThrow(/sha256/);
    expect(backend.calls.filter((c) => c.startsWith("upload:"))).toEqual([]);
  });

  it("leaves a retryable ledger when an upload fails and never touches rows", async () => {
    backend.failUploadOn.add(demoStoragePath(manifest.images[10]!));
    await expect(applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log })).rejects.toThrow(/upload/);
    expect(backend.calls).not.toContain("applyDemoDataset");
    expect(backend.rows.properties).toHaveLength(0);
    const pending = await backend.ledger({ dataset: DEMO_DATASET_ID, states: ["uploaded_pending"] });
    expect(pending.length).toBeGreaterThan(0);

    const result = await retryDemoStorage({ backend, datasetId: DEMO_DATASET_ID, apply: true, olderThanMs: 0, log });
    expect(result.deleted).toBeGreaterThan(0);
    expect(backend.objects.size).toBe(0);
    expect(await backend.ledger({ dataset: DEMO_DATASET_ID, states: ["uploaded_pending", "delete_pending"] })).toEqual([]);
  });

  it("removes objects it created when the database transaction fails", async () => {
    // One object already live from an earlier run must survive.
    const first = manifest.images[0]!;
    const firstPath = demoStoragePath(first);
    backend.objects.set(`${BUCKET}/${firstPath}`, files.get(first.file)!);
    backend.ledgerRows.set(`${BUCKET}/${firstPath}`, {
      operation_id: "old", dataset: DEMO_DATASET_ID, bucket: BUCKET, path: firstPath, sha256: first.sha256, state: "live", last_error: null, updated_at: "",
    });
    backend.failApply = true;
    await expect(applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log })).rejects.toThrow(/rpc failed/);
    expect([...backend.objects.keys()]).toEqual([`${BUCKET}/${firstPath}`]);
    expect(backend.ledgerRows.get(`${BUCKET}/${firstPath}`)!.state).toBe("live");
    expect([...backend.ledgerRows.values()].filter((r) => r.state === "deleted")).toHaveLength(47);
  });

  it("keeps failed rollback deletions in the ledger for retry", async () => {
    backend.failApply = true;
    backend.failRemoveOn.add(demoStoragePath(manifest.images[5]!));
    await expect(applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log })).rejects.toThrow();
    const stuck = await backend.ledger({ dataset: DEMO_DATASET_ID, states: ["delete_pending"] });
    expect(stuck.map((r) => r.path)).toEqual([demoStoragePath(manifest.images[5]!)]);
    expect(stuck[0]!.last_error).toMatch(/remove failed/);
  });

  it("deletes superseded photos only after the new rows are committed", async () => {
    await applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log });
    const old = manifest.images[1]!;
    const oldPath = demoStoragePath(old);
    const replacement = new TextEncoder().encode("new living room photo");
    files.set(old.file, replacement);
    old.sha256 = createHash("sha256").update(replacement).digest("hex");

    await applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log });
    expect(backend.objects.has(`${BUCKET}/${oldPath}`)).toBe(false);
    expect(backend.ledgerRows.get(`${BUCKET}/${oldPath}`)!.state).toBe("deleted");
    expect(backend.objects.has(`${BUCKET}/${demoStoragePath(old)}`)).toBe(true);
  });

  it("refreshes dates only when applied", async () => {
    await applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log });
    const dry = await refreshDemoDates({ backend, dataset: demoDataset, referenceDate: "2026-10-05", apply: false });
    expect(dry.updated).toBe(0);
    expect(dry.rows).toHaveLength(4);
    expect(backend.calls).not.toContain("refreshDemoDates");
    const applied = await refreshDemoDates({ backend, dataset: demoDataset, referenceDate: "2026-10-05", apply: true });
    expect(applied.updated).toBe(4);
    expect(backend.rows.open_houses[0]!.starts_at).toBe("2026-10-06T21:00:00.000Z");
  });

  it("toggles visibility only when applied", async () => {
    expect((await setDemoVisibility({ backend, visible: true, apply: false })).changed).toBe(false);
    expect(backend.visible).toBe(false);
    expect((await setDemoVisibility({ backend, visible: true, apply: true })).changed).toBe(true);
    expect(backend.visible).toBe(true);
  });

  it("removes the dataset and its objects, retrying failed deletions later", async () => {
    await applyDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate: REF, readImage, log });
    backend.objects.set(`${BUCKET}/some-real-property/photo.webp`, new Uint8Array([1]));
    const stubborn = demoStoragePath(manifest.images[7]!);
    backend.failRemoveOn.add(stubborn);

    const dry = await removeDemoDataset({ backend, datasetId: DEMO_DATASET_ID, apply: false, log });
    expect(dry.rowsRemoved).toBe(false);
    expect(backend.rows.properties).toHaveLength(8);

    const result = await removeDemoDataset({ backend, datasetId: DEMO_DATASET_ID, apply: true, log });
    expect(result.failed).toEqual([stubborn]);
    expect(backend.rows.properties).toHaveLength(0);
    expect(backend.objects.has(`${BUCKET}/some-real-property/photo.webp`)).toBe(true);

    backend.failRemoveOn.clear();
    const retry = await retryDemoStorage({ backend, datasetId: DEMO_DATASET_ID, apply: true, olderThanMs: 0, log });
    expect(retry.deleted).toBe(1);
    expect([...backend.objects.keys()]).toEqual([`${BUCKET}/some-real-property/photo.webp`]);
  });

  it("does not delete another operation's fresh uploads during retry", async () => {
    await backend.ledgerPending([{ operation_id: "x", dataset: DEMO_DATASET_ID, bucket: BUCKET, path: "demo/x.webp", sha256: "0" }]);
    const res = await retryDemoStorage({ backend, datasetId: DEMO_DATASET_ID, apply: true, olderThanMs: 10 * 60_000, log });
    expect(res.deleted).toBe(0);
    expect(res.skippedRecent).toBe(1);
  });
});
