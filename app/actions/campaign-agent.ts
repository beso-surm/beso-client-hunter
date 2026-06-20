"use server";

import {
  createCampaign,
  getCampaignWithPairs,
  startCampaignIfNeeded,
  updateCampaignPair,
  incrementCampaignAggregates,
  completeCampaign,
  updateLead,
  listLeadsByIds,
  getCampaignLeadIds,
  dataMode,
} from "@/lib/repo";
import { runClientHunterAgent } from "@/agents/runClientHunterAgent";
import { ok, fail } from "@/lib/action-result";
import type { ActionResult } from "@/lib/action-result";
import type { Campaign, CampaignWithPairs, LeadStatus, Market } from "@/types";
import { nowISO } from "@/lib/utils";

export async function createCampaignAction(input: {
  name: string;
  market?: Market;
  cities: string[];
  categories: string[];
  max_per_pair?: number;
  min_score?: number;
  skip_with_website?: boolean;
  prioritize_social_only?: boolean;
  prioritize_tourism?: boolean;
}): Promise<ActionResult<Campaign>> {
  try {
    if (dataMode !== "sqlite")
      return fail("Campaign Agent requires SQLite storage. Remove Supabase env vars to use local mode.");
    if (!input.cities.length) return fail("Select at least one city.");
    if (!input.categories.length) return fail("Select at least one category.");
    if (!input.name.trim()) return fail("Campaign name is required.");

    const campaign = await createCampaign({
      name: input.name.trim(),
      market: input.market ?? "Georgia",
      cities: input.cities,
      categories: input.categories,
      max_per_pair: input.max_per_pair ?? 8,
      min_score: input.min_score ?? 0,
      skip_with_website: input.skip_with_website ?? false,
      prioritize_social_only: input.prioritize_social_only ?? false,
      prioritize_tourism: input.prioritize_tourism ?? false,
    });
    return ok(campaign);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function runCampaignPairAction(
  campaignId: string,
  pairId: string,
): Promise<ActionResult<{ found: number; saved: number; skipped_duplicate: number; skipped_below_score: number; skipped_has_website: number; high_value: number; errors: string[] }>> {
  try {
    const cwp = await getCampaignWithPairs(campaignId);
    if (!cwp) return fail("Campaign not found");

    const pair = cwp.pairs.find((p) => p.id === pairId);
    if (!pair) return fail("Pair not found");
    if (pair.status === "completed") {
      return ok({
        found: pair.found,
        saved: pair.saved,
        skipped_duplicate: pair.skipped_duplicate,
        skipped_below_score: pair.skipped_below_score,
        skipped_has_website: pair.skipped_has_website,
        high_value: pair.high_value,
        errors: [],
      });
    }

    await startCampaignIfNeeded(campaignId);
    await updateCampaignPair(pairId, { status: "running", started_at: nowISO() });

    const result = await runClientHunterAgent({
      city: pair.city,
      category: pair.category,
      maxResults: cwp.max_per_pair,
      campaignId,
      minScore: cwp.min_score > 0 ? cwp.min_score : undefined,
      skipWithWebsite: cwp.skip_with_website,
      skipAgentRun: true,
      market: cwp.market,
    });

    const found = result.totalFound;
    const saved = result.saved;
    const skipped_duplicate = result.skippedDuplicates;
    const skipped_below_score = result.skippedBelowScore;
    const skipped_has_website = result.skippedHasWebsite;
    const high_value = result.highValueLeads;

    await updateCampaignPair(pairId, {
      status: "completed",
      found,
      saved,
      skipped_duplicate,
      skipped_below_score,
      skipped_has_website,
      high_value,
      error: result.errors.length ? result.errors.join("; ") : null,
      completed_at: nowISO(),
    });

    await incrementCampaignAggregates(campaignId, {
      pairs_done: 1,
      total_found: found,
      total_saved: saved,
      total_skipped_duplicate: skipped_duplicate,
      total_skipped_below_score: skipped_below_score,
      total_skipped_has_website: skipped_has_website,
      total_high_value: high_value,
    });

    return ok({ found, saved, skipped_duplicate, skipped_below_score, skipped_has_website, high_value, errors: result.errors });
  } catch (e) {
    await updateCampaignPair(pairId, {
      status: "failed",
      error: e instanceof Error ? e.message : String(e),
      completed_at: nowISO(),
    }).catch(() => {});
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function completeCampaignAction(
  campaignId: string,
): Promise<ActionResult<CampaignWithPairs>> {
  try {
    await completeCampaign(campaignId);
    const cwp = await getCampaignWithPairs(campaignId);
    if (!cwp) return fail("Campaign not found");
    return ok(cwp);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function bulkUpdateLeadsAction(
  campaignId: string,
  leadIds: string[],
  status: LeadStatus,
): Promise<ActionResult<{ updated: number }>> {
  try {
    const campaignLeadIds = await getCampaignLeadIds(campaignId);
    const allowed = new Set(campaignLeadIds);
    let updated = 0;
    for (const id of leadIds) {
      if (!allowed.has(id)) continue;
      await updateLead(id, { status });
      updated++;
    }
    return ok({ updated });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function getCampaignLeadsAction(
  campaignId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof listLeadsByIds>>>> {
  try {
    const ids = await getCampaignLeadIds(campaignId);
    const leads = await listLeadsByIds(ids);
    return ok(leads);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
