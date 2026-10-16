import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton } from "../google-button";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2.5">
        <h1 className="text-[34px] leading-tight font-bold text-ink">Create your account</h1>
        <p className="text-muted">Your first match report is two minutes away.</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 pt-2 text-[13px] text-ink-soft">
          {["3 free reports a month", "No card needed", "Every point explained"].map((perk) => (
            <li key={perk} className="flex items-center gap-1.5">
              <span className="grid size-4 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">✓</span>
              {perk}
            </li>
          ))}
        </ul>
      </header>
      <div>
        <GoogleButton />
        <RegisterForm />
      </div>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
