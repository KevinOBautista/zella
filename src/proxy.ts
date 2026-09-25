import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/proxy-session";
import { isFixtureMode } from "@/config/runtime";
import { previewRequestGuard } from "@/lib/preview-fixtures/guard";

export async function proxy(request: NextRequest) {
  if (isFixtureMode) {
    // Preview deployments: read-only fixture data, no session, no writes.
    const blocked = previewRequestGuard({ method: request.method, pathname: request.nextUrl.pathname, headers: request.headers });
    if (blocked) return new NextResponse(blocked.body, { status: blocked.status, headers: { "content-type": "text/plain; charset=utf-8" } });
    return NextResponse.next();
  }
  return refreshSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets and image optimization files. Everything else
     * (including API routes) passes through so the session cookie stays
     * fresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)",
  ],
};
