"use client";

/**
 * Memo — markdown narrative artifact with citation chips.
 *
 * Lightweight markdown rendering: paragraphs, **bold**, *italic*, lists,
 * inline code. No external markdown lib — keeps the bundle small.
 */

import type { ArtifactItem } from "@/lib/agent/use-agent-stream";

type MemoPayload = {
  body_md: string;
  citations: string[];
};

export function Memo({ artifact }: { artifact: ArtifactItem }) {
  const payload = artifact.payload as MemoPayload;
  if (!payload || typeof payload !== "object") return null;

  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span
          className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
          style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}
        >
          memo
        </span>
        {artifact.title && (
          <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {artifact.title}
          </h3>
        )}
      </div>

      <div className="prose-sm space-y-2 text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
        {renderMarkdown(payload.body_md)}
      </div>

      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(payload.body_md)}
        className="mt-4 rounded px-2 py-1 text-[11px] transition-colors hover:opacity-70"
        style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}
      >
        Copy memo
      </button>

      {payload.citations && payload.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          {payload.citations.map((id) => (
            <code
              key={id}
              className="rounded px-1.5 py-0.5 font-mono text-[10px]"
              style={{ background: "var(--surface-2)", color: "var(--ink-muted)" }}
              title="Tool call citation"
            >
              {id.slice(0, 12)}…
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Heading
    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const sizes = ["text-base", "text-sm", "text-sm"];
      return (
        <p key={i} className={`font-semibold ${sizes[level - 1]}`} style={{ color: "var(--ink)" }}>
          {h[2]}
        </p>
      );
    }

    // List
    if (/^[-*]\s/m.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^[-*]\s/.test(l.trim()));
      return (
        <ul key={i} className="ml-4 list-disc space-y-1">
          {items.map((line, j) => (
            <li key={j}>{renderInline(line.replace(/^[-*]\s/, "").trim())}</li>
          ))}
        </ul>
      );
    }

    // Numbered list
    if (/^\d+\.\s/m.test(trimmed)) {
      const items = trimmed.split("\n").filter((l) => /^\d+\.\s/.test(l.trim()));
      return (
        <ol key={i} className="ml-4 list-decimal space-y-1">
          {items.map((line, j) => (
            <li key={j}>{renderInline(line.replace(/^\d+\.\s/, "").trim())}</li>
          ))}
        </ol>
      );
    }

    return <p key={i}>{renderInline(trimmed)}</p>;
  });
}

function renderInline(text: string): React.ReactNode {
  // Bold **x**, italic *x*, inline code `x`
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) parts.push(<code key={key++} className="rounded bg-[var(--surface-2)] px-1 font-mono text-[12px]">{tok.slice(1, -1)}</code>);
    else parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    lastIdx = m.index + tok.length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}
