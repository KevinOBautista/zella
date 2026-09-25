/**
 * Production demo content commands. Every command is a dry run unless it is
 * given --target=production --confirm-project=<ref> --apply.
 *
 *   npm run demo:plan            -- --target=production [--reference-date=YYYY-MM-DD]
 *   npm run demo:seed            -- --target=production [--reference-date=…] [--confirm-project=<ref> --apply]
 *   npm run demo:refresh-dates   -- --target=production --reference-date=YYYY-MM-DD [--confirm-project=<ref> --apply]
 *   npm run demo:visibility      -- --target=production --show|--hide [--confirm-project=<ref> --apply]
 *   npm run demo:remove          -- --target=production [--confirm-project=<ref> --apply]
 *   npm run demo:storage-retry   -- --target=production [--confirm-project=<ref> --apply]
 *
 * Credentials come from .env.production-ops.local (or --env-file=…).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_OPERATOR_ENV_FILE, envFileFlag, loadEnvFile, ROOT } from "../lib/env";
import { parseProductionTarget, redact, TargetError, type Env } from "../lib/targets";
import { createServiceClient, SupabaseBackend } from "../lib/supabase-backend";
import { demoDataset, DEMO_DATASET_ID } from "../../supabase/demo/wny-demo-2026/dataset";
import { photoManifestSchema } from "./schema";
import { todayInZone } from "./dates";
import { applyDemoSeed, planDemoSeed, refreshDemoDates, removeDemoDataset, retryDemoStorage, setDemoVisibility, type SeedPlan } from "./operations";

const DEMO_DIR = path.join(ROOT, "supabase/demo", DEMO_DATASET_ID);

function arg(argv: string[], name: string) {
  return argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function loadManifest() {
  const raw = JSON.parse(await readFile(path.join(DEMO_DIR, "images/manifest.json"), "utf8"));
  return photoManifestSchema.parse(raw);
}

function printPlan(plan: SeedPlan) {
  console.log(`Dataset:        ${plan.dataset}`);
  console.log(`Reference date: ${plan.referenceDate} (America/New_York)`);
  console.log(`Schema ready:   ${plan.schemaReady ? "yes" : "NO — migration 015 not applied"}`);
  console.log(`Public demos:   ${plan.visibility}`);
  console.log("");
  for (const [table, c] of Object.entries(plan.changes)) {
    console.log(`${table.padEnd(16)} create ${c.create.length}  update ${c.update.length}  unchanged ${c.unchanged.length}  remove ${c.remove.length}`);
    for (const k of c.create) console.log(`  + ${k}`);
    for (const u of c.update) console.log(`  ~ ${u.key} (${u.fields.join(", ")})`);
    for (const k of c.remove) console.log(`  - ${k}`);
  }
  console.log("");
  console.log(`storage          upload ${plan.assets.upload.length}  reuse ${plan.assets.reuse.length}  superseded ${plan.assets.supersede.length}`);
  if (plan.validation.groupLabels.length) console.log(`open-house groups on the reference date: ${plan.validation.groupLabels.join(", ")}`);
  for (const w of plan.validation.warnings) console.log(`warning: ${w}`);
  if (plan.validation.photoGaps.length) {
    console.log("\nPhoto galleries incomplete:");
    for (const g of plan.validation.photoGaps) {
      console.log(`  ${g.propertyKey}: ${g.photoCount} distinct photo(s)${g.missingRooms.length ? `, missing ${g.missingRooms.join(", ")}` : ""}`);
    }
  }
  if (plan.blocked) {
    console.log("\nBLOCKED — nothing can be applied until these are resolved:");
    for (const b of plan.blockers) console.log(`  - ${b}`);
  }
}

async function main(argv: string[]) {
  const command = argv[0];
  const flags = argv.slice(1);
  const env: Env = loadEnvFile(envFileFlag(flags) ?? DEFAULT_OPERATOR_ENV_FILE);
  const target = parseProductionTarget(flags, env);
  const backend = new SupabaseBackend(createServiceClient(target.url, env.SUPABASE_SERVICE_ROLE_KEY!));
  const referenceDate = arg(flags, "reference-date") ?? todayInZone(new Date());
  const mode = target.apply ? "APPLY" : "DRY RUN";
  console.log(`[${mode}] ${command} → project ${target.projectRef}\n`);

  switch (command) {
    case "plan": {
      printPlan(await planDemoSeed({ backend, dataset: demoDataset, manifest: await loadManifest(), referenceDate }));
      return;
    }
    case "seed": {
      const manifest = await loadManifest();
      const plan = await planDemoSeed({ backend, dataset: demoDataset, manifest, referenceDate });
      printPlan(plan);
      if (!target.apply || plan.blocked) {
        if (!plan.blocked) console.log("\nDry run only. Re-run with --confirm-project=<ref> --apply to seed.");
        process.exitCode = plan.blocked ? 2 : 0;
        return;
      }
      const result = await applyDemoSeed({
        backend,
        dataset: demoDataset,
        manifest,
        referenceDate,
        readImage: async (file) => new Uint8Array(await readFile(path.join(DEMO_DIR, "images", file))),
        log: console.log,
      });
      console.log(`\nSeeded (operation ${result.operationId}):`, result.summary);
      if (result.supersededFailed.length) console.log("Some superseded objects could not be deleted; run demo:storage-retry.");
      console.log("Demo visibility is unchanged. Review the hidden demo, then run demo:visibility --show.");
      return;
    }
    case "refresh-dates": {
      if (!arg(flags, "reference-date")) throw new TargetError("refresh-dates needs an explicit --reference-date=YYYY-MM-DD.");
      const res = await refreshDemoDates({ backend, dataset: demoDataset, referenceDate, apply: target.apply });
      for (const r of res.rows) console.log(`  ${r.seed_key.padEnd(26)} ${r.starts_at} → ${r.ends_at}`);
      console.log(target.apply ? `\nUpdated ${res.updated} demo open houses.` : "\nDry run only; nothing changed.");
      return;
    }
    case "visibility": {
      const show = flags.includes("--show");
      const hide = flags.includes("--hide");
      if (show === hide) throw new TargetError("Pass exactly one of --show or --hide.");
      const snapshot = await backend.snapshot(DEMO_DATASET_ID);
      console.log(`Currently: ${snapshot.visible === null ? "unknown (migration pending)" : snapshot.visible ? "visible" : "hidden"}`);
      const res = await setDemoVisibility({ backend, visible: show, apply: target.apply });
      console.log(res.changed ? `Public demo content is now ${show ? "visible" : "hidden"}.` : `Dry run: would set public demo content to ${show ? "visible" : "hidden"}.`);
      return;
    }
    case "remove": {
      const res = await removeDemoDataset({ backend, datasetId: DEMO_DATASET_ID, apply: target.apply, log: console.log });
      if (!target.apply) {
        console.log("Would remove rows:", res.wouldRemove);
        console.log(`Would delete ${res.storagePaths.length} storage objects:`);
        for (const p of res.storagePaths) console.log(`  - ${p}`);
        return;
      }
      console.log(`Removed dataset ${DEMO_DATASET_ID}. Storage failures: ${res.failed.length} (retry with demo:storage-retry).`);
      return;
    }
    case "storage-retry": {
      const res = await retryDemoStorage({ backend, datasetId: DEMO_DATASET_ID, apply: target.apply, olderThanMs: 10 * 60_000, log: console.log });
      if (!target.apply) {
        console.log(`Would delete ${res.pending.length} objects; skipped ${res.skippedRecent} recent uploads.`);
        for (const p of res.pending) console.log(`  - ${p}`);
      } else {
        console.log(`Deleted ${res.deleted}; failed ${res.failed.length}; skipped ${res.skippedRecent} recent uploads.`);
      }
      return;
    }
    default:
      throw new TargetError(`Unknown command "${command}". Use plan, seed, refresh-dates, visibility, remove or storage-retry.`);
  }
}

main(process.argv.slice(2)).catch((err: unknown) => {
  let envForRedaction: Env = {};
  try {
    envForRedaction = loadEnvFile(envFileFlag(process.argv) ?? DEFAULT_OPERATOR_ENV_FILE);
  } catch {
    // nothing to redact
  }
  console.error(redact(err instanceof Error ? err.message : String(err), envForRedaction));
  process.exitCode = 1;
});
