/**
 * Affiliation scoring between carrier pairs based on shared VINs.
 *
 * 7-signal scoring system (0–100 each, combined into composite):
 *   1. sharedVinRatio   — what % of fleet is shared
 *   2. temporalPattern  — how suspicious is the transfer timing
 *   3. concurrentOps    — are VINs operated simultaneously by both
 *   4. addressMatch     — physical address similarity
 *   5. nameMatch        — legal/DBA name similarity
 *   6. oosReincarnation — carrier B appeared after carrier A went OOS
 *   7. fleetAbsorption  — did carrier B absorb most of carrier A's fleet
 *
 * 4-type classification:
 *   - POSSIBLE_CHAMELEON — OOS reincarnation + fleet absorption
 *   - SHELL_ENTITY — high shared ratio + concurrent ops
 *   - COMMON_FLEET — significant ongoing overlap, likely same owner
 *   - EQUIPMENT_TRANSFER — VINs moved sequentially, could be legitimate
 */

export type AffiliationType =
  | "POSSIBLE_CHAMELEON"
  | "SHELL_ENTITY"
  | "COMMON_FLEET"
  | "EQUIPMENT_TRANSFER";

export type SignalBreakdown = {
  sharedVinRatio: number;
  temporalPattern: number;
  concurrentOps: number;
  addressMatch: number;
  nameMatch: number;
  oosReincarnation: number;
  fleetAbsorption: number;
};

export type SharedVinDetail = {
  vin: string;
  vehicleType: string;
  unitMake: string | null;
  unitYear: number | null;
  carrierAFirstSeen: Date | null;
  carrierALastSeen: Date | null;
  carrierBFirstSeen: Date | null;
  carrierBLastSeen: Date | null;
  overlapDays: number;
  gapDays: number;
  transferDirection: "A_TO_B" | "B_TO_A" | "CONCURRENT" | "UNCLEAR";
};

export type ScoringInput = {
  sharedVins: SharedVinDetail[];
  totalVinsA: number;
  totalVinsB: number;
  powerUnitsA: number | null;
  powerUnitsB: number | null;
  samePhysicalAddress: boolean;
  sameCityState: boolean;
  sameState: boolean;
  nameSimilarityScore: number; // 0–1
  carrierAStatus: string | null;
  carrierBStatus: string | null;
  carrierAOosDate: Date | null;
  carrierBOosDate: Date | null;
  carrierAAddDate: Date | null;
  carrierBAddDate: Date | null;
};

export type ScoringResult = {
  score: number;
  type: AffiliationType;
  signals: SignalBreakdown;
  reasons: string[];
};

export function computeAffiliationScore(input: ScoringInput): ScoringResult {
  const reasons: string[] = [];
  const sharedCount = input.sharedVins.length;

  // ── Signal 1: Shared VIN ratio (0–100) ───────────────────────
  const fleetA = input.powerUnitsA ?? (input.totalVinsA || 1);
  const fleetB = input.powerUnitsB ?? (input.totalVinsB || 1);
  const ratioA = sharedCount / fleetA;
  const ratioB = sharedCount / fleetB;
  const maxRatio = Math.min(1, Math.max(ratioA, ratioB));
  const sharedVinRatio = Math.round(maxRatio * 100);
  if (maxRatio > 0.5) {
    reasons.push(`${Math.round(maxRatio * 100)}% fleet overlap`);
  }

  // ── Signal 2: Temporal pattern (0–100) ───────────────────────
  // Analyze transfer timing across all shared VINs
  const rapidTransfers = input.sharedVins.filter((v) => v.gapDays >= 0 && v.gapDays <= 7);
  const quickTransfers = input.sharedVins.filter((v) => v.gapDays > 7 && v.gapDays <= 30);

  let temporalPattern = 0;
  if (rapidTransfers.length > 0) {
    const rapidRatio = rapidTransfers.length / sharedCount;
    if (rapidRatio > 0.5) {
      temporalPattern = 80;
      reasons.push(`${rapidTransfers.length}/${sharedCount} vehicles had <7 day transfer gaps`);
    } else {
      temporalPattern = 50;
    }
  } else if (quickTransfers.length > sharedCount * 0.3) {
    temporalPattern = 30;
  }

  // Bulk transfer window detection
  const transferDates = input.sharedVins
    .filter((v) => v.transferDirection !== "CONCURRENT" && v.carrierBFirstSeen)
    .map((v) => v.carrierBFirstSeen!.getTime())
    .sort();

  if (transferDates.length >= 3) {
    const windowDays =
      (transferDates[transferDates.length - 1] - transferDates[0]) / (1000 * 60 * 60 * 24);
    if (windowDays <= 14) {
      temporalPattern = Math.max(temporalPattern, 90);
      reasons.push(`${transferDates.length} vehicles transferred within a ${Math.round(windowDays)}-day window`);
    } else if (windowDays <= 60) {
      temporalPattern = Math.max(temporalPattern, 60);
      reasons.push(`${transferDates.length} vehicles transferred within ${Math.round(windowDays)} days`);
    }
  }

  // ── Signal 3: Concurrent operations (0–100) ──────────────────
  const concurrent = input.sharedVins.filter((v) => v.overlapDays > 30);
  const concurrentRatio = sharedCount > 0 ? concurrent.length / sharedCount : 0;
  const concurrentOps = Math.round(Math.min(1, concurrentRatio) * 100);
  if (concurrent.length > 0) {
    reasons.push(`${concurrent.length} VINs operated concurrently by both carriers`);
  }

  // ── Signal 4: Address match (0–100) ──────────────────────────
  let addressMatch = 0;
  if (input.samePhysicalAddress) {
    addressMatch = 100;
    reasons.push("Same physical address");
  } else if (input.sameCityState) {
    addressMatch = 50;
    reasons.push("Same city and state");
  } else if (input.sameState) {
    addressMatch = 20;
  }

  // ── Signal 5: Name similarity (0–100) ────────────────────────
  const nameMatch = Math.round(input.nameSimilarityScore * 100);
  if (input.nameSimilarityScore > 0.8) {
    reasons.push("Very similar company names");
  } else if (input.nameSimilarityScore > 0.6) {
    reasons.push("Similar company names");
  }

  // ── Signal 6: OOS reincarnation (0–100) ──────────────────────
  let oosReincarnation = 0;
  const oosCheck = detectOosReincarnation(
    input.carrierAStatus,
    input.carrierAOosDate,
    input.sharedVins,
    "B"
  ) ?? detectOosReincarnation(
    input.carrierBStatus,
    input.carrierBOosDate,
    input.sharedVins,
    "A"
  );

  if (oosCheck) {
    oosReincarnation = oosCheck.score;
    reasons.push(oosCheck.reason);
  }

  // ── Signal 7: Fleet absorption (0–100) ───────────────────────
  const absorptionA = fleetA > 0 ? sharedCount / fleetA : 0;
  const absorptionB = fleetB > 0 ? sharedCount / fleetB : 0;
  const maxAbsorption = Math.max(absorptionA, absorptionB);
  let fleetAbsorption = 0;
  if (maxAbsorption > 0.7) {
    fleetAbsorption = 100;
    reasons.push(`One carrier operates ${Math.round(maxAbsorption * 100)}% of the other's fleet`);
  } else if (maxAbsorption > 0.4) {
    fleetAbsorption = 60;
    reasons.push(`${Math.round(maxAbsorption * 100)}% fleet absorption detected`);
  } else if (maxAbsorption > 0.2) {
    fleetAbsorption = 30;
  }

  const signals: SignalBreakdown = {
    sharedVinRatio,
    temporalPattern,
    concurrentOps,
    addressMatch,
    nameMatch,
    oosReincarnation,
    fleetAbsorption,
  };

  // ── Composite score (weighted) ───────────────────────────────
  const composite =
    sharedVinRatio * 0.20 +
    temporalPattern * 0.20 +
    concurrentOps * 0.10 +
    addressMatch * 0.10 +
    nameMatch * 0.05 +
    oosReincarnation * 0.20 +
    fleetAbsorption * 0.15;

  const score = Math.min(100, Math.round(composite));
  const type = classifyAffiliation(signals, score);

  return { score, type, signals, reasons };
}

function detectOosReincarnation(
  status: string | null,
  oosDate: Date | null,
  sharedVins: SharedVinDetail[],
  targetSide: "A" | "B"
): { score: number; reason: string } | null {
  if (status !== "I" && status !== "N") return null; // Not inactive/OOS
  if (!oosDate) return null;

  const targetFirstSeen = sharedVins
    .map((v) => (targetSide === "B" ? v.carrierBFirstSeen : v.carrierAFirstSeen))
    .filter((d): d is Date => d !== null)
    .map((d) => d.getTime());

  if (targetFirstSeen.length === 0) return null;

  const earliestActivity = Math.min(...targetFirstSeen);
  const daysBetween = (earliestActivity - oosDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysBetween >= -30 && daysBetween <= 90) {
    return {
      score: 100,
      reason: `New carrier began operating shared vehicles within ${Math.round(daysBetween)} days of OOS order`,
    };
  }
  if (daysBetween > 90 && daysBetween <= 365) {
    return {
      score: 50,
      reason: `New carrier appeared within 1 year of OOS date`,
    };
  }

  return null;
}

function classifyAffiliation(
  signals: SignalBreakdown,
  score: number
): AffiliationType {
  // Chameleon: OOS reincarnation + fleet absorption
  if (signals.oosReincarnation >= 50 && signals.fleetAbsorption >= 30) {
    return "POSSIBLE_CHAMELEON";
  }
  if (signals.oosReincarnation >= 30 && signals.temporalPattern >= 50 && score >= 50) {
    return "POSSIBLE_CHAMELEON";
  }

  // Shell entity: high shared ratio + concurrent ops
  if (signals.sharedVinRatio >= 80 && signals.concurrentOps >= 50) {
    return "SHELL_ENTITY";
  }

  // Common fleet: significant ongoing overlap
  if (signals.sharedVinRatio >= 30 && signals.concurrentOps >= 30) {
    return "COMMON_FLEET";
  }
  if (score >= 30 && signals.addressMatch >= 50) {
    return "COMMON_FLEET";
  }

  return "EQUIPMENT_TRANSFER";
}

/**
 * Compute temporal details for a shared VIN between two carriers.
 */
export function computeVinTemporal(
  aFirstSeen: Date | null,
  aLastSeen: Date | null,
  bFirstSeen: Date | null,
  bLastSeen: Date | null
): { overlapDays: number; gapDays: number; transferDirection: string } {
  if (!aFirstSeen || !aLastSeen || !bFirstSeen || !bLastSeen) {
    return { overlapDays: 0, gapDays: 0, transferDirection: "UNCLEAR" };
  }

  // Overlap: period where both carriers had the VIN
  const overlapStart = Math.max(aFirstSeen.getTime(), bFirstSeen.getTime());
  const overlapEnd = Math.min(aLastSeen.getTime(), bLastSeen.getTime());
  const overlapMs = Math.max(0, overlapEnd - overlapStart);
  const overlapDays = Math.round(overlapMs / (1000 * 60 * 60 * 24));

  // Gap: time between one carrier's last seen and other's first seen
  let gapDays: number;
  let transferDirection: string;

  if (aLastSeen < bFirstSeen) {
    gapDays = Math.round(
      (bFirstSeen.getTime() - aLastSeen.getTime()) / (1000 * 60 * 60 * 24)
    );
    transferDirection = "A_TO_B";
  } else if (bLastSeen < aFirstSeen) {
    gapDays = Math.round(
      (aFirstSeen.getTime() - bLastSeen.getTime()) / (1000 * 60 * 60 * 24)
    );
    transferDirection = "B_TO_A";
  } else {
    gapDays = 0;
    transferDirection = overlapDays > 30 ? "CONCURRENT" : "UNCLEAR";
  }

  return { overlapDays, gapDays, transferDirection };
}

/**
 * Jaro-Winkler name similarity (0–1).
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

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(na.length, nb.length)); i++) {
    if (na[i] === nb[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}
