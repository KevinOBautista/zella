"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signUpAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_REASON_COPY, isAuthReason, loginHref, safeNextPath } from "@/lib/seller-routing";

export function SignupForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), "/onboarding/intent");
  const reasonParam = searchParams.get("reason");
  const reason = isAuthReason(reasonParam) ? reasonParam : undefined;
  const [state, formAction, pending] = useActionState(signUpAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {reason && reason !== "sell" && (
        <p
          role="status"
          className="rounded-[var(--radius-sm)] bg-[var(--color-accent-soft)] px-3 py-2 text-sm text-[var(--color-accent)]"
        >
          {AUTH_REASON_COPY[reason]}
        </p>
      )}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state && "error" in state && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}
      <p className="text-xs text-[var(--color-muted)]">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms of Service
        </Link>
        ,{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        , and{" "}
        <Link href="/fair-housing" className="underline">
          Fair Housing Policy
        </Link>
        .
      </p>
      <Button type="submit" className="w-full" loading={pending}>
        Create account
      </Button>
      <p className="text-center text-sm text-[var(--color-muted)]">
        Already have an account?{" "}
        <Link
          href={loginHref({ next: next === "/onboarding/intent" ? undefined : next, reason })}
          className="text-[var(--color-accent)] hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
