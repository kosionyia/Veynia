import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-[0_10px_28px_-12px_var(--color-brand)] hover:brightness-105 hover:shadow-[0_14px_32px_-12px_var(--color-brand)] active:brightness-95",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-sunken/60",
  ghost: "text-ink-soft hover:bg-sunken hover:text-ink",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

type Style = { variant?: Variant; size?: Size };

export function buttonClass({ variant = "primary", size = "md" }: Style = {}, className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & Style) {
  return <button className={buttonClass({ variant, size }, className)} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & Style) {
  return <Link className={buttonClass({ variant, size }, className)} {...props} />;
}
