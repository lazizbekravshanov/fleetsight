"use client";

import { useState, useRef, type KeyboardEvent } from "react";

export function AgentInput({
  disabled,
  onSend,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t px-3 py-3" style={{ borderColor: "var(--border)" }}>
      <div
        className="flex items-end gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        <textarea
          ref={ref}
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            const t = e.target;
            t.style.height = "auto";
            t.style.height = Math.min(t.scrollHeight, 160) + "px";
          }}
          onKeyDown={onKeyDown}
          placeholder={disabled ? "Investigator is working…" : "Ask the investigator about this carrier…"}
          className="flex-1 resize-none bg-transparent text-sm leading-relaxed focus:outline-none"
          style={{ color: "var(--ink)" }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-30"
          style={{ background: "var(--accent)" }}
          title="Send (Enter)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-center text-[10px]" style={{ color: "var(--ink-muted)" }}>
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
