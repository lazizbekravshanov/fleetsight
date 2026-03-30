"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Command = {
  id: string;
  label: string;
  description?: string;
  action: () => void;
  icon: React.ReactNode;
  group: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const commands: Command[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      description: "Return to dashboard overview",
      action: () => router.push("/dashboard"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
          <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
          <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
        </svg>
      ),
      group: "Navigation",
    },
    {
      id: "carrier-lookup",
      label: "Search Carriers",
      description: "Look up carriers by USDOT or name",
      action: () => router.push("/"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="7" cy="7" r="5" />
          <path d="M14 14l-3.5-3.5" />
        </svg>
      ),
      group: "Navigation",
    },
    {
      id: "bulk",
      label: "Bulk Screening",
      description: "Screen up to 50 carriers at once",
      action: () => router.push("/bulk"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="12" height="12" rx="2" />
          <path d="M5 8h6M5 5h6M5 11h4" />
        </svg>
      ),
      group: "Navigation",
    },
    {
      id: "compare",
      label: "Compare Carriers",
      description: "Side-by-side carrier analysis",
      action: () => router.push("/compare"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="5" height="10" rx="1" />
          <rect x="10" y="3" width="5" height="10" rx="1" />
          <path d="M8 5v6" />
        </svg>
      ),
      group: "Navigation",
    },
    {
      id: "map",
      label: "Fleet Map",
      description: "View carriers and crashes on map",
      action: () => router.push("/map"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="1,3 6,1 10,3 15,1 15,13 10,15 6,13 1,15" />
          <line x1="6" y1="1" x2="6" y2="13" />
          <line x1="10" y1="3" x2="10" y2="15" />
        </svg>
      ),
      group: "Navigation",
    },
    {
      id: "teams",
      label: "Teams",
      description: "Manage your team workspace",
      action: () => router.push("/teams"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="5" r="2.5" />
          <path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
          <circle cx="11.5" cy="5.5" r="2" />
          <path d="M14.5 14c0-2-1.5-3.5-3-3.5" />
        </svg>
      ),
      group: "Navigation",
    },
    {
      id: "credits",
      label: "Credits",
      description: "Buy AI credits",
      action: () => router.push("/credits"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v6M5.5 8h5" />
        </svg>
      ),
      group: "Account",
    },
    {
      id: "sign-out",
      label: "Sign Out",
      description: "Sign out of your account",
      action: () => router.push("/login"),
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" />
          <path d="M10 11l3-3-3-3" />
          <path d="M13 8H6" />
        </svg>
      ),
      group: "Account",
    },
  ];

  const filtered = query
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setQuery("");
        setActiveIndex(0);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    },
    [open]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = flatFiltered[activeIndex];
      if (cmd) {
        cmd.action();
        setOpen(false);
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg animate-fade-in-scale rounded-xl shadow-2xl" style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-muted)" }}>
            <circle cx="7" cy="7" r="5" />
            <path d="M14 14l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--ink)", }}
          />
          <kbd className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: "var(--surface-2)", color: "var(--ink-muted)", border: "1px solid var(--border)" }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2">
          {flatFiltered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--ink-muted)" }}>
              No results found.
            </p>
          )}
          {Object.entries(grouped).map(([group, cmds]) => (
            <div key={group}>
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>
                {group}
              </p>
              {cmds.map((cmd) => {
                const idx = flatFiltered.indexOf(cmd);
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors`}
                    style={{
                      background: idx === activeIndex ? "var(--accent-soft)" : undefined,
                      color: idx === activeIndex ? "var(--accent)" : "var(--ink-soft)",
                    }}
                  >
                    <span className="shrink-0" style={{ color: "var(--ink-muted)" }}>{cmd.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium" style={{ color: idx === activeIndex ? "var(--ink)" : undefined }}>{cmd.label}</p>
                      {cmd.description && (
                        <p className="truncate text-xs" style={{ color: "var(--ink-muted)" }}>{cmd.description}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 text-[10px]" style={{ borderTop: "1px solid var(--border)", color: "var(--ink-muted)" }}>
          <span className="flex items-center gap-1">
            <kbd className="rounded px-1 py-0.5 font-medium" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>&uarr;</kbd>
            <kbd className="rounded px-1 py-0.5 font-medium" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>&darr;</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded px-1 py-0.5 font-medium" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>&crarr;</kbd>
            Select
          </span>
        </div>
      </div>
    </div>
  );
}
