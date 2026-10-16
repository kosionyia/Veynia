import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton } from "../google-button";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-semibold text-ink">Create your account</h1>
        <p className="text-muted">Free to start: three match reports a month, no card needed.</p>
      </header>
      <RegisterForm />
      <GoogleButton />
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
