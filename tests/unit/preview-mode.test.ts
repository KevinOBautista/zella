// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { resolveDataMode, resolveSiteUrl } from "@/config/runtime";
import { createFixtureClient } from "@/lib/preview-fixtures/client";
import { previewRequestGuard } from "@/lib/preview-fixtures/guard";
import type { FixtureData } from "@/lib/preview-fixtures/types";

describe("resolveDataMode", () => {
  it("forces fixtures on Vercel preview deployments regardless of other settings", () => {
    expect(resolveDataMode({ VERCEL_ENV: "preview" })).toBe("fixtures");
    expect(resolveDataMode({ VERCEL_ENV: "preview", NEXT_PUBLIC_DATA_MODE: "supabase" })).toBe("fixtures");
  });

  it("uses Supabase in production and by default", () => {
    expect(resolveDataMode({ VERCEL_ENV: "production" })).toBe("supabase");
    expect(resolveDataMode({})).toBe("supabase");
  });

  it("allows opting into fixtures locally", () => {
    expect(resolveDataMode({ NEXT_PUBLIC_DATA_MODE: "fixtures" })).toBe("fixtures");
  });
});

describe("resolveSiteUrl", () => {
  it("uses an explicit NEXT_PUBLIC_SITE_URL without a trailing slash", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://zella.example/" })).toBe("https://zella.example");
  });

  it("treats an empty or blank value as unset and falls back to the Vercel production domain", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "", VERCEL_PROJECT_PRODUCTION_URL: "zella.vercel.app", VERCEL_URL: "zella-abc123.vercel.app" })).toBe("https://zella.vercel.app");
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "  ", VERCEL_PROJECT_PRODUCTION_URL: "zella.vercel.app" })).toBe("https://zella.vercel.app");
  });

  it("falls back to the deployment URL, then to undefined", () => {
    expect(resolveSiteUrl({ VERCEL_URL: "zella-abc123.vercel.app" })).toBe("https://zella-abc123.vercel.app");
    expect(resolveSiteUrl({})).toBeUndefined();
  });

  it("skips a value that is not a valid URL instead of passing it through", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "zella.example", VERCEL_URL: "zella-abc123.vercel.app" })).toBe("https://zella-abc123.vercel.app");
  });
});

const data: FixtureData = {
  generatedFor: "2026-09-16",
  tables: {
    public_properties: [
      { id: "a", slug: "a", city: "Buffalo", display_line: "Buffalo, NY 14222", listing_status: "for_sale", asking_price_cents: 300, published_at: "2026-09-10T00:00:00Z", is_demo: true, bedrooms: 3 },
      { id: "b", slug: "b", city: "Kenmore", display_line: "Kenmore, NY 14217", listing_status: "coming_soon", asking_price_cents: null, published_at: "2026-09-12T00:00:00Z", is_demo: true, bedrooms: 2 },
      { id: "c", slug: "c", city: "Hamburg", display_line: "Hamburg, NY 14075", listing_status: "for_sale", asking_price_cents: 100, published_at: "2026-09-11T00:00:00Z", is_demo: true, bedrooms: 4 },
    ],
    public_open_houses: [{ id: "oh", property_id: "a", ends_at: "2999-01-01T00:00:00Z", starts_at: "2998-12-31T00:00:00Z" }],
  },
};

describe("fixture client", () => {
  const client = createFixtureClient(data);

  it("filters, orders, counts and pages like PostgREST", async () => {
    const res = await client
      .from("public_properties")
      .select("id, city", { count: "exact" })
      .in("listing_status", ["for_sale", "coming_soon"])
      .gte("bedrooms", 3)
      .order("published_at", { ascending: false })
      .range(0, 0);
    expect(res.error).toBeNull();
    expect(res.count).toBe(2);
    expect(res.data).toEqual([{ id: "c", city: "Hamburg" }]);
  });

  it("supports or/ilike search and nulls-last ordering", async () => {
    const search = await client.from("public_properties").select("id").or("city.ilike.%KEN%,display_line.ilike.%ken%");
    expect(search.data).toEqual([{ id: "b" }]);
    const byPrice = await client.from("public_properties").select("id").order("asking_price_cents", { ascending: true, nullsFirst: false });
    expect((byPrice.data as { id: string }[]).map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("returns single rows and head counts", async () => {
    const one = await client.from("public_properties").select("*").eq("slug", "b").maybeSingle();
    expect((one.data as { id: string }).id).toBe("b");
    const none = await client.from("public_properties").select("*").eq("slug", "zzz").maybeSingle();
    expect(none.data).toBeNull();
    const head = await client.from("public_properties").select("id", { count: "exact", head: true }).eq("is_demo", true);
    expect(head).toMatchObject({ data: null, count: 3 });
    const upcoming = await client.from("public_open_houses").select("*").gt("ends_at", new Date().toISOString());
    expect(upcoming.data).toHaveLength(1);
  });

  it("has no signed-in user and refuses every write, RPC, storage and auth call", async () => {
    expect((await client.auth.getUser()).data.user).toBeNull();
    expect(() => client.from("property_saves").insert({})).toThrow(/preview/i);
    expect(() => client.from("public_properties").update({})).toThrow(/preview/i);
    expect(() => client.from("public_properties").delete()).toThrow(/preview/i);
    expect(() => client.from("public_properties").upsert({})).toThrow(/preview/i);
    expect(() => client.rpc("check_rate_limit")).toThrow(/preview/i);
    expect(() => client.storage.from("property-images")).toThrow(/preview/i);
    await expect(client.auth.signInWithPassword({ email: "a", password: "b" })).rejects.toThrow(/preview/i);
  });

  it("returns nothing for private tables", async () => {
    const res = await client.from("property_saves").select("property_id").eq("user_id", "x");
    expect(res.data).toEqual([]);
  });
});

describe("previewRequestGuard", () => {
  const req = (method: string, path: string, headers: Record<string, string> = {}) => ({ method, pathname: path, headers: new Headers(headers) });

  it("lets page and asset reads through", () => {
    expect(previewRequestGuard(req("GET", "/homes"))).toBeNull();
    expect(previewRequestGuard(req("HEAD", "/"))).toBeNull();
  });

  it("blocks server actions, form posts and API routes", () => {
    expect(previewRequestGuard(req("POST", "/homes/demo-x", { "next-action": "abc" }))?.status).toBe(403);
    expect(previewRequestGuard(req("POST", "/login"))?.status).toBe(403);
    expect(previewRequestGuard(req("GET", "/api/uploads/sign"))?.status).toBe(403);
    expect(previewRequestGuard(req("PUT", "/api/uploads/process"))?.status).toBe(403);
    expect(previewRequestGuard(req("GET", "/auth/confirm?token=x"))?.status).toBe(403);
  });
});
