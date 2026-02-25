import { callClaude } from "./client";
import type { BackgroundData } from "@/components/carrier/types";

const SYSTEM_PROMPT = `You are a compliance analyst. Given background check data for an FMCSA-registered carrier, write a concise risk narrative (2-4 sentences). Be factual and direct. Highlight the most critical findings first. If there are no concerns, say so briefly.

Format: Plain text, no markdown, no bullet points. Just a direct narrative paragraph.`;

/**
 * Generate a plain-English risk narrative from background check data.
 * Returns null if the AI is unavailable.
 */
export async function generateRiskNarrative(
  carrierName: string,
  data: BackgroundData
): Promise<string | null> {
  const totalOfficerRefs = data.officerCrossRefs.reduce(
    (s, o) => s + o.carriers.length,
    0
  );
  const totalCorpAffiliations = data.corporateAffiliations.reduce(
    (s, o) => s + o.companies.length,
    0
  );

  // Build a concise summary for the LLM
  const facts: string[] = [];

  if (data.ofacMatches.length > 0)
    facts.push(
      `OFAC SDN matches: ${data.ofacMatches.length} (names: ${data.ofacMatches.map((m) => m.matchedName).join(", ")})`
    );
  if (data.samExclusions.length > 0)
    facts.push(
      `SAM.gov federal exclusions: ${data.samExclusions.length} (${data.samExclusions.map((e) => e.name).join(", ")})`
    );
  if (data.bankruptcyCases.length > 0)
    facts.push(
      `Bankruptcy filings: ${data.bankruptcyCases.length}`
    );
  if (totalOfficerRefs > 0) {
    const details = data.officerCrossRefs
      .filter((r) => r.carriers.length > 0)
      .map((r) => `${r.officerName} appears on ${r.carriers.length} other carriers`)
      .join("; ");
    facts.push(`Officer cross-references: ${totalOfficerRefs} (${details})`);
  }
  if (data.oshaViolations.length > 0) {
    const totalPenalty = data.oshaViolations.reduce((s, v) => s + v.penalty, 0);
    facts.push(
      `OSHA violations: ${data.oshaViolations.length}${totalPenalty > 0 ? `, $${totalPenalty.toLocaleString()} in penalties` : ""}`
    );
  }
  if (data.epaEnforcements.length > 0)
    facts.push(`EPA enforcement records: ${data.epaEnforcements.length}`);
  if (data.courtCases.length > 0)
    facts.push(`Federal court cases: ${data.courtCases.length}`);
  if (data.edgarFilings.length > 0)
    facts.push(`SEC EDGAR filings: ${data.edgarFilings.length}`);
  if (totalCorpAffiliations > 0)
    facts.push(`Corporate affiliations: ${totalCorpAffiliations} companies`);
  if (data.mailingAddressMatches.length > 0)
    facts.push(
      `Mailing address shared with ${data.mailingAddressMatches.length} other carriers`
    );
  if (data.addressIntelligence) {
    const flags = data.addressIntelligence.flags;
    if (flags.length > 0) facts.push(`Address flags: ${flags.join("; ")}`);
  }
  if (
    data.digitalFootprint?.websiteDomain === null &&
    data.digitalFootprint?.emailDomain
  )
    facts.push("No company website detected (uses free email provider)");

  if (facts.length === 0)
    return `No adverse findings were identified for ${carrierName}. All background checks — including sanctions screening, federal exclusions, court records, and regulatory violations — returned clear results.`;

  const prompt = `Carrier: ${carrierName}\n\nBackground check findings:\n${facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;

  return callClaude(SYSTEM_PROMPT, [{ role: "user", content: prompt }], {
    maxTokens: 300,
    temperature: 0.2,
  });
}
