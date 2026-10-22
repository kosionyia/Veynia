"use client";

import { useEffect, useRef, type ComponentProps } from "react";

/**
 * A controlled <select> that survives React's form reset. After a form action
 * finishes, React calls form.reset(), which puts every <select> back on its
 * first option; React restores controlled inputs afterwards, but not selects.
 * So we put the value back ourselves when the form fires its reset event.
 */
export function Select({ value, ...props }: ComponentProps<"select"> & { value: string }) {
  const ref = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const select = ref.current;
    const form = select?.form;
    if (!select || !form) return;
    // The reset event fires before the reset happens, so restore just after it.
    const restore = () => queueMicrotask(() => (select.value = value));
    form.addEventListener("reset", restore);
    return () => form.removeEventListener("reset", restore);
  }, [value]);
  return <select ref={ref} value={value} {...props} />;
}
