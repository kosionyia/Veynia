"use client";

import { createContext, use, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { icons } from "./icons";

// Kept in sync with SIDEBAR_COOKIE in lib/sidebar.ts (server-only reads it).
const SIDEBAR_COOKIE = "veynia_sidebar";

const Collapsed = createContext<{ collapsed: boolean; toggle: () => void }>({ collapsed: false, toggle: () => {} });

export function useSidebar() {
  return use(Collapsed);
}

/**
 * The signed-in frame: sidebar + page. From lg up the sidebar collapses to
 * icons; the choice is kept in a cookie, so the server renders the right
 * width first time (no jump on load). Children style themselves with the
 * `group-data-collapsed/shell:` variant.
 */
export function Shell({ initialCollapsed, children }: { initialCollapsed: boolean; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  };
  return (
    <Collapsed value={{ collapsed, toggle }}>
      <div
        data-collapsed={collapsed || undefined}
        className="group/shell min-h-screen transition-[grid-template-columns] duration-200 lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:data-collapsed:grid-cols-[76px_minmax(0,1fr)]"
      >
        {children}
      </div>
    </Collapsed>
  );
}

export function CollapseButton({ className }: { className?: string }) {
  const { collapsed, toggle } = useSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink", className)}
    >
      {collapsed ? <icons.panelOpen className="size-[18px]" /> : <icons.panelClose className="size-[18px]" />}
    </button>
  );
}
