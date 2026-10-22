import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";
import { Alert } from "@/components/ui/alert";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, { tone: "info" | "success"; text: string }> = {
  expired: { tone: "info", text: "Your session ended. Sign in again to carry on." },
  "password-changed": {
    tone: "info",
    text: "Your password was changed, so you were signed out everywhere. Sign in with the new one.",
  },
  "signed-out": { tone: "success", text: "You've signed out." },
  "account-deleted": { tone: "info", text: "Your account and everything in it has been deleted." },
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");
  const notice = params.reset ? { tone: "success" as const, text: "Password updated. Sign in with your new password." } : NOTICES[one("reason")];

  return (
    <div className="space-y-6">
      <AuthHeading title="Welcome back" description="Sign in to pick up where you left off." />
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <LoginForm next={one("next")} />
    </div>
  );
}
