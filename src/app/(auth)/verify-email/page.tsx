import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ResendButton } from "./ResendButton";

export const metadata: Metadata = { title: "Verify Your Email" };

export default async function VerifyEmailPage() {
  const user = await requireUser();
  if (user.email_confirmed_at) {
    redirect("/account");
  }

  return (
    <div className="text-center">
      <h1 className="mb-2 text-xl font-semibold">Verify your email</h1>
      <p className="mb-6 text-[var(--color-muted)]">
        We sent a confirmation link to <strong>{user.email}</strong>. Click it to unlock saving
        homes, following sellers, and your dashboard.
      </p>
      <ResendButton />
    </div>
  );
}
