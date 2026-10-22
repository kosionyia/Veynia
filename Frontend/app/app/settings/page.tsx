import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LocalDate } from "@/components/app/local-date";
import { PageHeader } from "@/components/app/page-header";
import { getUser } from "@/lib/dal";

import { AppearanceSettings, DeleteAccountForm, PasswordForm, ProfileForm, SetPasswordLink } from "./forms";

export const metadata: Metadata = { title: "Settings" };

function Section({ id, title, description, children, danger }: { id: string; title: string; description: string; children: ReactNode; danger?: boolean }) {
  return (
    <section aria-labelledby={id} className="grid gap-6 rounded-2xl border border-line bg-surface p-6 sm:p-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 id={id} className={danger ? "text-lg font-bold text-missing" : "text-lg font-bold text-ink"}>
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getUser();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Settings" description="Your profile, how Veynia looks, and your account." />

      <Section id="profile" title="Profile" description="How you appear in Veynia.">
        <ProfileForm name={user.full_name} email={user.email} />
      </Section>

      <Section id="appearance" title="Appearance" description="Saved on this device.">
        <AppearanceSettings />
      </Section>

      <Section id="password" title="Password" description={user.has_password ? "Change the password you sign in with." : "Add a password to sign in with."}>
        {user.has_password ? <PasswordForm /> : <SetPasswordLink />}
      </Section>

      <Section id="account" title="Account" description="How you sign in, and your plan.">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          {[
            ["Sign-in", [user.has_password && "Email and password", user.google_linked && "Google"].filter(Boolean).join(" · ")],
            ["Plan", "Free · 3 reports a month"],
            ["Member since", <LocalDate key="joined" iso={user.created_at} />],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-sunken px-4 py-3">
              <dt className="text-xs font-semibold text-muted">{label}</dt>
              <dd className="mt-1 font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="danger" title="Delete account" description="Remove your account and everything in it." danger>
        <DeleteAccountForm hasPassword={user.has_password} />
      </Section>
    </div>
  );
}
