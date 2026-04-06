"use client";

/**
 * CarrierConsole — the agent-first carrier surface.
 *
 * Two-column layout:
 *   Left: tool feed (thinking + tool calls + final answers + input)
 *   Right: artifacts pane (decision card, memos, evidence lists)
 *
 * On mount, fires an `auto_brief` agent run that produces the opening verdict.
 * User typing afterwards continues the conversation in the same AgentSession.
 */

import { useEffect, useRef, useState } from "react";
import { useAgentStream } from "@/lib/agent/use-agent-stream";
import { ToolFeed } from "./tool-feed";
import { AgentInput } from "./agent-input";
import { ArtifactRenderer } from "./artifact-renderer";
import { PersonaPicker } from "./persona-picker";

export function CarrierConsole({ dotNumber }: { dotNumber: string }) {
  const { events, artifacts, sessionId, status, error, sendMessage } = useAgentStream({
    carrierDotNumber: dotNumber,
  });
  const [persona, setPersona] = useState<string>("investigator");

  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    sendMessage({ kind: "auto_brief", carrierDotNumber: dotNumber });
  }, [dotNumber, sendMessage]);

  function handlePersonaChange(next: string) {
    setPersona(next);
    sendMessage({ kind: "persona_switch", carrierDotNumber: dotNumber, persona: next });
  }

  return (
    <div
      className="grid gap-3 p-3 sm:p-4"
      style={{
        height: "calc(100vh - 64px)",
        gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.2fr)",
      }}
    >
      {/* LEFT: tool feed + input */}
      <section
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        <ConsoleHeader
          dotNumber={dotNumber}
          status={status}
          error={error}
          persona={persona}
          onPersonaChange={handlePersonaChange}
        />
        <div className="flex-1 overflow-y-auto">
          <ToolFeed events={events} sessionId={sessionId} status={status} />
        </div>
        <AgentInput
          disabled={status === "running"}
          onSend={(text) =>
            sendMessage({ kind: "user_turn", carrierDotNumber: dotNumber, message: text })
          }
        />
      </section>

      {/* RIGHT: artifact pane */}
      <section
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
      >
        <header
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            Findings
          </h2>
          <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
            {artifacts.length} artifact{artifacts.length === 1 ? "" : "s"}
          </span>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {artifacts.length === 0 ? (
            <EmptyArtifacts status={status} />
          ) : (
            artifacts.map((a) => <ArtifactRenderer key={a.id} artifact={a} />)
          )}
        </div>
      </section>
    </div>
  );
}

function ConsoleHeader({
  dotNumber,
  status,
  error,
  persona,
  onPersonaChange,
}: {
  dotNumber: string;
  status: string;
  error: string | null;
  persona: string;
  onPersonaChange: (id: string) => void;
}) {
  return (
    <header
      className="flex items-center justify-between border-b px-4 py-3"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
          style={{ background: "var(--accent)" }}
        >
          AI
        </div>
        <div>
          <h1 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            FleetSight Agent
          </h1>
          <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
            DOT {dotNumber} • {statusLabel(status, error)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PersonaPicker current={persona} onChange={onPersonaChange} disabled={status === "running"} />
        <StatusDot status={status} error={error} />
      </div>
    </header>
  );
}

function statusLabel(status: string, error: string | null): string {
  if (error) return "error";
  if (status === "running") return "investigating…";
  if (status === "idle") return "ready";
  return status;
}

function StatusDot({ status, error }: { status: string; error: string | null }) {
  let color = "#94a3b8";
  if (error) color = "#dc2626";
  else if (status === "running") color = "#d97757";
  else if (status === "idle") color = "#16a34a";
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ background: color, boxShadow: status === "running" ? `0 0 8px ${color}` : undefined }}
      aria-label={statusLabel(status, error)}
    />
  );
}

function EmptyArtifacts({ status }: { status: string }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 text-center"
      style={{ color: "var(--ink-muted)" }}
    >
      <div className="text-3xl">⌬</div>
      <p className="text-sm font-medium">
        {status === "running" ? "Investigation in progress…" : "Findings will appear here"}
      </p>
      <p className="text-xs">The agent is fetching FMCSA data, scoring trust, and looking for chameleon signals.</p>
    </div>
  );
}
