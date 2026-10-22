import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { BackToSignIn } from "@/components/auth/back-to-sign-in";
import { Alert } from "@/components/ui/alert";

import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  return (
    <div className="space-y-6">
      <AuthHeading title="Choose a new password" description="You'll be signed out on other devices once it's changed." />
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
      <BackToSignIn />
    </div>
  );
}
