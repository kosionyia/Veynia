"use client";

import Script from "next/script";
import { useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";

import { googleLogin } from "./actions";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

type GoogleId = {
  initialize(options: { client_id: string; callback: (r: { credential: string }) => void }): void;
  renderButton(el: HTMLElement, options: Record<string, unknown>): void;
};

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

// Google Identity Services renders its own button; we hand the ID token it
// returns to FastAPI (via a server action), which verifies it.
// Hidden unless NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
export function GoogleButton() {
  const slot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>();

  if (!CLIENT_ID) return null;

  function render() {
    const id = window.google?.accounts.id;
    if (!id || !slot.current) return;
    id.initialize({
      client_id: CLIENT_ID!,
      callback: async ({ credential }) => {
        const result = await googleLogin(credential);
        if (result?.error) setError(result.error);
      },
    });
    id.renderButton(slot.current, { theme: "outline", size: "large", shape: "pill", width: 384, text: "continue_with" });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      <div ref={slot} className="flex justify-center" />
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={render} />
    </div>
  );
}
