import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";

import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";

// Outfit for headings and numbers, DM Sans for text: friendly, round, calm.
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Veynia", template: "%s · Veynia" },
  description:
    "See how your CV matches a job before you apply: an explainable score, the gaps, and honest rewrites.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme before React loads.
    <html lang="en" className={`${outfit.variable} ${dmSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
