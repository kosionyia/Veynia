"use client";

import { useActionState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { forgotPassword, type FormState } from "../actions";

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(forgotPassword, {});
  if (state.success) {
    return (
      <Alert tone="success">
        {state.success} The link works for a limited time; check your spam folder if it hasn&apos;t arrived.
      </Alert>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <SubmitButton className="w-full" size="lg" pendingText="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}
