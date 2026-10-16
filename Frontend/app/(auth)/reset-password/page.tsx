import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";

import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-[34px] leading-tight font-bold text-ink">Choose a new password</h1>
        <p className="text-muted">You&apos;ll be signed out on other devices once it&apos;s changed.</p>
      </header>
      {typeof token === "string" && token ? (
        <ResetForm token={token} />
      ) : (
        <Alert tone="error">
          This link is missing its reset code.{" "}
          <Link href="/forgot-password" className="font-medium underline">
            Request a new link
          </Link>
          .
        </Alert>
      )}
    </div>
  );
}
