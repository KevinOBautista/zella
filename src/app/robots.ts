import type { MetadataRoute } from "next";
import { isFixtureMode } from "@/config/runtime";

export default function robots(): MetadataRoute.Robots {
  if (isFixtureMode) return { rules: { userAgent: "*", disallow: "/" } };
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/account", "/admin", "/onboarding", "/api/", "/auth/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
