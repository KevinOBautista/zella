import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("publicEnv", () => {
  it("names every missing or blank variable instead of an opaque Zod error", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.resetModules();

    const load = import("@/config/publicEnv");
    await expect(load).rejects.toThrow(/Invalid public environment configuration/);
    await expect(load).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    await expect(load).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it("loads when the required values are present", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    vi.resetModules();

    const { publicEnv } = await import("@/config/publicEnv");
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe("http://127.0.0.1:54321");
  });
});
