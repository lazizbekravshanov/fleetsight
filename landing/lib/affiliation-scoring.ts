/**
 * Affiliation scoring between carrier pairs based on shared VINs and contextual signals.
 *
 * Score range: 0–100
 * - 60+: POSSIBLE_CHAMELEON (high overlap, especially with OOS/inactive → new authority timing)
 * - 30–60: COMMON_OWNER (moderate overlap, likely same ownership group)
 * - 10–30: COMMON_EQUIPMENT (low overlap, could be legitimate leasing)
 * - <10: UNKNOWN
 */

export type AffiliationInput = {
  sharedVinCount: number;
  totalVinsA: number;
  totalVinsB: number;
  samePhysicalAddress: boolean;
  sameCityState: boolean;
  sameState: boolean;
  nameSimilarity: number; // 0–1
  carrierAOosDate: Date | null;
  carrierBCreatedDate: Date | null;
  carrierBOosDate: Date | null;
  carrierACreatedDate: Date | null;
};

export type AffiliationType =
  | "POSSIBLE_CHAMELEON"
  | "COMMON_OWNER"
  | "COMMON_EQUIPMENT"
  | "UNKNOWN";

export function computeAffiliationScore(input: AffiliationInput): {
  score: number;
  type: AffiliationType;
  signals: string[];
} {
  let score = 0;
  const signals: string[] = [];

  // Signal 1: Shared VIN ratio (weight: 40%)
  const minFleet = Math.min(
    input.totalVinsA || 1,
    input.totalVinsB || 1
  );
  const maxSharedRatio = Math.min(1, input.sharedVinCount / minFleet);
  const ratioScore = maxSharedRatio * 40;
  score += ratioScore;
  if (maxSharedRatio > 0.5) {
    signals.push(`${Math.round(maxSharedRatio * 100)}% fleet overlap`);
  }

  // Signal 2: Raw shared count (weight: 20%)
  if (input.sharedVinCount >= 10) {
    score += 20;
    signals.push(`${input.sharedVinCount} shared vehicles`);
  } else if (input.sharedVinCount >= 5) {
    score += 15;
    signals.push(`${input.sharedVinCount} shared vehicles`);
  } else if (input.sharedVinCount >= 3) {
    score += 10;
    signals.push(`${input.sharedVinCount} shared vehicles`);
  } else if (input.sharedVinCount >= 1) {
    score += 5;
    signals.push(`${input.sharedVinCount} shared vehicle${input.sharedVinCount > 1 ? "s" : ""}`);
  }

  // Signal 3: Address proximity (weight: 15%)
  if (input.samePhysicalAddress) {
    score += 15;
    signals.push("Same physical address");
  } else if (input.sameCityState) {
    score += 8;
    signals.push("Same city and state");
  } else if (input.sameState) {
    score += 3;
  }

  // Signal 4: Name similarity (weight: 10%)
  if (input.nameSimilarity > 0.8) {
    score += 10;
    signals.push("Similar company names");
  } else if (input.nameSimilarity > 0.6) {
    score += 5;
  }

  // Signal 5: Temporal pattern (weight: 15%)
  const chameleonTiming = checkChameleonTiming(
    input.carrierAOosDate,
    input.carrierBCreatedDate
  ) || checkChameleonTiming(
    input.carrierBOosDate,
    input.carrierACreatedDate
  );

  if (chameleonTiming === "strong") {
    score += 15;
    signals.push("New authority created shortly after OOS order");
  } else if (chameleonTiming === "moderate") {
    score += 8;
    signals.push("Authority created within 1 year of OOS");
  }

  score = Math.min(100, Math.round(score));

  const type = classifyType(score);

  return { score, type, signals };
}

function checkChameleonTiming(
  oosDate: Date | null,
  createdDate: Date | null
): "strong" | "moderate" | null {
  if (!oosDate || !createdDate) return null;
  const diffMs = createdDate.getTime() - oosDate.getTime();
  if (diffMs < 0) return null; // Created before OOS — not chameleon pattern
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 180) return "strong";
  if (diffDays <= 365) return "moderate";
  return null;
}

function classifyType(score: number): AffiliationType {
  if (score >= 60) return "POSSIBLE_CHAMELEON";
  if (score >= 30) return "COMMON_OWNER";
  if (score >= 10) return "COMMON_EQUIPMENT";
  return "UNKNOWN";
}

/**
 * Simple Jaro-Winkler-like name similarity (0–1).
 */
export function nameSimilarity(a: string, b: string): number {
  const na = a.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const nb = b.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (na === nb) return 1;
  if (!na || !nb) return 0;

  const maxLen = Math.max(na.length, nb.length);
  const matchWindow = Math.floor(maxLen / 2) - 1;

  let matches = 0;
  const aMatched = new Array(na.length).fill(false);
  const bMatched = new Array(nb.length).fill(false);

  for (let i = 0; i < na.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(nb.length, i + matchWindow + 1);
    for (let j = start; j < end; j++) {
      if (!bMatched[j] && na[i] === nb[j]) {
        aMatched[i] = true;
        bMatched[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < na.length; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (na[i] !== nb[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / na.length +
      matches / nb.length +
      (matches - transpositions / 2) / matches) /
    3;

  // Winkler boost for common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(na.length, nb.length)); i++) {
    if (na[i] === nb[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}
