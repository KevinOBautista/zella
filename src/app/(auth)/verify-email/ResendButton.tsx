"use client";

import { useActionState } from "react";
import { resendVerificationEmailAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function ResendButton() {
  const [state, formAction, pending] = useActionState(resendVerificationEmailAction, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="secondary" className="w-full" loading={pending}>
        Resend verification email
      </Button>
      {state && "error" in state && (
        <p role="alert" className="text-center text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}
      {state && "success" in state && (
        <p className="text-center text-sm text-[var(--color-accent)]">Verification email sent.</p>
      )}
    </form>
  );
}
