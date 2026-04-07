"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  Search, FileStack, BarChart3,
  Map, Network, Users, LogOut, LogIn,
  Menu, PanelLeftClose, PanelLeftOpen,
  Sun, Moon,
} from "lucide-react";

/* ── Nav Items ───────────────────────────────────────────────────── */

const NAV_SECTIONS = [
  {
    label: "Intelligence",
    items: [
      { label: "Search", href: "/", icon: Search },
      { label: "Bulk Screening", href: "/bulk", icon: FileStack },
      { label: "Compare", href: "/compare", icon: BarChart3 },
    ],
  },
  {
    label: "Fleet",
    items: [
      { label: "Fleet Map", href: "/map", icon: Map },
      { label: "Affiliations", href: "/affiliations", icon: Network },
      { label: "Teams", href: "/teams", icon: Users },
    ],
  },
];

/* ── Shell ────────────────────────────────────────────────────────── */

export function AppShell({
  user,
  children,
}: {
  user: { email?: string | null; name?: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isFullViewport = pathname === "/map";

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isDark = theme === "dark";
  const isAnonymous = !user.email;
  const initials = user.email?.slice(0, 2).toUpperCase() ?? "FS";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-0)", color: "var(--ink)" }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-200 ease-out lg:relative lg:z-auto
          ${collapsed ? "w-16" : "w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 px-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white text-xs font-bold">
            FS
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
              FleetSight
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5 scrollbar-hide">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`
                        group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors
                        ${active
                          ? "text-accent"
                          : "hover:bg-[var(--surface-2)]"
                        }
                      `}
                      style={{
                        background: active ? "var(--accent-soft)" : undefined,
                        color: active ? undefined : "var(--ink-soft)",
                      }}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-accent-soft0" />
                      )}
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="shrink-0 p-2 space-y-1" style={{ borderTop: "1px solid var(--border)" }}>
          {isAnonymous ? (
            <Link
              href="/login"
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--ink-soft)" }}
            >
              <LogIn className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign In</span>}
            </Link>
          ) : (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--ink-soft)" }}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header
          className="flex h-14 shrink-0 items-center justify-between gap-4 px-4 sm:px-6"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-0)" }}
        >
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--ink-soft)" }}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Sidebar collapse toggle (desktop) */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden lg:flex rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--ink-muted)" }}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            {/* Page title */}
            <h1 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {getPageTitle(pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--ink-soft)" }}
                aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}

            {/* User avatar */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white bg-accent"
              title={user.email ?? "User"}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Content */}
        <main
          className={`flex-1 overflow-y-auto ${
            isFullViewport ? "" : "px-4 py-6 sm:px-8 sm:py-8"
          }`}
          style={{ background: "var(--surface-0)" }}
        >
          {!isFullViewport ? (
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function getPageTitle(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/vehicle")) return "Carrier Search";
  if (pathname === "/bulk") return "Bulk Screening";
  if (pathname === "/compare") return "Compare Carriers";
  if (pathname === "/map") return "Fleet Map";
  if (pathname === "/affiliations") return "Affiliations";
  if (pathname === "/teams") return "Teams";
  if (pathname === "/onboarding") return "Onboarding";
  return "FleetSight";
}
