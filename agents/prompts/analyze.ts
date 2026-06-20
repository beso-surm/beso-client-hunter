/** Prompt builder for the business-analysis step. */

import type { Settings } from "@/types";
import type { WebsiteData } from "@/agents/tools/checkWebsite";

export interface AnalysisPromptInput {
  businessName: string;
  category: string | null;
  city: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  phone: string | null;
  email: string | null;
  website: WebsiteData;
  settings: Settings;
}

export function buildAnalysisPrompt(input: AnalysisPromptInput): {
  system: string;
  user: string;
} {
  const { settings } = input;

  const system = [
    `You are a lead-qualification analyst for ${settings.my_name}, a freelance web developer in Georgia (the country).`,
    `${settings.my_name}'s service: ${settings.service_description}`,
    "",
    "Your job: assess one local business as a potential website client and return a strict JSON object.",
    "",
    "Rules:",
    "- Base every conclusion ONLY on the facts provided. Do not invent contact details, traffic numbers, or claims you cannot support.",
    "- If something is unknown, say so and lower your confidence rather than guessing.",
    "- Think about the Georgian market: many small hospitality/tourism businesses rely only on Instagram or booking.com and lose direct customers.",
    "- Be concrete and practical. Problems and strengths should be specific to THIS business.",
    `- Suggest a price range in GEL within ${settings.my_name}'s normal band (${settings.default_price_min_gel}–${settings.default_price_max_gel} GEL), adjusted for the apparent size of the business.`,
    "",
    "Respond with ONLY a single JSON object, no markdown, matching exactly:",
    "{",
    '  "website_status": "none" | "social_only" | "outdated" | "broken" | "ok" | "unknown",',
    '  "problems_found": string[],            // 2–6 concrete problems with their current web presence',
    '  "business_strengths": string[],        // 1–4 things they do well that a site could amplify',
    '  "why_they_need_website": string,       // 1–3 sentences, persuasive but honest',
    '  "suggested_price_range_gel": string,   // e.g. "1000–1800 GEL"',
    '  "best_outreach_angle": string,         // the single most compelling hook for the first message',
    '  "confidence": "low" | "medium" | "high"',
    "}",
  ].join("\n");

  const w = input.website;
  const websiteFindings = !input.websiteUrl
    ? "No website URL on file."
    : [
        `Checked URL: ${w.checkedUrl}`,
        `Reachable: ${w.reachable ? "yes" : "no"}${w.statusCode ? ` (HTTP ${w.statusCode})` : ""}`,
        w.title ? `Page title: ${w.title}` : null,
        w.excerpt ? `Page text excerpt: ${w.excerpt}` : null,
        w.error ? `Fetch error: ${w.error}` : null,
      ]
        .filter(Boolean)
        .join("\n");

  const user = [
    "Analyze this business:",
    "",
    `Business name: ${input.businessName}`,
    `Category: ${input.category ?? "unknown"}`,
    `City: ${input.city ?? "unknown"}`,
    `Website URL on file: ${input.websiteUrl ?? "none"}`,
    `Instagram: ${input.instagramUrl ?? "none"}`,
    `Facebook: ${input.facebookUrl ?? "none"}`,
    `Phone on file: ${input.phone ?? "unknown"}`,
    `Email on file: ${input.email ?? "unknown"}`,
    "",
    "Website check findings:",
    websiteFindings,
  ].join("\n");

  return { system, user };
}
