"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RESUME_COPY, RESUME_PARAM, isResumeAction } from "@/lib/auth-resume";

/**
 * After a guest signs in from a Follow/Save prompt they land back on the
 * same page with `?resume=follow|save`. Show the retry invitation once and
 * strip the marker so a reload doesn't repeat it. Must be wrapped in
 * <Suspense> (useSearchParams).
 */
export function AuthResumeNotice() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const shown = useRef(false);
  const action = params.get(RESUME_PARAM);

  useEffect(() => {
    if (!isResumeAction(action) || shown.current) return;
    shown.current = true;
    toast(RESUME_COPY[action]);
    const next = new URLSearchParams(params.toString());
    next.delete(RESUME_PARAM);
    const qs = next.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [action, params, pathname, router]);

  return null;
}
