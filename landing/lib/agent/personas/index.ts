/**
 * Persona registry — maps persona id → system prompt + tool subset.
 *
 * The agent route picks the persona based on the request body, defaulting
 * to investigator. Persona switching mid-session swaps the prompt and tools
 * but keeps the conversation history.
 */

import { INVESTIGATOR_SYSTEM, INVESTIGATOR_TOOLS } from "./investigator";
import { CHAMELEON_HUNTER_SYSTEM, CHAMELEON_HUNTER_TOOLS } from "./chameleon-hunter";
import { UNDERWRITER_SYSTEM, UNDERWRITER_TOOLS } from "./underwriter";
import { WATCHDOG_SYSTEM, WATCHDOG_TOOLS } from "./watchdog";
import { MARKET_SCOUT_SYSTEM, MARKET_SCOUT_TOOLS } from "./market-scout";

export type PersonaId = "investigator" | "chameleon_hunter" | "underwriter" | "watchdog" | "market_scout";

export const PERSONAS: Record<
  PersonaId,
  { id: PersonaId; label: string; description: string; system: string; tools: readonly string[] }
> = {
  investigator: {
    id: "investigator",
    label: "Investigator",
    description: "General-purpose carrier vetting. Verdict + memo + evidence on auto-brief.",
    system: INVESTIGATOR_SYSTEM,
    tools: INVESTIGATOR_TOOLS,
  },
  chameleon_hunter: {
    id: "chameleon_hunter",
    label: "Chameleon Hunter",
    description: "Specialist for identity-shifting carriers and sister-carrier networks.",
    system: CHAMELEON_HUNTER_SYSTEM,
    tools: CHAMELEON_HUNTER_TOOLS,
  },
  underwriter: {
    id: "underwriter",
    label: "Underwriter",
    description: "Bondable-risk memos for insurance and broker risk committees.",
    system: UNDERWRITER_SYSTEM,
    tools: UNDERWRITER_TOOLS,
  },
  watchdog: {
    id: "watchdog",
    label: "Watchdog",
    description: "Autonomous overnight monitor — emits delta-only updates. Cron use.",
    system: WATCHDOG_SYSTEM,
    tools: WATCHDOG_TOOLS,
  },
  market_scout: {
    id: "market_scout",
    label: "Market Scout",
    description: "Discovery and screening of new carrier candidates from criteria.",
    system: MARKET_SCOUT_SYSTEM,
    tools: MARKET_SCOUT_TOOLS,
  },
};

export function getPersona(id: string | undefined): (typeof PERSONAS)[PersonaId] {
  if (id && id in PERSONAS) return PERSONAS[id as PersonaId];
  return PERSONAS.investigator;
}

export const USER_FACING_PERSONAS: PersonaId[] = [
  "investigator",
  "chameleon_hunter",
  "underwriter",
  "market_scout",
  // watchdog excluded — cron-only
];
