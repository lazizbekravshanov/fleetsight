"use client";

/**
 * ToolFeed — chronological tool/thought stream for the agent console.
 *
 * Renders four event kinds:
 *   - thinking: muted prose deltas (the model's running narration)
 *   - tool_call: collapsible card with tool name, summary, duration
 *   - text: the model's final user-facing answer
 *   - error: red callout
 */

import { useState } from "react";
import type { FeedEvent } from "@/lib/agent/use-agent-stream";

export function ToolFeed({
  events,
  sessionId,
  status,
}: {
  events: FeedEvent[];
  sessionId: string | null;
  status?: string;
}) {
  if (events.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center px-6 text-center text-xs"
        style={{ color: "var(--ink-muted)" }}
      >
        Investigator is warming up…
      </div>
    );
  }

  // Mark the LAST thinking event of the most recent run as the "final answer"
  // when the run is no longer running. This avoids the duplicate-text problem
  // (thinking deltas during streaming + a separate text event at the end).
  const lastRunId = events[events.length - 1]?.runId;
  let finalThinkingIndex = -1;
  if (status !== "running" && lastRunId) {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].runId !== lastRunId) break;
      if (events[i].kind === "thinking") {
        finalThinkingIndex = i;
        break;
      }
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {events.map((e, i) => (
        <FeedEntry
          key={`${e.kind}-${i}-${(e as { id?: string }).id ?? i}`}
          event={e}
          sessionId={sessionId}
          isFinalAnswer={i === finalThinkingIndex}
        />
      ))}
    </div>
  );
}

function FeedEntry({
  event,
  sessionId,
  isFinalAnswer,
}: {
  event: FeedEvent;
  sessionId: string | null;
  isFinalAnswer?: boolean;
}) {
  if (event.kind === "thinking") {
    if (isFinalAnswer) {
      // Promote the final thinking block of a completed run to a normal answer style
      return (
        <div
          className="whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-relaxed"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            color: "var(--ink)",
          }}
        >
          {event.text}
        </div>
      );
    }
    return (
      <div
        className="rounded-lg border-l-2 px-3 py-2 text-xs italic"
        style={{
          borderLeftColor: "var(--accent)",
          color: "var(--ink-soft)",
          background: "var(--surface-2)",
        }}
      >
        {event.text}
      </div>
    );
  }

  if (event.kind === "tool_call") {
    return <ToolCallCard event={event} sessionId={sessionId} />;
  }

  if (event.kind === "text") {
    return (
      <div
        className="whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-relaxed"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          color: "var(--ink)",
        }}
      >
        {event.text}
      </div>
    );
  }

  if (event.kind === "error") {
    return (
      <div
        className="rounded-lg border px-3 py-2 text-xs"
        style={{
          borderColor: "#dc2626",
          background: "rgba(220, 38, 38, 0.06)",
          color: "#991b1b",
        }}
      >
        Error: {event.message}
      </div>
    );
  }

  return null;
}

function ToolCallCard({
  event,
  sessionId: _sessionId,
}: {
  event: Extract<FeedEvent, { kind: "tool_call" }>;
  sessionId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<{ input: unknown; output: unknown } | null>(null);
  const [loading, setLoading] = useState(false);

  const inFlight = event.ok === undefined;
  const dotColor = inFlight ? "#d97757" : event.ok ? "#16a34a" : "#dc2626";

  async function loadDetail() {
    if (detail || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/runs/${event.runId}/tool-calls/${event.id}`);
      if (res.ok) {
        const data = await res.json();
        setDetail({ input: data.input, output: data.output });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-lg border text-xs"
      style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
    >
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) loadDetail();
        }}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
            style={{ background: dotColor, boxShadow: inFlight ? `0 0 6px ${dotColor}` : undefined }}
          />
          <code
            className="truncate font-mono text-[11px] font-semibold"
            style={{ color: "var(--ink)" }}
          >
            {event.name}
          </code>
          <span className="truncate" style={{ color: "var(--ink-muted)" }}>
            {event.summary || (inFlight ? "running…" : "")}
          </span>
        </div>
        <span className="flex-shrink-0 text-[10px]" style={{ color: "var(--ink-muted)" }}>
          {event.durationMs !== undefined ? `${event.durationMs}ms` : ""}
        </span>
      </button>
      {open && (
        <div
          className="border-t px-3 py-2 text-[11px]"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="mb-1 font-semibold" style={{ color: "var(--ink-soft)" }}>
            input
          </div>
          <pre
            className="mb-2 overflow-x-auto rounded p-2"
            style={{ background: "var(--surface-2)", color: "var(--ink)" }}
          >
            {JSON.stringify(event.input, null, 2)}
          </pre>
          {loading && <div style={{ color: "var(--ink-muted)" }}>loading output…</div>}
          {detail && (
            <>
              <div className="mb-1 font-semibold" style={{ color: "var(--ink-soft)" }}>
                output
              </div>
              <pre
                className="max-h-64 overflow-auto rounded p-2"
                style={{ background: "var(--surface-2)", color: "var(--ink)" }}
              >
                {JSON.stringify(detail.output, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
