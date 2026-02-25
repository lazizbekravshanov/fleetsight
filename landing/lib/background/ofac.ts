import type { OfacMatch } from "@/components/carrier/types";
import sdnNames from "./sdn-names.json";

const SDN_LIST: string[] = sdnNames as string[];

/**
 * Tokenize a name into uppercase words, removing punctuation.
 */
function tokenize(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Token-overlap similarity: |intersection| / |union|
 */
function tokenOverlap(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const tok of setA) {
    if (setB.has(tok)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Screen a list of names against the embedded OFAC SDN list.
 * Returns matches with score >= threshold (default 0.7).
 * Pure in-process, zero external calls.
 */
export function screenOfac(
  names: string[],
  threshold = 0.7
): OfacMatch[] {
  if (SDN_LIST.length === 0) return [];

  const matches: OfacMatch[] = [];
  for (const queryName of names) {
    const queryTokens = tokenize(queryName);
    if (queryTokens.length === 0) continue;

    for (const sdnName of SDN_LIST) {
      const sdnTokens = tokenize(sdnName);
      const score = tokenOverlap(queryTokens, sdnTokens);
      if (score >= threshold) {
        matches.push({
          queriedName: queryName,
          matchedName: sdnName,
          score: Math.round(score * 100) / 100,
          sdnType: "Individual/Entity",
          programs: [],
        });
      }
    }
  }

  // Deduplicate: keep highest score per queried+matched pair
  const deduped = new Map<string, OfacMatch>();
  for (const m of matches) {
    const key = `${m.queriedName}||${m.matchedName}`;
    const existing = deduped.get(key);
    if (!existing || m.score > existing.score) {
      deduped.set(key, m);
    }
  }

  return [...deduped.values()].sort((a, b) => b.score - a.score).slice(0, 20);
}
