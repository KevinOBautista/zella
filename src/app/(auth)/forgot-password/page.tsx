import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot Password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-2 text-xl font-semibold">Reset your password</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>
      <ForgotPasswordForm />
    </>
  );
}
