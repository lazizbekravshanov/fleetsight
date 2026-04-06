/**
 * useAgentStream — client hook for the FleetSight agent.
 *
 * Why not EventSource? EventSource cannot POST and cannot send a runId for
 * resume. We use fetch() with a streaming body reader and parse SSE frames
 * manually. The wire format is identical to the SSE pattern in
 * /api/alerts/stream so the mental model stays consistent.
 *
 * Returned state:
 *   - events[]   chronological tool feed (thinking + tool calls + final text)
 *   - artifacts[]  rendered artifacts in the right pane
 *   - sessionId  current AgentSession (assigned on first run)
 *   - status     "idle" | "running" | "error"
 *   - sendMessage(opts) start a new run (auto_brief or user_turn)
 *   - error      last error message if any
 */

"use client";

import { useState, useRef, useCallback } from "react";

export type FeedEvent =
  | { kind: "thinking"; runId: string; text: string; ts: number }
  | { kind: "tool_call"; runId: string; id: string; name: string; input: unknown; ok?: boolean; summary?: string; durationMs?: number; ts: number }
  | { kind: "text"; runId: string; text: string; ts: number }
  | { kind: "error"; runId: string; message: string; ts: number };

export type ArtifactItem = {
  id: string;
  type: string;
  title?: string;
  payload: unknown;
  runId: string;
  ts: number;
};

type Status = "idle" | "running" | "error";

export type SendOptions =
  | { kind: "auto_brief"; carrierDotNumber: string }
  | { kind: "user_turn"; carrierDotNumber: string | null; message: string }
  | { kind: "persona_switch"; carrierDotNumber: string | null; persona: string };

export function useAgentStream(initial?: { carrierDotNumber?: string | null }) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const carrierRef = useRef<string | null>(initial?.carrierDotNumber ?? null);

  const sendMessage = useCallback(
    async (opts: SendOptions) => {
      // Abort any in-flight stream first
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;

      setStatus("running");
      setError(null);

      const dot = "carrierDotNumber" in opts ? opts.carrierDotNumber : carrierRef.current;
      carrierRef.current = dot;

      const body: Record<string, unknown> = {
        sessionId: sessionId || undefined,
        carrierDotNumber: dot,
        kind: opts.kind,
      };
      if (opts.kind === "user_turn") body.message = opts.message;
      if (opts.kind === "persona_switch") body.persona = opts.persona;

      let res: Response;
      try {
        res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abort.signal,
        });
      } catch (e) {
        if (abort.signal.aborted) return;
        const msg = e instanceof Error ? e.message : "Network error";
        setError(msg);
        setStatus("error");
        return;
      }

      if (!res.ok) {
        const msg = `HTTP ${res.status}`;
        setError(msg);
        setStatus("error");
        return;
      }
      if (!res.body) {
        setError("No response body");
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentRunId: string = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE frames: each frame ends with a blank line.
          // Each frame is `event: name\ndata: jsonpayload\n`.
          let blankIdx = buffer.indexOf("\n\n");
          while (blankIdx !== -1) {
            const frame = buffer.slice(0, blankIdx);
            buffer = buffer.slice(blankIdx + 2);
            const parsed = parseFrame(frame);
            if (parsed) {
              const { event, data } = parsed;
              switch (event) {
                case "run_start": {
                  currentRunId = (data as { runId: string }).runId;
                  setSessionId((data as { sessionId: string }).sessionId);
                  break;
                }
                case "thinking":
                  setEvents((prev) => appendThinking(prev, currentRunId, (data as { text: string }).text));
                  break;
                case "tool_call_start": {
                  const d = data as { id: string; name: string; input: unknown };
                  setEvents((prev) => [
                    ...prev,
                    { kind: "tool_call", runId: currentRunId, id: d.id, name: d.name, input: d.input, ts: Date.now() },
                  ]);
                  break;
                }
                case "tool_call_end": {
                  const d = data as { id: string; ok: boolean; summary: string; durationMs: number };
                  setEvents((prev) =>
                    prev.map((e) =>
                      e.kind === "tool_call" && e.id === d.id
                        ? { ...e, ok: d.ok, summary: d.summary, durationMs: d.durationMs }
                        : e
                    )
                  );
                  break;
                }
                case "text":
                  setEvents((prev) => [
                    ...prev,
                    { kind: "text", runId: currentRunId, text: (data as { text: string }).text, ts: Date.now() },
                  ]);
                  break;
                case "artifact": {
                  const d = data as { id: string; artifactType: string; title?: string; payload: unknown };
                  setArtifacts((prev) => [
                    ...prev,
                    { id: d.id, type: d.artifactType, title: d.title, payload: d.payload, runId: currentRunId, ts: Date.now() },
                  ]);
                  break;
                }
                case "error": {
                  const msg = (data as { message: string }).message;
                  setEvents((prev) => [...prev, { kind: "error", runId: currentRunId, message: msg, ts: Date.now() }]);
                  setError(msg);
                  break;
                }
                case "done":
                  // server closed; reader will EOF naturally
                  break;
              }
            }
            blankIdx = buffer.indexOf("\n\n");
          }
        }
        if (abort.signal.aborted) return;
        setStatus(error ? "error" : "idle");
      } catch (e) {
        if (abort.signal.aborted) return;
        const msg = e instanceof Error ? e.message : "Stream read error";
        setError(msg);
        setStatus("error");
      }
    },
    [sessionId, error]
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setEvents([]);
    setArtifacts([]);
    setSessionId(null);
    setStatus("idle");
    setError(null);
  }, []);

  return { events, artifacts, sessionId, status, error, sendMessage, reset };
}

function parseFrame(frame: string): { event: string; data: unknown } | null {
  const lines = frame.split("\n");
  let event = "message";
  let dataStr = "";
  for (const line of lines) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataStr += (dataStr ? "\n" : "") + line.slice(6);
  }
  if (!dataStr) return null;
  try {
    return { event, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

/** Append a thinking delta — coalesces with the previous thinking event from the same run. */
function appendThinking(prev: FeedEvent[], runId: string, text: string): FeedEvent[] {
  if (!text) return prev;
  const last = prev[prev.length - 1];
  if (last && last.kind === "thinking" && last.runId === runId) {
    return [...prev.slice(0, -1), { ...last, text: last.text + text }];
  }
  return [...prev, { kind: "thinking", runId, text, ts: Date.now() }];
}
