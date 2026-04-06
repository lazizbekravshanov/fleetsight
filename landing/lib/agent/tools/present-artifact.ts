/**
 * present_artifact — special tool the model calls to render structured findings
 * in the user's right-pane artifact area.
 *
 * This is the bridge between the model's reasoning and the UI. The model
 * calls this multiple times per turn, once per artifact. Every payload is:
 *   1. JSONSchema-validated by Anthropic before we even see it
 *   2. Zod-validated server-side per artifact type
 *   3. Citation-validated: payload.citations[] must reference real ToolCall
 *      rows from the current run. Hallucinated decision cards are impossible.
 *
 * Adding a new artifact type:
 *   1. Add a Zod schema to ARTIFACT_SCHEMAS
 *   2. Add a renderer to components/agent/artifacts/
 *   3. Wire it into ArtifactRenderer's switch
 */

import { z } from "zod";
import type { AgentTool, AgentContext } from "../types";

const citationsSchema = z.array(z.string().min(1)).min(1).max(20);

const decisionCardSchema = z.object({
  verdict: z.enum(["pass", "watch", "fail"]),
  headline: z.string().min(5).max(160),
  bullets: z.array(z.string().min(3).max(280)).min(1).max(8),
  confidence: z.number().min(0).max(1),
  citations: citationsSchema,
});

const memoSchema = z.object({
  body_md: z.string().min(20).max(8000),
  citations: citationsSchema,
});

const evidenceListSchema = z.object({
  kind: z.enum(["inspections", "crashes", "violations", "insurance", "authority", "affiliations", "other"]),
  caption: z.string().max(200).optional(),
  items: z.array(z.record(z.string(), z.unknown())).max(50),
  citations: citationsSchema,
});

const chameleonGraphSchema = z.object({
  rootDot: z.string(),
  nodes: z
    .array(
      z.object({
        dot: z.string(),
        legalName: z.string().optional(),
        cluster: z.string().optional(),
        risk: z.enum(["low", "medium", "high", "critical"]).optional(),
      })
    )
    .max(50),
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        weight: z.number().optional(),
        reason: z.string().optional(),
      })
    )
    .max(200),
  citations: citationsSchema,
});

const comparisonSchema = z.object({
  rows: z
    .array(
      z.object({
        label: z.string(),
        a: z.union([z.string(), z.number(), z.null()]),
        b: z.union([z.string(), z.number(), z.null()]),
        winner: z.enum(["a", "b", "tie"]).optional(),
      })
    )
    .min(1)
    .max(30),
  carrierA: z.object({ dot: z.string(), label: z.string() }),
  carrierB: z.object({ dot: z.string(), label: z.string() }),
  citations: citationsSchema,
});

const timelineSchema = z.object({
  events: z
    .array(
      z.object({
        date: z.string(),
        title: z.string().max(160),
        detail: z.string().max(400).optional(),
        severity: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
      })
    )
    .min(1)
    .max(50),
  citations: citationsSchema,
});

export const ARTIFACT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  decision_card: decisionCardSchema,
  memo: memoSchema,
  evidence_list: evidenceListSchema,
  chameleon_graph: chameleonGraphSchema,
  comparison: comparisonSchema,
  timeline: timelineSchema,
};

const ARTIFACT_TYPES = Object.keys(ARTIFACT_SCHEMAS);

type Input = {
  type: string;
  title?: string;
  payload: Record<string, unknown>;
};

type Output = { ok: true; id: string };

export const presentArtifact: AgentTool<Input, Output> = {
  name: "present_artifact",
  description: `Render a structured artifact in the user's right-hand console pane.
Call this multiple times per turn, once per artifact you want to show.

Available types:
- decision_card: a verdict-first finding (pass/watch/fail + headline + bullets + confidence + citations). Use this once per investigation as the headline result.
- memo: longer markdown narrative with citations. Use for written analysis.
- evidence_list: a compact tabular list of inspections/crashes/violations/etc. Use to back up claims with specific records.
- chameleon_graph: a network graph of related carriers and their links. Use when affiliations matter.
- comparison: side-by-side comparison of two carriers across labeled rows.
- timeline: chronological event ribbon (authority changes, inspections, crashes, etc.)

EVERY artifact MUST include a 'citations' field — an array of tool_use_ids from this run that produced the data. Citations are validated server-side; if you cite a non-existent tool_use_id the artifact will be rejected.`,
  inputSchema: {
    type: "object",
    required: ["type", "payload"],
    properties: {
      type: { type: "string", enum: ARTIFACT_TYPES, description: "Artifact type" },
      title: { type: "string", description: "Optional short title shown above the artifact", maxLength: 120 },
      payload: { type: "object", description: "Artifact-specific payload. Must include a 'citations' array of tool_use_ids." },
    },
  },
  async execute(input, ctx: AgentContext) {
    const schema = ARTIFACT_SCHEMAS[input.type];
    if (!schema) throw new Error(`Unknown artifact type: ${input.type}. Valid: ${ARTIFACT_TYPES.join(", ")}`);

    const parsed = schema.safeParse(input.payload);
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid payload for ${input.type}: ${issues}`);
    }

    const citations = (parsed.data as { citations: string[] }).citations;
    // Validate every citation references a real ToolCall in this run
    const existing = await ctx.prisma.toolCall.findMany({
      where: { runId: ctx.runId, toolUseId: { in: citations } },
      select: { toolUseId: true },
    });
    if (existing.length !== citations.length) {
      const existingIds = new Set(existing.map((e) => e.toolUseId));
      const missing = citations.filter((c) => !existingIds.has(c));
      throw new Error(
        `Invalid citations: ${missing.slice(0, 5).join(", ")} — these tool_use_ids do not exist in this run. Only cite tool_use_ids from tools you have actually called.`
      );
    }

    const { id } = await ctx.emitArtifact({
      type: input.type,
      title: input.title,
      payload: parsed.data,
      citations,
    });

    // Side-effect: when a decision_card is emitted for a real carrier, also
    // upsert the verdict cache so the public /carrier/[dot] SEO snapshot
    // shows the latest agent verdict instead of the fallback quick-grade.
    if (input.type === "decision_card" && ctx.carrierDotNumber) {
      const dc = parsed.data as {
        verdict: string;
        headline: string;
        bullets: string[];
        confidence: number;
      };
      try {
        await ctx.prisma.carrierVerdictCache.upsert({
          where: { dotNumber: ctx.carrierDotNumber },
          create: {
            dotNumber: ctx.carrierDotNumber,
            verdict: dc.verdict,
            headline: dc.headline,
            bullets: JSON.stringify(dc.bullets),
            confidence: dc.confidence,
            generatedByRunId: ctx.runId,
          },
          update: {
            verdict: dc.verdict,
            headline: dc.headline,
            bullets: JSON.stringify(dc.bullets),
            confidence: dc.confidence,
            generatedAt: new Date(),
            generatedByRunId: ctx.runId,
          },
        });
      } catch {
        // Don't let cache failure break the artifact emission
      }
    }

    return { ok: true, id };
  },
  summarize(out) {
    return `artifact rendered (${out.id})`;
  },
  serializeForModel(out) {
    return JSON.stringify(out);
  },
};
