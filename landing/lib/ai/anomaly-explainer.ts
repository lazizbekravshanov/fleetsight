import { callClaude } from "./client";
import type { DetectionData } from "@/components/carrier/types";

const SYSTEM_PROMPT = `You are a fraud detection analyst for the FMCSA trucking industry. Given detection signals for a carrier, write a concise explanation (2-3 sentences) of what these signals mean for a compliance reviewer. Be specific about what the signals indicate. Use plain language.

Format: Plain text, no markdown, no bullet points. A direct narrative paragraph.`;

/**
 * Generate a human-readable explanation of detection signals.
 * Returns null if the AI is unavailable or there are no signals.
 */
export async function explainAnomalies(
  carrierName: string,
  data: DetectionData
): Promise<string | null> {
  const facts: string[] = [];

  if (data.anomalyFlags.length > 0) {
    const critical = data.anomalyFlags.filter((f) => f.severity === "critical");
    const high = data.anomalyFlags.filter((f) => f.severity === "high");
    const summary = [];
    if (critical.length > 0)
      summary.push(
        `${critical.length} critical: ${critical.map((f) => f.label).join(", ")}`
      );
    if (high.length > 0)
      summary.push(
        `${high.length} high: ${high.map((f) => f.label).join(", ")}`
      );
    if (summary.length > 0) facts.push(`Anomaly flags: ${summary.join("; ")}`);
  }

  if (data.authorityMill.isMillPattern) {
    facts.push(
      `Authority mill pattern: ${data.authorityMill.grantCount} grants, ${data.authorityMill.revokeCount} revocations, avg ${data.authorityMill.avgDaysBetween} days between`
    );
  }

  if (data.brokerReincarnation.isReincarnation) {
    const matches = [];
    if (data.brokerReincarnation.addressMatch) matches.push("address");
    if (data.brokerReincarnation.phoneMatch) matches.push("phone");
    if (data.brokerReincarnation.officerMatch) matches.push("officers");
    facts.push(
      `Broker reincarnation: matches prior DOT ${data.brokerReincarnation.priorDot} on ${matches.join(", ")}`
    );
  }

  if (data.sharedInsurance.length > 0) {
    const totalShared = data.sharedInsurance.reduce(
      (s, si) => s + si.matchingDots.length,
      0
    );
    facts.push(
      `Shared insurance: ${data.sharedInsurance.length} policies shared with ${totalShared} other carriers`
    );
  }

  if ((data.addressMatches ?? []).length > 0) {
    facts.push(
      `Address cross-reference: ${data.addressMatches!.length} other carriers at same physical address`
    );
  }

  if (facts.length === 0) return null;

  const prompt = `Carrier: ${carrierName}\n\nDetection signals:\n${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;

  return callClaude(SYSTEM_PROMPT, [{ role: "user", content: prompt }], {
    maxTokens: 250,
    temperature: 0.2,
  });
}
