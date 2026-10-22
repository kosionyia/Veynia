import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-heading";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <AuthHeading title="Create your account" description="Your first match report is two minutes away.">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-2 text-[13px] text-ink-soft">
          {["3 free reports a month", "No card needed", "Every point explained"].map((perk) => (
            <li key={perk} className="flex items-center gap-1.5">
              <span className="grid size-4 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">✓</span>
              {perk}
            </li>
          ))}
        </ul>
      </AuthHeading>
      <RegisterForm />
    </div>
  );
}
