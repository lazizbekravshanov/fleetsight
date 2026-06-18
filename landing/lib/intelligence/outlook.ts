/* ── Risk Outlook ─────────────────────────────────────────────────────
   Net-new forward-looking score: weights existing signals into a 0-100
   outlook for the next 6-12 months with the top contributing factors.
   Heuristic now; a data-driven model can replace `score()` later without
   changing the output shape. Pure + deterministic. */

import type { TrajectoryVerdict } from "./trajectory";

export type OutlookInput = {
  trajectoryVerdict: TrajectoryVerdict;
  worstBasicPercentile: number | null; // 0-100
  recentFatalCrash: boolean;
  insurerChurn: boolean;
  authorityInstability: boolean;
  chameleonScore: number | null; // 0-100
};

export type OutlookBand = "stable" | "watch" | "elevated" | "high";
export type OutlookFactor = { label: string; points: number };

export type Outlook = {
  score: number; // 0-100
  band: OutlookBand;
  factors: OutlookFactor[]; // non-zero contributors, sorted by |points| desc
};

export function computeOutlook(input: OutlookInput): Outlook {
  const factors: OutlookFactor[] = [];
  const add = (label: string, points: number) => {
    if (points !== 0) factors.push({ label, points });
  };

  if (input.trajectoryVerdict === "deteriorating") add("deteriorating_trajectory", 25);
  else if (input.trajectoryVerdict === "improving") add("improving_trajectory", -10);

  const p = input.worstBasicPercentile;
  if (p != null) {
    if (p >= 90) add("basic_percentile_critical", 25);
    else if (p >= 75) add("basic_percentile_high", 12);
  }

  if (input.recentFatalCrash) add("recent_fatal_crash", 20);
  if (input.insurerChurn) add("insurer_churn", 10);
  if (input.authorityInstability) add("authority_instability", 15);
  if (input.chameleonScore != null && input.chameleonScore > 0) {
    add("chameleon_signals", Math.round(input.chameleonScore * 0.2));
  }

  const raw = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  const band: OutlookBand = score >= 70 ? "high" : score >= 45 ? "elevated" : score >= 20 ? "watch" : "stable";

  factors.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  return { score, band, factors };
}
