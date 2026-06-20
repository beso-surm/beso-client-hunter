/**
 * Tool: analyzeBusiness(leadData, websiteData)
 *
 * Returns a validated qualitative analysis. Uses Claude when an API key is
 * configured; otherwise falls back to a deterministic heuristic so the
 * pipeline still runs (flagged via `aiUsed: false`, confidence "low").
 */

import "server-only";
import { claudeEnabled, generateJSON } from "@/lib/claude";
import { analysisAISchema, type AnalysisAI } from "@/lib/schemas";
import { buildAnalysisPrompt } from "@/agents/prompts/analyze";
import type { WebsiteData } from "@/agents/tools/checkWebsite";
import type { Settings, WebsiteStatus } from "@/types";

export interface AnalyzeLeadData {
  business_name: string;
  category: string | null;
  city: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  phone: string | null;
  email: string | null;
}

export interface AnalyzeResult {
  analysis: AnalysisAI;
  aiUsed: boolean;
}

export async function analyzeBusiness(
  lead: AnalyzeLeadData,
  website: WebsiteData,
  settings: Settings,
): Promise<AnalyzeResult> {
  if (claudeEnabled) {
    const { system, user } = buildAnalysisPrompt({
      businessName: lead.business_name,
      category: lead.category,
      city: lead.city,
      websiteUrl: lead.website_url,
      instagramUrl: lead.instagram_url,
      facebookUrl: lead.facebook_url,
      phone: lead.phone,
      email: lead.email,
      website,
      settings,
    });
    const analysis = await generateJSON({
      system,
      user,
      schema: analysisAISchema,
      maxTokens: 1600,
    });
    return { analysis, aiUsed: true };
  }

  return { analysis: heuristicAnalysis(lead, website, settings), aiUsed: false };
}

function deriveStatus(
  lead: AnalyzeLeadData,
  website: WebsiteData,
): WebsiteStatus {
  if (lead.website_url) {
    if (website.reachable) return "ok";
    return "broken";
  }
  if (lead.instagram_url || lead.facebook_url) return "social_only";
  return "none";
}

function heuristicAnalysis(
  lead: AnalyzeLeadData,
  website: WebsiteData,
  settings: Settings,
): AnalysisAI {
  const status = deriveStatus(lead, website);
  const cat = (lead.category ?? "business").toLowerCase();
  const city = lead.city ?? "Georgia";

  const problemsByStatus: Record<WebsiteStatus, string[]> = {
    none: [
      "No website — the business is effectively invisible on Google search.",
      "Customers cannot see services, prices or opening hours online.",
      "No online booking or contact form to capture enquiries.",
    ],
    social_only: [
      "Only present on social media — no website to rank on Google.",
      "Relies on DMs; many customers won't message and just move on.",
      "No structured info (prices, menu, rooms) that a site would provide.",
    ],
    broken: [
      "The website on file does not load — broken sites damage trust and SEO.",
      "Visitors who click through hit an error and leave.",
    ],
    outdated: [
      "The current site looks outdated and may not be mobile-friendly.",
      "Likely missing modern booking/contact functionality.",
    ],
    ok: [
      "Has a site, but there may be room to improve speed, SEO or conversions.",
    ],
    unknown: [
      "Web presence could not be confirmed — worth a manual check.",
    ],
  };

  const strengths: string[] = [];
  if (lead.instagram_url || lead.facebook_url)
    strengths.push("Already active on social media with an existing audience.");
  strengths.push(`Operates in ${city}, a market with steady customer demand.`);

  return {
    website_status: status,
    problems_found: problemsByStatus[status],
    business_strengths: strengths,
    why_they_need_website: `A modern, mobile-friendly website would help this ${cat} in ${city} get found on Google, present its offering clearly, and capture direct enquiries instead of losing them to competitors and platforms.`,
    suggested_price_range_gel: `${settings.default_price_min_gel}–${settings.default_price_max_gel} GEL`,
    best_outreach_angle:
      status === "none" || status === "social_only"
        ? "They have no real website yet — lead with how a simple site captures customers who search on Google."
        : status === "broken"
          ? "Their site is broken — lead with fixing it fast before it costs more customers."
          : "Lead with measurable improvements: speed, mobile and more enquiries.",
    confidence: "low",
  };
}
