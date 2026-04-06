/**
 * flag_for_review — write a MonitoringAlert directly so the user sees it
 * in their alerts inbox even if they're not currently in the console.
 * Idempotent within a run via (runId, tool name + input).
 */

import type { AgentTool, AgentContext } from "../types";
import { withIdempotency, buildIdempotencyKey } from "../idempotency";

type Input = {
  dotNumber: string;
  legalName?: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  detail?: string;
};

type Output = { ok: true; alertId: string; cached: boolean };

export const flagForReview: AgentTool<Input, Output> = {
  name: "flag_for_review",
  description:
    "Surface an immediate alert in the user's alerts inbox. Use this when you want the user to know about a finding even if they navigate away from the console. Severity should match the underlying risk: critical for revoked authority/fatal crash patterns, high for chameleon signals, medium for elevated OOS, low for advisory-only. Idempotent — re-flagging with identical fields within a run is a no-op.",
  inputSchema: {
    type: "object",
    required: ["dotNumber", "severity", "title"],
    properties: {
      dotNumber: { type: "string", pattern: "^\\d{1,10}$" },
      legalName: { type: "string" },
      severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
      title: { type: "string", maxLength: 200 },
      detail: { type: "string", maxLength: 1000 },
    },
  },
  async execute(input, ctx: AgentContext) {
    const key = buildIdempotencyKey("flag_for_review", input);
    const { resourceId, cached } = await withIdempotency(ctx, key, "monitoring_alert", async () => {
      const alert = await ctx.prisma.monitoringAlert.create({
        data: {
          userId: ctx.userId,
          dotNumber: input.dotNumber,
          legalName: input.legalName || `DOT ${input.dotNumber}`,
          alertType: "agent_flag",
          severity: input.severity,
          title: input.title,
          detail: input.detail || "",
        },
      });
      return { id: alert.id };
    });
    return { ok: true, alertId: resourceId, cached };
  },
  summarize(out) {
    return out.cached ? `Alert already exists (${out.alertId.slice(0, 8)})` : `Alert created (${out.alertId.slice(0, 8)})`;
  },
  serializeForModel(out) {
    return JSON.stringify(out);
  },
};
