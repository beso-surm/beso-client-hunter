/**
 * Zod schemas — the validation boundary for everything that crosses into the
 * system: AI output, form submissions and agent input.
 *
 * Rule: we never trust messy AI output. The agent validates every model
 * response against `analysisAISchema` / `messageAISchema` and retries once.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// AI output schemas
// ---------------------------------------------------------------------------

export const analysisAISchema = z.object({
  website_status: z.enum([
    "none",
    "social_only",
    "outdated",
    "broken",
    "ok",
    "unknown",
  ]),
  problems_found: z.array(z.string().min(1)).max(8),
  business_strengths: z.array(z.string().min(1)).max(8),
  why_they_need_website: z.string().min(1).max(800),
  suggested_price_range_gel: z.string().min(1).max(60),
  best_outreach_angle: z.string().min(1).max(400),
  confidence: z.enum(["low", "medium", "high"]),
});

export type AnalysisAI = z.infer<typeof analysisAISchema>;

export const messageAISchema = z.object({
  body: z.string().min(1).max(2000),
});

export type MessageAI = z.infer<typeof messageAISchema>;

// ---------------------------------------------------------------------------
// Form / action input schemas
// ---------------------------------------------------------------------------

const optionalUrl = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .or(z.literal(""))
  .optional()
  .transform((v) => (v ? v : null));

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length ? v : null));

export const newLeadSchema = z.object({
  business_name: z.string().trim().min(2, "Business name is required").max(160),
  category: optionalText,
  city: optionalText,
  website_url: optionalUrl,
  instagram_url: optionalUrl,
  facebook_url: optionalUrl,
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
  notes: optionalText,
});

export type NewLeadInput = z.input<typeof newLeadSchema>;

export const updateStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    "new",
    "ready",
    "approved",
    "contacted",
    "replied",
    "not_interested",
    "potential_client",
    "won",
  ]),
});

export const runAgentSchema = z.object({
  city: z.string().trim().min(1, "Pick a city"),
  categories: z
    .array(z.string().trim().min(1))
    .min(1, "Pick at least one category"),
  maxResults: z.coerce.number().int().min(1).max(25).default(8),
});

export type RunAgentInput = z.input<typeof runAgentSchema>;

export const settingsSchema = z.object({
  my_name: z.string().trim().min(1).max(120),
  service_description: z.string().trim().min(1).max(1200),
  market: z.enum(["Georgia", "USA"]).default("Georgia"),
  preferred_cities: z.array(z.string()).default([]),
  preferred_categories: z.array(z.string()).default([]),
  default_price_min_gel: z.coerce.number().int().min(0).max(100000),
  default_price_max_gel: z.coerce.number().int().min(0).max(100000),
  tone: z.enum(["friendly", "warm", "professional", "direct"]),
  default_language: z.enum(["ka", "en", "ru"]),
  signature: z.string().trim().max(200).default(""),
  contact_phone: optionalText,
  contact_email: z
    .string()
    .trim()
    .email("Invalid email")
    .or(z.literal(""))
    .optional()
    .transform((v) => (v ? v : null)),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export const contactAttemptSchema = z.object({
  lead_id: z.string().min(1),
  channel: z.enum([
    "phone",
    "email",
    "instagram",
    "facebook",
    "in_person",
    "other",
  ]),
  outcome: z
    .enum([
      "no_answer",
      "interested",
      "not_interested",
      "callback",
      "meeting",
      "other",
    ])
    .optional(),
  note: optionalText,
});
