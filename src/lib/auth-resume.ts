/**
 * After a guest is bounced to /login from a Follow or Save control, we send
 * them back to the exact page they were on with a `resume` marker so the
 * page can invite them to retry the action. The existing follow/save
 * actions are toggles (no idempotent "ensure followed" variant), so the
 * action is not auto-completed — that would risk un-following/un-saving if
 * the state had changed in the meantime. Client-safe, no server imports.
 */
export type ResumeAction = "follow" | "save";

export const RESUME_PARAM = "resume";

export function isResumeAction(value: unknown): value is ResumeAction {
  return value === "follow" || value === "save";
}

/** Current location plus the resume marker; used as the `next` for /login. */
export function resumeHref(action: ResumeAction): string {
  if (typeof window === "undefined") return "/";
  const url = new URL(window.location.href);
  url.searchParams.set(RESUME_PARAM, action);
  return `${url.pathname}${url.search}`;
}

export const RESUME_COPY: Record<ResumeAction, string> = {
  follow: "You're signed in. Tap Follow again to follow this seller.",
  save: "You're signed in. Tap the heart again to save this home.",
};
