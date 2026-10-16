"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { login, type FormState } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next} />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.username}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
        aside={
          <Link href="/forgot-password" className="text-sm text-muted underline-offset-4 hover:text-brand hover:underline">
            Forgot password?
          </Link>
        }
      />
      <SubmitButton className="mt-2 w-full" size="lg" pendingText="Signing in…">
        Sign in →
      </SubmitButton>
    </form>
  );
}
