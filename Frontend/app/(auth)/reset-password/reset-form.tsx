"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

import { resetPassword, type FormState } from "../actions";
import { PasswordRules } from "../password-rules";

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetPassword, {});
  const [password, setPassword] = useState("");
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && (
        <Alert tone="error">
          {state.error}{" "}
          {state.error.includes("Request a new one") && (
            <Link href="/forgot-password" className="font-medium underline">
              Get a new link
            </Link>
          )}
        </Alert>
      )}
      <input type="hidden" name="token" value={token} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={state.fieldErrors?.password}
        hint={<PasswordRules password={password} />}
      />
      <Field
        label="Repeat it"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton className="w-full" size="lg" pendingText="Saving…">
        Set new password
      </SubmitButton>
    </form>
  );
}
