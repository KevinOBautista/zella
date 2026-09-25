import { PREVIEW_READ_ONLY_MESSAGE } from "@/config/runtime";

/**
 * In fixture mode every request that could change state is refused before it
 * reaches a route or server action: non-GET/HEAD requests (server actions are
 * POSTs), API routes, and the auth callback.
 */
export function previewRequestGuard(req: { method: string; pathname: string; headers: Headers }): { status: number; body: string } | null {
  const readOnlyMethod = req.method === "GET" || req.method === "HEAD";
  const blockedPath = req.pathname.startsWith("/api/") || req.pathname.startsWith("/auth/");
  if (readOnlyMethod && !blockedPath && !req.headers.has("next-action")) return null;
  return { status: 403, body: PREVIEW_READ_ONLY_MESSAGE };
}
