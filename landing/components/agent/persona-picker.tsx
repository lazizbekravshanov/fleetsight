"use client";

/**
 * PersonaPicker — dropdown in the console header to switch personas mid-session.
 *
 * Switching emits a `persona_switch` agent run that swaps the system prompt
 * and tool subset for the next turn while preserving conversation history.
 */

import { useState, useRef, useEffect } from "react";

export type PersonaOption = {
  id: string;
  label: string;
  description: string;
};

export const USER_PERSONAS: PersonaOption[] = [
  { id: "investigator", label: "Investigator", description: "General-purpose vetting" },
  { id: "chameleon_hunter", label: "Chameleon Hunter", description: "Identity-shift detection" },
  { id: "underwriter", label: "Underwriter", description: "Bondable-risk memos" },
  { id: "market_scout", label: "Market Scout", description: "Carrier discovery & screening" },
];

export function PersonaPicker({
  current,
  onChange,
  disabled,
}: {
  current: string;
  onChange: (personaId: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  const currentOpt = USER_PERSONAS.find((p) => p.id === current) || USER_PERSONAS[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-1)",
          color: "var(--ink)",
        }}
      >
        <span>{currentOpt.label}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border shadow-lg"
          style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
        >
          {USER_PERSONAS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setOpen(false);
                if (p.id !== current) onChange(p.id);
              }}
              className="block w-full px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
            >
              <div className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                {p.label}
                {p.id === current && (
                  <span className="ml-2 text-[10px]" style={{ color: "var(--accent)" }}>
                    active
                  </span>
                )}
              </div>
              <div className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                {p.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
