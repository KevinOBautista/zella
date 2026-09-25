// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  TargetError,
  assertLocalSupabase,
  assertNotInDeployment,
  isLocalSupabaseUrl,
  parseProductionTarget,
  redact,
} from "@scripts/lib/targets";

const REF = "abcdefghijklmnopqrst";
const prodEnv = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${REF}.supabase.co`,
  SUPABASE_SERVICE_ROLE_KEY: "service-secret-value",
  SUPABASE_PROJECT_REF: REF,
};

describe("isLocalSupabaseUrl", () => {
  it.each(["http://127.0.0.1:54321", "http://localhost:54321", "http://host.docker.internal:54321", "http://supabase.localhost"])("accepts %s", (url) => {
    expect(isLocalSupabaseUrl(url)).toBe(true);
  });

  it.each([`https://${REF}.supabase.co`, "https://127.0.0.1.evil.example", "not a url", "", "https://localhost.example.com"])("rejects %s", (url) => {
    expect(isLocalSupabaseUrl(url)).toBe(false);
  });
});

describe("assertLocalSupabase", () => {
  it("refuses a hosted Supabase project", () => {
    expect(() => assertLocalSupabase({ ...prodEnv })).toThrow(TargetError);
    expect(() => assertLocalSupabase({ ...prodEnv })).toThrow(/local Supabase/);
  });

  it("refuses when running inside Vercel or CI even for a local URL", () => {
    expect(() => assertLocalSupabase({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", VERCEL: "1" })).toThrow(/deployment/);
    expect(() => assertLocalSupabase({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", CI: "true" })).toThrow(/deployment/);
  });

  it("returns the local URL", () => {
    expect(assertLocalSupabase({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).toEqual({ url: "http://127.0.0.1:54321" });
  });
});

describe("assertNotInDeployment", () => {
  it.each(["VERCEL", "VERCEL_ENV", "CI", "NOW_BUILDER"])("refuses when %s is set", (key) => {
    expect(() => assertNotInDeployment({ [key]: "1" })).toThrow(TargetError);
  });
});

describe("parseProductionTarget", () => {
  it("requires an explicit production target", () => {
    expect(() => parseProductionTarget([], prodEnv)).toThrow(/--target=production/);
    expect(() => parseProductionTarget(["--target=staging"], prodEnv)).toThrow(/--target=production/);
  });

  it("defaults to a dry run", () => {
    expect(parseProductionTarget(["--target=production"], prodEnv)).toEqual({ url: prodEnv.NEXT_PUBLIC_SUPABASE_URL, projectRef: REF, apply: false });
  });

  it("requires the confirmed project ref to apply", () => {
    expect(() => parseProductionTarget(["--target=production", "--apply"], prodEnv)).toThrow(/--confirm-project/);
    expect(() => parseProductionTarget(["--target=production", "--apply", "--confirm-project=wrong"], prodEnv)).toThrow(/--confirm-project/);
    expect(parseProductionTarget(["--target=production", "--apply", `--confirm-project=${REF}`], prodEnv).apply).toBe(true);
  });

  it("refuses a URL that does not belong to the configured project", () => {
    expect(() => parseProductionTarget(["--target=production"], { ...prodEnv, NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co" })).toThrow(/does not match/);
    expect(() => parseProductionTarget(["--target=production"], { ...prodEnv, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321" })).toThrow(/does not match/);
  });

  it("requires credentials and refuses deployments", () => {
    expect(() => parseProductionTarget(["--target=production"], { ...prodEnv, SUPABASE_SERVICE_ROLE_KEY: "" })).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(() => parseProductionTarget(["--target=production"], { ...prodEnv, SUPABASE_PROJECT_REF: "" })).toThrow(/SUPABASE_PROJECT_REF/);
    expect(() => parseProductionTarget(["--target=production"], { ...prodEnv, VERCEL: "1" })).toThrow(/deployment/);
  });
});

describe("redact", () => {
  it("removes secret values from log text", () => {
    const text = `failed with key service-secret-value at https://${REF}.supabase.co`;
    expect(redact(text, prodEnv)).not.toContain("service-secret-value");
    expect(redact(text, prodEnv)).toContain("[redacted]");
  });
});
