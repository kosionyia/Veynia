import type { Metadata } from "next";
import Link from "next/link";

import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-[34px] leading-tight font-bold text-ink">Forgot your password?</h1>
        <p className="text-muted">Enter your email and we&apos;ll send you a link to set a new one.</p>
      </header>
      <ForgotForm />
      <p className="text-sm text-muted">
        <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
          ← Back to sign in
        </Link>
      </p>
    </div>
  );
}
