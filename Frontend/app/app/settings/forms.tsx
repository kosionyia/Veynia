"use client";

import { useActionState, useState, useSyncExternalStore, useTransition } from "react";

import { PasswordRules } from "@/app/(public)/(auth)/password-rules";
import { useSidebar } from "@/components/app/shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { currentTheme, setTheme, type Theme } from "@/lib/theme";

import { changePassword, deleteAccount, sendPasswordLink, updateProfile, type SettingsState } from "./actions";

function Notice({ state }: { state: SettingsState }) {
  if (state.error) return <Alert tone="error">{state.error}</Alert>;
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <Notice state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" name="full_name" autoComplete="name" maxLength={100} required defaultValue={state.values?.full_name ?? name} error={state.fieldErrors?.full_name} />
        <Field label="Email" name="email" type="email" value={email} readOnly disabled hint="Changing your email isn't possible yet." />
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}

// The theme lives in a cookie the server never needs, so read it after hydration.
const subscribe = () => () => {};

function Choice<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string; hint: string }[]; value: T | null; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors",
            value === option.value ? "border-brand bg-brand-soft ring-4 ring-brand/10" : "border-line bg-surface hover:border-line-strong",
          )}
        >
          <span className="block text-sm font-semibold text-ink">{option.label}</span>
          <span className="mt-0.5 block text-xs text-muted">{option.hint}</span>
        </button>
      ))}
    </div>
  );
}

const THEME_OPTIONS: { value: Theme; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Bright and airy" },
  { value: "dark", label: "Dark", hint: "Easier at night" },
  { value: "system", label: "Match my device", hint: "Follows your phone or computer" },
];

export function AppearanceSettings() {
  // null until hydrated, so the server render doesn't guess the cookie.
  const saved = useSyncExternalStore(subscribe, currentTheme, () => null);
  const [picked, setPicked] = useState<Theme | null>(null);
  const theme = picked ?? saved;
  const { collapsed, toggle } = useSidebar();

  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <p className="text-[13px] font-semibold text-ink-soft">Theme</p>
        <Choice
          label="Theme"
          options={THEME_OPTIONS}
          value={theme}
          onChange={(value) => {
            setTheme(value);
            setPicked(value);
          }}
        />
      </div>
      <div className="hidden space-y-2.5 lg:block">
        <p className="text-[13px] font-semibold text-ink-soft">Sidebar</p>
        <Choice
          label="Sidebar"
          options={[
            { value: "expanded", label: "Expanded", hint: "Icons and names" },
            { value: "collapsed", label: "Collapsed", hint: "Icons only, more room" },
          ]}
          value={collapsed ? "collapsed" : "expanded"}
          onChange={(value) => (value === "collapsed") !== collapsed && toggle()}
        />
      </div>
    </div>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<SettingsState, FormData>(changePassword, {});
  const [password, setPassword] = useState("");
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <Notice state={state} />
      <Field label="Current password" name="current_password" type="password" autoComplete="current-password" required error={e.current_password} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="New password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={e.new_password}
          hint={<PasswordRules password={password} />}
        />
        <Field label="Repeat the new password" name="confirm" type="password" autoComplete="new-password" required error={e.confirm} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-4">
        <p className="text-sm text-muted">You&apos;ll stay signed in here. Other devices get signed out.</p>
        <SubmitButton pendingText="Changing…">Change password</SubmitButton>
      </div>
    </form>
  );
}

export function SetPasswordLink() {
  const [state, setState] = useState<SettingsState>({});
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-4">
      <Notice state={state} />
      <p className="text-sm text-muted">
        You sign in with Google, so you don&apos;t have a password yet. To add one, we&apos;ll email you a link: that proves the address
        is yours.
      </p>
      <Button variant="secondary" disabled={pending} onClick={() => startTransition(async () => setState(await sendPasswordLink()))}>
        {pending ? "Sending…" : "Email me a link to set a password"}
      </Button>
    </div>
  );
}

export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<SettingsState, FormData>(deleteAccount, {});
  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete my account
      </Button>
    );
  }
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-missing/30 bg-missing-soft p-5" noValidate>
      <p className="text-sm font-semibold text-ink">
        This deletes your account, CVs, jobs, match reports and applications for good. It can&apos;t be undone.
      </p>
      <Notice state={state} />
      {hasPassword ? (
        <Field label="Type your password to confirm" name="confirm" type="password" autoComplete="current-password" required />
      ) : (
        <Field label="Type your email to confirm" name="confirm" type="email" autoComplete="off" required />
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <SubmitButton variant="danger" pendingText="Deleting…">
          Delete everything
        </SubmitButton>
      </div>
    </form>
  );
}
