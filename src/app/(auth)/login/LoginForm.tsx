"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTH_REASON_COPY, isAuthReason, safeNextPath, signupHref } from "@/lib/seller-routing";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), "/account");
  const reasonParam = searchParams.get("reason");
  const reason = isAuthReason(reasonParam) ? reasonParam : undefined;
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {reason && (
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-sm text-[var(--color-accent)] hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state && "error" in state && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={pending}>
        Log in
      </Button>
      <p className="text-center text-sm text-[var(--color-muted)]">
        Don&apos;t have an account?{" "}
        <Link
          href={signupHref({ next: next === "/account" ? undefined : next, reason })}
          className="text-[var(--color-accent)] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
