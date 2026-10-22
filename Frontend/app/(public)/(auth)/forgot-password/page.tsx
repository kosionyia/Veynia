import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { BackToSignIn } from "@/components/auth/back-to-sign-in";

import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthHeading title="Forgot your password?" description="Enter your email and we'll send you a link to set a new one." />
      <ForgotForm />
      <BackToSignIn />
    </div>
  );
}
