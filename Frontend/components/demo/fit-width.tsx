"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lays its child out at least `width` px wide, and on narrower screens scales
 * the whole thing down to fit, like a screenshot. For the product demo, whose
 * layout squeezes badly below its designed width.
 */
export function FitWidth({ width, children }: { width: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ scale: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const scale = Math.min(1, outer.current.clientWidth / width);
      setBox({ scale, height: inner.current.offsetHeight * scale });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (outer.current) observer.observe(outer.current);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, [width]);

  const scaled = box !== null && box.scale < 1;
  return (
    // overflow-hidden: the scaled child still takes its full width in layout.
    <div ref={outer} className="overflow-hidden" style={scaled ? { height: box.height } : undefined}>
      <div
        ref={inner}
        style={scaled ? { width, transform: `scale(${box.scale})`, transformOrigin: "top left" } : undefined}
        // Hidden until measured, so phones never flash the squeezed layout.
        className={box === null ? "invisible" : undefined}
      >
        {children}
      </div>
    </div>
  );
}
