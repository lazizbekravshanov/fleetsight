"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { CommandPalette } from "@/components/dashboard/command-palette";

/* ── Nav Items ───────────────────────────────────────────────────── */

const NAV_SECTIONS = [
  {
    label: "Intelligence",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: DashboardIcon },
      { label: "Search", href: "/", icon: SearchIcon },
      { label: "Bulk Screening", href: "/bulk", icon: BulkIcon },
      { label: "Compare", href: "/compare", icon: CompareIcon },
    ],
  },
  {
    label: "Fleet",
    items: [
      { label: "Fleet Map", href: "/map", icon: MapIcon },
      { label: "Affiliations", href: "/affiliations", icon: AffiliationsIcon },
      { label: "Teams", href: "/teams", icon: TeamsIcon },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Credits", href: "/credits", icon: CreditsIcon },
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
  const initials = user.email?.slice(0, 2).toUpperCase() ?? "FS";

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--surface-0)", color: "var(--ink)" }}>
      <CommandPalette />

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
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-2)]"
            style={{ color: "var(--ink-soft)" }}
          >
            <SignOutIcon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 5h14M3 10h14M3 15h14" />
              </svg>
            </button>

            {/* Sidebar collapse toggle (desktop) */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="hidden lg:flex rounded-lg p-1.5 transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: "var(--ink-muted)" }}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {collapsed ? (
                  <><rect x="1" y="1" width="14" height="14" rx="2" /><path d="M5 1v14" /><path d="M8.5 6.5L11 8l-2.5 1.5" /></>
                ) : (
                  <><rect x="1" y="1" width="14" height="14" rx="2" /><path d="M5 1v14" /><path d="M11 6.5L8.5 8 11 9.5" /></>
                )}
              </svg>
            </button>

            {/* Page title */}
            <h1 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {getPageTitle(pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Cmd+K trigger */}
            <button
              onClick={() => {
                document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
              }}
              className="hidden sm:flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-[var(--surface-2)]"
              style={{ border: "1px solid var(--border)", color: "var(--ink-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="7" r="5" />
                <path d="M14 14l-3.5-3.5" />
              </svg>
              <span>Search</span>
              <kbd className="ml-1 rounded px-1 py-0.5 text-[10px] font-medium" style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}>
                {"\u2318"}K
              </kbd>
            </button>

            {/* Theme toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--surface-2)]"
                style={{ color: "var(--ink-soft)" }}
                aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
              >
                {isDark ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="3.5" />
                    <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13.5 8.5a5.5 5.5 0 1 1-6-6 4.5 4.5 0 0 0 6 6z" />
                  </svg>
                )}
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
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/" || pathname.startsWith("/vehicle")) return "Carrier Search";
  if (pathname === "/bulk") return "Bulk Screening";
  if (pathname === "/compare") return "Compare Carriers";
  if (pathname === "/map") return "Fleet Map";
  if (pathname === "/affiliations") return "Affiliations";
  if (pathname === "/teams") return "Teams";
  if (pathname === "/credits") return "Credits";
  if (pathname === "/onboarding") return "Onboarding";
  return "FleetSight";
}

/* ── Icons ────────────────────────────────────────────────────────── */

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="7" r="5" />
      <path d="M14 14l-3.5-3.5" />
    </svg>
  );
}

function BulkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 8h6M5 5h6M5 11h4" />
    </svg>
  );
}

function CompareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="5" height="10" rx="1" />
      <rect x="10" y="3" width="5" height="10" rx="1" />
      <path d="M8 5v6" />
    </svg>
  );
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1,3 6,1 10,3 15,1 15,13 10,15 6,13 1,15" />
      <line x1="6" y1="1" x2="6" y2="13" />
      <line x1="10" y1="3" x2="10" y2="15" />
    </svg>
  );
}

function AffiliationsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="4" r="2" />
      <circle cx="4" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M8 6v2M6.5 9.5L4.5 10.5M9.5 9.5l2 1" />
    </svg>
  );
}

function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
      <circle cx="11.5" cy="5.5" r="2" />
      <path d="M14.5 14c0-2-1.5-3.5-3-3.5" />
    </svg>
  );
}

function CreditsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v6M5.5 8h5" />
    </svg>
  );
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" />
      <path d="M10 11l3-3-3-3" />
      <path d="M13 8H6" />
    </svg>
  );
}
