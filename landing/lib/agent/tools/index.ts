/**
 * Tool registry — barrel export of every agent tool.
 *
 * Personas pick a subset by name; runtime dispatches by tool.name.
 */

import type { AgentTool } from "../types";

// Pass 1 (Phase 3) — core
import { lookupCarrier } from "./lookup-carrier";
import { fetchInspections } from "./fetch-inspections";
import { fetchCrashes } from "./fetch-crashes";
import { detectChameleonSignals } from "./detect-chameleon-signals";
import { computeTrustScoreTool } from "./compute-trust-score";
import { findAffiliations } from "./find-affiliations";
import { presentArtifact } from "./present-artifact";

// Pass 2 (Phase 8) — full coverage
import { fetchInsuranceHistory } from "./fetch-insurance-history";
import { fetchAuthorityHistory } from "./fetch-authority-history";
import { computeQuickRisk } from "./compute-quick-risk";
import { computeCostImpact } from "./compute-cost-impact";
import { computeVulnerability } from "./compute-vulnerability";
import { computeDriverScorecard } from "./compute-driver-scorecard";
import { queryAddressCluster } from "./query-address-cluster";
import { queryPrincipalCluster } from "./query-principal-cluster";
import { fetchEnablers } from "./fetch-enablers";
import { fetchCorporateNetwork } from "./fetch-corporate-network";
import { checkVoipPhone } from "./check-voip-phone";
import { fetchVehicleRecalls } from "./fetch-vehicle-recalls";
import { fetchVehicleComplaints } from "./fetch-vehicle-complaints";
import { fetchBackgroundChecks } from "./fetch-background-checks";
import { searchCarriersTool } from "./search-carriers";
import { addObservation } from "./add-observation";

// Pass 3 (Phase 12) — actions
import { watchCarrier } from "./watch-carrier";
import { addNote } from "./add-note";
import { flagForReview } from "./flag-for-review";

export const allTools: AgentTool[] = [
  // Core identity & data
  lookupCarrier,
  fetchInspections,
  fetchCrashes,
  fetchInsuranceHistory,
  fetchAuthorityHistory,

  // Risk & scoring
  computeTrustScoreTool,
  computeQuickRisk,
  computeCostImpact,
  computeVulnerability,
  computeDriverScorecard,

  // Detection & affiliation
  detectChameleonSignals,
  findAffiliations,
  queryAddressCluster,
  queryPrincipalCluster,
  fetchEnablers,
  fetchCorporateNetwork,
  checkVoipPhone,

  // Vehicle-level
  fetchVehicleRecalls,
  fetchVehicleComplaints,

  // Background & search
  fetchBackgroundChecks,
  searchCarriersTool,

  // Memory & actions
  addObservation,
  watchCarrier,
  addNote,
  flagForReview,

  // UI
  presentArtifact,
];

export function pickTools(names: readonly string[]): AgentTool[] {
  const map = new Map(allTools.map((t) => [t.name, t]));
  const out: AgentTool[] = [];
  for (const name of names) {
    const tool = map.get(name);
    if (tool) out.push(tool);
  }
  return out;
}
