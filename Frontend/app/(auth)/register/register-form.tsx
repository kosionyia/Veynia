"use client";

import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { register, type FormState } from "../actions";
import { PasswordRules } from "../password-rules";

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(register, {});
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label="Full name"
        name="full_name"
        autoComplete="name"
        required
        defaultValue={state.values?.full_name}
        error={state.fieldErrors?.full_name}
      />
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={state.fieldErrors?.password}
        hint={<PasswordRules password={password} />}
      />
      <SubmitButton className="mt-2 w-full" size="lg" pendingText="Creating your account…">
        Create free account →
      </SubmitButton>
    </form>
  );
}
