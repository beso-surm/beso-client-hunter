/** Prompt builders for outreach + follow-up message drafting. */

import type { LeadAnalysis, MessageLanguage, Settings } from "@/types";
import { LANGUAGES, TONES } from "@/lib/constants";

function languageName(lang: MessageLanguage): string {
  return LANGUAGES.find((l) => l.value === lang)?.label ?? "Georgian";
}

function toneName(settings: Settings): string {
  return TONES.find((t) => t.value === settings.tone)?.label ?? "friendly";
}

interface OutreachInput {
  businessName: string;
  category: string | null;
  city: string | null;
  analysis: LeadAnalysis;
  settings: Settings;
  language: MessageLanguage;
}

export function buildOutreachPrompt(input: OutreachInput): {
  system: string;
  user: string;
} {
  const { settings, language } = input;

  const locationCtx = settings.market === "USA" ? "serving US local businesses" : "based in Georgia";
  const cityFallback = settings.market === "USA" ? "the US" : "Georgia";

  const system = [
    `You write first-contact outreach messages for ${settings.my_name}, a freelance web developer ${locationCtx}.`,
    `Write in ${languageName(language)}. Tone: ${toneName(settings)}.`,
    "",
    "Hard rules:",
    "- This is a DRAFT for human review. Never imply it has been sent.",
    "- Do NOT invent facts, fake testimonials, fake discounts, or contact details.",
    "- Keep it short: 4–8 short lines. It should read like a real person, not an ad.",
    "- Open by referencing something specific and genuine about the business.",
    "- Make ONE clear, low-pressure offer and ONE simple call to action.",
    `- Sign off as: ${settings.signature || settings.my_name}`,
    language === "ka"
      ? "- Write natural, fluent Georgian (ქართული). Avoid robotic or machine-translated phrasing."
      : "",
    "",
    'Respond with ONLY this JSON object: { "body": string }',
  ]
    .filter(Boolean)
    .join("\n");

  const user = [
    "Write the outreach message for this prospect.",
    "",
    `Business: ${input.businessName} (${input.category ?? "business"}, ${input.city ?? cityFallback})`,
    `Best angle to lead with: ${input.analysis.best_outreach_angle}`,
    `Why they need a website: ${input.analysis.why_they_need_website}`,
    `Their main problems: ${input.analysis.problems_found.join("; ")}`,
    `Their strengths to acknowledge: ${input.analysis.business_strengths.join("; ") || "n/a"}`,
    `Suggested price range to (optionally) hint at: ${input.analysis.suggested_price_range_gel}`,
  ].join("\n");

  return { system, user };
}

interface FollowUpInput {
  businessName: string;
  category: string | null;
  city: string | null;
  previousMessage: string;
  settings: Settings;
  language: MessageLanguage;
}

export function buildFollowUpPrompt(input: FollowUpInput): {
  system: string;
  user: string;
} {
  const { settings, language } = input;

  const locationCtxFu = settings.market === "USA" ? "serving US local businesses" : "based in Georgia";
  const cityFallbackFu = settings.market === "USA" ? "the US" : "Georgia";

  const system = [
    `You write polite follow-up messages for ${settings.my_name}, a freelance web developer ${locationCtxFu}.`,
    `Write in ${languageName(language)}. Tone: ${toneName(settings)}.`,
    "",
    "Hard rules:",
    "- This is a DRAFT for human review. Never imply it has been sent.",
    "- It is a gentle nudge after no reply — short, warm, never pushy or guilt-tripping.",
    "- 3–5 short lines. Add one small new piece of value or reassurance.",
    "- Do not repeat the first message verbatim.",
    `- Sign off as: ${settings.signature || settings.my_name}`,
    "",
    'Respond with ONLY this JSON object: { "body": string }',
  ].join("\n");

  const user = [
    "Write a follow-up message.",
    "",
    `Business: ${input.businessName} (${input.category ?? "business"}, ${input.city ?? cityFallbackFu})`,
    "",
    "The first message that received no reply was:",
    '"""',
    input.previousMessage,
    '"""',
  ].join("\n");

  return { system, user };
}
