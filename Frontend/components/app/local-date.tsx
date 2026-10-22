"use client";

/**
 * A UTC timestamp shown as a date in the viewer's own timezone. The server
 * doesn't know that timezone, so its render may differ by a day; the browser's
 * render wins without a hydration warning.
 */
export function LocalDate({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
    </time>
  );
}
