import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { orThrow } from "@/lib/supabase/read";
import { isFixtureMode } from "@/config/runtime";
import { buildSitemapEntries } from "@/features/seo/sitemap";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Preview deployments are never indexed.
  if (isFixtureMode) return [];
  const supabase = await createClient();
  const [listings, sellers] = await Promise.all([
    supabase.from("public_properties").select("slug, published_at, is_demo").eq("is_demo", false).limit(5000),
    supabase.from("public_seller_profiles").select("username, created_at, is_demo").eq("is_demo", false).limit(5000),
  ]);
  return buildSitemapEntries(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000", orThrow("sitemap listings", listings) ?? [], orThrow("sitemap sellers", sellers) ?? []);
}
