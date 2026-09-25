/**
 * The narrow set of hosted operations the data scripts need. The real
 * implementation (supabase-backend.ts) uses the service-role client; tests
 * use an in-memory fake so failure paths can be exercised.
 */

export type LedgerState = "uploaded_pending" | "live" | "delete_pending" | "deleted";

export type LedgerRow = {
  operation_id: string;
  dataset: string;
  bucket: string;
  path: string;
  sha256: string | null;
  state: LedgerState;
  last_error: string | null;
  updated_at: string;
};

export type DatasetSnapshot = {
  /** False when migration 015 has not been applied yet. */
  schemaReady: boolean;
  visible: boolean | null;
  rows: Record<"sellers" | "properties" | "property_images" | "open_houses", Record<string, unknown>[]>;
  featureSlugs: string[];
};

export interface DataBackend {
  snapshot(dataset: string): Promise<DatasetSnapshot>;
  ledger(filter: { dataset: string; states?: LedgerState[] }): Promise<LedgerRow[]>;
  /** Records intent before an upload; never downgrades a live row. */
  ledgerPending(rows: { operation_id: string; dataset: string; bucket: string; path: string; sha256: string }[]): Promise<void>;
  ledgerSet(bucket: string, paths: string[], patch: { state?: LedgerState; last_error?: string | null }): Promise<void>;

  /** Returns the sha256 of an existing object, or null when absent. */
  objectHash(bucket: string, path: string): Promise<string | null>;
  /** Must fail if the object already exists (no overwrite). */
  upload(bucket: string, path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Missing objects count as removed. Returns per-path failures. */
  remove(bucket: string, paths: string[]): Promise<{ path: string; error: string }[]>;

  applyDemoDataset(dataset: string, operationId: string, payload: unknown): Promise<Record<string, unknown>>;
  refreshDemoDates(dataset: string, rows: unknown[]): Promise<number>;
  removeDemoDataset(dataset: string): Promise<{ bucket: string; path: string }[]>;
  setDemoVisibility(visible: boolean): Promise<void>;
}
