"use client";

/**
 * ArtifactRenderer — renders an artifact based on its type field.
 *
 * Phase 5 ships with the decision_card stub. Phase 7 wires the rest
 * (memo, evidence_list, chameleon_graph, comparison, timeline).
 *
 * Unknown artifact types fall back to a JSON dump so the agent never
 * fails silently — easier to debug.
 */

import type { ArtifactItem } from "@/lib/agent/use-agent-stream";
import { DecisionCard } from "./artifacts/decision-card";
import { Memo } from "./artifacts/memo";
import { EvidenceList } from "./artifacts/evidence-list";
import { ChameleonGraph } from "./artifacts/chameleon-graph";
import { Comparison } from "./artifacts/comparison";
import { Timeline } from "./artifacts/timeline";

export function ArtifactRenderer({ artifact }: { artifact: ArtifactItem }) {
  switch (artifact.type) {
    case "decision_card":
      return <DecisionCard artifact={artifact} />;
    case "memo":
      return <Memo artifact={artifact} />;
    case "evidence_list":
      return <EvidenceList artifact={artifact} />;
    case "chameleon_graph":
      return <ChameleonGraph artifact={artifact} />;
    case "comparison":
      return <Comparison artifact={artifact} />;
    case "timeline":
      return <Timeline artifact={artifact} />;
    default:
      return <UnknownArtifact artifact={artifact} />;
  }
}

function UnknownArtifact({ artifact }: { artifact: ArtifactItem }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span
          className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
          style={{ background: "var(--surface-2)", color: "var(--ink-soft)" }}
        >
          {artifact.type}
        </span>
        {artifact.title && (
          <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
            {artifact.title}
          </span>
        )}
      </div>
      <pre
        className="max-h-64 overflow-auto rounded p-2 text-[11px]"
        style={{ background: "var(--surface-2)", color: "var(--ink)" }}
      >
        {JSON.stringify(artifact.payload, null, 2)}
      </pre>
    </div>
  );
}
