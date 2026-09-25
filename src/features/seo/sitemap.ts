import type { MetadataRoute } from "next";

type Listing = { slug: string | null; published_at: string | null; is_demo: boolean | null };
type Seller = { username: string | null; created_at: string | null; is_demo: boolean | null };

const STATIC_PATHS = ["/", "/homes", "/open-houses", "/sellers", "/fair-housing", "/privacy", "/terms", "/contact"];

/**
 * Sitemap entries for real public content only. Demo listings and demo
 * sellers are sample content and are never submitted for indexing.
 */
export function buildSitemapEntries(siteUrl: string, listings: Listing[], sellers: Seller[]): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, "");
  return [
    ...STATIC_PATHS.map((p) => ({ url: `${base}${p === "/" ? "" : p}` || base })),
    ...listings
      .filter((l) => !l.is_demo && l.slug)
      .map((l) => ({ url: `${base}/homes/${l.slug}`, lastModified: l.published_at ?? undefined })),
    ...sellers
      .filter((s) => !s.is_demo && s.username)
      .map((s) => ({ url: `${base}/@${s.username}`, lastModified: s.created_at ?? undefined })),
  ];
}
