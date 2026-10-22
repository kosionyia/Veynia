import Link from "next/link";

export function BackToSignIn() {
  return (
    <p className="text-center text-sm">
      <Link href="/login" className="font-semibold text-muted underline-offset-4 hover:text-brand hover:underline">
        ← Back to sign in
      </Link>
    </p>
  );
}
