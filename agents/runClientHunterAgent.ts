/**
 * Orchestrator: runClientHunterAgent({ city, category, maxResults })
 *
 * The end-to-end agent loop:
 *   1. open an agent_run record
 *   2. search for businesses
 *   3. dedupe against existing leads
 *   4. fetch website data
 *   5. analyze with Claude (or heuristic fallback)
 *   6. score the lead
 *   7. draft a Georgian outreach message (DRAFT ONLY — never sent)
 *   8. persist everything and mark the lead "ready" for review
 *   9. close the run and return a summary
 *
 * Per-candidate failures are caught and logged so one bad lead never aborts
 * the whole run.
 */

import "server-only";
import { HIGH_VALUE_THRESHOLD } from "@/lib/constants";
import { claudeEnabled } from "@/lib/claude";
import { nowISO } from "@/lib/utils";
import {
  createAgentRun,
  findLeadByNameCity,
  getSettings,
  linkLeadToCampaign,
  updateAgentRun,
  updateLead,
} from "@/lib/repo";
// Note: deleteLead is intentionally NOT imported here. Campaign filters must
// never delete leads — we avoid saving in the first place if a lead fails.
import {
  searchBusinesses,
  searchProvider,
} from "@/agents/tools/searchBusinesses";
import { checkWebsite } from "@/agents/tools/checkWebsite";
import { analyzeBusiness } from "@/agents/tools/analyzeBusiness";
import { scoreLead } from "@/agents/tools/scoreLead";
import { writeGeorgianOutreach } from "@/agents/tools/writeGeorgianOutreach";
import { saveLead } from "@/agents/tools/saveLead";
import { saveAnalysis } from "@/agents/tools/saveAnalysis";
import { saveGeneratedMessage } from "@/agents/tools/saveGeneratedMessage";
import type { AgentRunSummary, Market } from "@/types";

export interface RunClientHunterArgs {
  city: string;
  category: string;
  maxResults?: number;
  campaignId?: string;
  minScore?: number;
  skipWithWebsite?: boolean;
  skipAgentRun?: boolean;
  market?: Market;
}

export async function runClientHunterAgent(
  args: RunClientHunterArgs,
): Promise<AgentRunSummary> {
  const city = args.city.trim();
  const category = args.category.trim();
  const maxResults = Math.min(Math.max(args.maxResults ?? 8, 1), 25);
  const { campaignId, minScore, skipWithWebsite, skipAgentRun } = args;

  const run = skipAgentRun
    ? { id: `noop-${Date.now()}` }
    : await createAgentRun({ city, category, max_results: maxResults });

  const errors: string[] = [];
  const leadIds: string[] = [];
  let totalFound = 0;
  let saved = 0;
  let skippedDuplicates = 0;
  let skippedBelowScore = 0;
  let skippedHasWebsite = 0;
  let highValue = 0;

  try {
    const settings = await getSettings();
    const effectiveSettings = args.market ? { ...settings, market: args.market } : settings;
    const query = `${category} in ${city}`;
    const candidates = await searchBusinesses(query, city, category, maxResults, effectiveSettings.market);
    totalFound = candidates.length;

    for (const candidate of candidates) {
      try {
        // 3. Deduplicate against existing leads (never touch duplicates).
        const duplicate = await findLeadByNameCity(
          candidate.business_name,
          candidate.city,
        );
        if (duplicate) {
          skippedDuplicates++;
          continue;
        }

        // 4–5. Analyze in-memory BEFORE touching the DB.
        // This ensures campaign filters never cause a lead to be saved then deleted.
        const website = await checkWebsite(candidate.website_url);

        const { analysis } = await analyzeBusiness(
          {
            business_name: candidate.business_name,
            category: candidate.category,
            city: candidate.city,
            website_url: candidate.website_url,
            instagram_url: candidate.instagram_url,
            facebook_url: candidate.facebook_url,
            phone: candidate.phone,
            email: candidate.email,
          },
          website,
          effectiveSettings,
        );

        const score = scoreLead(analysis, {
          hasPhone: Boolean(candidate.phone),
          hasEmail: Boolean(candidate.email),
          hasSocial: Boolean(candidate.instagram_url || candidate.facebook_url),
        });

        // 6. Apply campaign filters before writing anything.
        // Leads that fail filters are never saved — no DB entry is created.
        if (minScore != null && score < minScore) {
          skippedBelowScore++;
          continue;
        }
        if (skipWithWebsite && analysis.website_status === "ok") {
          skippedHasWebsite++;
          continue;
        }

        // 7. Passed filters — persist and enrich.
        const lead = await saveLead({ ...candidate, status: "new" });

        const savedAnalysis = await saveAnalysis({
          lead_id: lead.id,
          ...analysis,
          lead_score: score,
        });

        const outreach = await writeGeorgianOutreach(
          {
            business_name: lead.business_name,
            category: lead.category,
            city: lead.city,
          },
          savedAnalysis,
          effectiveSettings,
        );

        await saveGeneratedMessage({
          lead_id: lead.id,
          message_type: "outreach",
          language: outreach.language,
          body: outreach.body,
        });

        // Draft is ready for Beso's review — NOT sent.
        await updateLead(lead.id, { status: "ready" });
        if (campaignId) await linkLeadToCampaign(campaignId, lead.id);

        if (score >= HIGH_VALUE_THRESHOLD) highValue++;
        saved++;
        leadIds.push(lead.id);
      } catch (err) {
        errors.push(
          `${candidate.business_name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    const summary = buildSummary({
      totalFound,
      saved,
      skippedDuplicates,
      skippedBelowScore,
      skippedHasWebsite,
      highValue,
      errorCount: errors.length,
    });

    if (!skipAgentRun) {
      await updateAgentRun(run.id, {
        status: "completed",
        total_found: totalFound,
        saved,
        skipped_duplicates: skippedDuplicates,
        high_value_leads: highValue,
        errors,
        summary,
        finished_at: nowISO(),
      });
    }

    return {
      runId: run.id,
      totalFound,
      saved,
      skippedDuplicates,
      skippedBelowScore,
      skippedHasWebsite,
      highValueLeads: highValue,
      errors,
      leadIds,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(message);
    if (!skipAgentRun) {
      await updateAgentRun(run.id, {
        status: "failed",
        total_found: totalFound,
        saved,
        skipped_duplicates: skippedDuplicates,
        high_value_leads: highValue,
        errors,
        summary: `Run failed: ${message}`,
        finished_at: nowISO(),
      });
    }
    return {
      runId: run.id,
      totalFound,
      saved,
      skippedDuplicates,
      skippedBelowScore,
      skippedHasWebsite,
      highValueLeads: highValue,
      errors,
      leadIds,
    };
  }
}

function buildSummary(s: {
  totalFound: number;
  saved: number;
  skippedDuplicates: number;
  skippedBelowScore: number;
  skippedHasWebsite: number;
  highValue: number;
  errorCount: number;
}): string {
  const provider =
    searchProvider === "google_places" ? "Google Places" : "demo data";
  const ai = claudeEnabled ? "Claude" : "heuristic (no API key)";
  const skippedParts: string[] = [];
  if (s.skippedDuplicates) skippedParts.push(`${s.skippedDuplicates} duplicate(s)`);
  if (s.skippedBelowScore) skippedParts.push(`${s.skippedBelowScore} below score`);
  if (s.skippedHasWebsite) skippedParts.push(`${s.skippedHasWebsite} has website`);
  return (
    `Searched via ${provider}; analyzed with ${ai}. ` +
    `Found ${s.totalFound}, saved ${s.saved}` +
    (skippedParts.length ? `, skipped: ${skippedParts.join(", ")}` : "") +
    `, ${s.highValue} high-value lead(s)` +
    (s.errorCount ? `, ${s.errorCount} error(s).` : ".")
  );
}
