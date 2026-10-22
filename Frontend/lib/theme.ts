// Shared by server and client code (no "server-only").

export const THEME_COOKIE = "veynia_theme";
export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

/**
 * Runs in <head> before the page paints: reads the cookie, resolves "system"
 * from the device, and sets <html data-theme="light|dark">. Keeps following the
 * device while "system" is chosen. Plain JS in a string, so it's inlined as is.
 */
export const THEME_SCRIPT = `(() => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    const match = document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/);
    const choice = match ? match[1] : "system";
    const dark = choice === "dark" || (choice === "system" && media.matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  };
  apply();
  media.addEventListener("change", apply);
  window.__applyTheme = apply;
})();`;

/** Saves the choice and applies it straight away (client only). */
export function setTheme(theme: Theme): void {
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
  (window as unknown as { __applyTheme?: () => void }).__applyTheme?.();
}

export function currentTheme(): Theme {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=(light|dark|system)`));
  return (match?.[1] as Theme | undefined) ?? "system";
}
