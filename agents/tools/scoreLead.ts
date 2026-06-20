/**
 * Tool: scoreLead(analysis)
 *
 * Deterministic 0–100 lead score derived from the qualitative analysis plus
 * how reachable the prospect is. Kept out of the model so scores are stable,
 * explainable and reproducible across runs.
 */

import type { WebsiteStatus, Confidence } from "@/types";
import type { AnalysisAI } from "@/lib/schemas";

const WEBSITE_BASE: Record<WebsiteStatus, number> = {
  none: 55, // no site at all — strongest opportunity
  social_only: 50,
  broken: 45,
  outdated: 38,
  unknown: 30,
  ok: 12, // already has a decent site — low priority
};

const CONFIDENCE_BONUS: Record<Confidence, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

export interface ReachSignals {
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasSocial?: boolean;
}

export function scoreLead(
  analysis: AnalysisAI,
  reach: ReachSignals = {},
): number {
  let score = WEBSITE_BASE[analysis.website_status] ?? 30;

  // More concrete problems => more reason to need a site.
  score += Math.min(analysis.problems_found.length * 4, 20);

  score += CONFIDENCE_BONUS[analysis.confidence] ?? 3;

  // Reachable prospects are worth more (we can actually contact them).
  let reachBonus = 0;
  if (reach.hasPhone) reachBonus += 6;
  if (reach.hasEmail) reachBonus += 4;
  if (reach.hasSocial) reachBonus += 4;
  score += Math.min(reachBonus, 12);

  return Math.max(0, Math.min(100, Math.round(score)));
}
