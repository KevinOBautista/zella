import type { NextConfig } from "next";
import { resolveDataMode, resolveSiteUrl } from "./src/config/runtime";

// Vercel previews are forced into read-only fixture mode: no Supabase URL or
// keys are inlined, allowed by CSP, or used for images (docs/architecture.md).
const dataMode = resolveDataMode(process.env);
const fixtureMode = dataMode === "fixtures";
const siteUrl = resolveSiteUrl(process.env);

const supabaseHost = (() => {
  if (fixtureMode) return "";
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").host;
  } catch {
    return "";
  }
})();

const supabaseSources = supabaseHost ? `https://${supabaseHost}` : "";
const supabaseSockets = supabaseHost ? `wss://${supabaseHost}` : "";

// Content-Security-Policy is intentionally assembled as one string so every
// allowance below is visible in one place. See docs/architecture.md for why each
// host is here before adding more.
//
// 'unsafe-eval' and the ws://localhost connect-src entry are dev-only: React's
// dev mode uses eval() to reconstruct component stacks, and Next's dev
// overlay talks to the Turbopack HMR server over a plain ws:// socket on the
// same origin. Neither is present in a production build.
const isDev = process.env.NODE_ENV === "development";
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://challenges.cloudflare.com`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${supabaseSources} https://images.unsplash.com`,
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseSources} ${supabaseSockets} https://challenges.cloudflare.com ${isDev ? "ws://localhost:* http://localhost:*" : ""}`,
  `frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://player.vimeo.com`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
]
  .map((directive) => directive.replace(/\s+/g, " ").trim())
  .join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_DATA_MODE: dataMode,
    ...(siteUrl ? { NEXT_PUBLIC_SITE_URL: siteUrl } : {}),
    ...(fixtureMode ? { NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "" } : {}),
  },
  images: {
    remotePatterns: [
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost }]
        : []),
      { protocol: "https" as const, hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      // /@username can't be a literal App Router folder (that syntax is
      // reserved for parallel routes), so it's rewritten to /u/[username].
      // All internal links and canonicals still use /@username.
      { source: "/@:username", destination: "/u/:username" },
    ];
  },
};

export default nextConfig;
