import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";

import { GoogleButton } from "../google-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, { tone: "info" | "success"; text: string }> = {
  expired: { tone: "info", text: "Your session ended. Sign in again to carry on." },
  "password-changed": {
    tone: "info",
    text: "Your password was changed, so you were signed out everywhere. Sign in with the new one.",
  },
  "signed-out": { tone: "success", text: "You've signed out." },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const notice = params.reset ? { tone: "success" as const, text: "Password updated. Sign in with your new password." } : NOTICES[one("reason")];

  return (
    <div className="space-y-8">
      <header className="space-y-2.5">
        <h1 className="text-[34px] leading-tight font-bold text-ink">Welcome back</h1>
        <p className="text-muted">Sign in to pick up where you left off.</p>
      </header>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <div>
        <GoogleButton />
        <LoginForm next={one("next")} />
      </div>
      <p className="text-sm text-muted">
        New to Veynia?{" "}
        <Link href="/register" className="font-semibold text-brand underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
