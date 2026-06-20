/**
 * Core domain types for Beso Client Hunter.
 *
 * These mirror the Supabase/Postgres schema in `supabase/schema.sql` and are
 * the single source of truth shared by the agent, the data layer and the UI.
 */

// ---------------------------------------------------------------------------
// Enums / literal unions
// ---------------------------------------------------------------------------

export type LeadStatus =
  | "new"              // freshly added, not analyzed yet
  | "ready"            // a draft outreach message is ready for review
  | "approved"         // outreach draft approved, ready to send manually
  | "contacted"        // reached out
  | "replied"          // prospect replied
  | "not_interested"   // prospect said no
  | "potential_client" // interested, in conversation
  | "won";             // signed as a paying client

export type LeadSource = "manual" | "agent" | "demo" | "google_places" | "csv";

/** How healthy the prospect's current web presence is. */
export type WebsiteStatus =
  | "none" // no website at all — strongest signal
  | "social_only" // only Instagram/Facebook, no real site
  | "outdated" // has a site but old / weak
  | "broken" // site exists but errors / does not load
  | "ok" // decent site, lower priority
  | "unknown"; // could not determine

export type Confidence = "low" | "medium" | "high";

export type MessageType = "outreach" | "follow_up";

/** ka = Georgian (ქართული), en = English, ru = Russian. */
export type MessageLanguage = "ka" | "en" | "ru";

export type ContactChannel =
  | "phone"
  | "email"
  | "instagram"
  | "facebook"
  | "in_person"
  | "other";

export type ContactOutcome =
  | "no_answer"
  | "interested"
  | "not_interested"
  | "callback"
  | "meeting"
  | "other";

export type AgentRunStatus = "running" | "completed" | "failed";

export type OutreachTone = "friendly" | "professional" | "direct" | "warm";

export type Market = "Georgia" | "USA";

// ---------------------------------------------------------------------------
// Table row types
// ---------------------------------------------------------------------------

export interface Lead {
  id: string;
  business_name: string;
  category: string | null;
  city: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  phone: string | null;
  email: string | null;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadAnalysis {
  id: string;
  lead_id: string;
  website_status: WebsiteStatus;
  problems_found: string[];
  business_strengths: string[];
  why_they_need_website: string;
  lead_score: number; // 0–100
  suggested_price_range_gel: string;
  best_outreach_angle: string;
  confidence: Confidence;
  created_at: string;
}

export interface GeneratedMessage {
  id: string;
  lead_id: string;
  message_type: MessageType;
  language: MessageLanguage;
  body: string;
  approved: boolean;
  created_at: string;
}

export interface ContactAttempt {
  id: string;
  lead_id: string;
  channel: ContactChannel;
  outcome: ContactOutcome | null;
  note: string | null;
  created_at: string;
}

export interface AgentRun {
  id: string;
  status: AgentRunStatus;
  city: string | null;
  category: string | null;
  max_results: number;
  total_found: number;
  saved: number;
  skipped_duplicates: number;
  high_value_leads: number;
  errors: string[];
  summary: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface Settings {
  id: string;
  my_name: string;
  service_description: string;
  market: Market;
  preferred_cities: string[];
  preferred_categories: string[];
  default_price_min_gel: number;
  default_price_max_gel: number;
  tone: OutreachTone;
  default_language: MessageLanguage;
  signature: string;
  contact_phone: string | null;
  contact_email: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Composite / view models used by the UI
// ---------------------------------------------------------------------------

export interface LeadWithDetails extends Lead {
  analysis: LeadAnalysis | null;
  messages: GeneratedMessage[];
  contact_attempts: ContactAttempt[];
}

export interface DashboardStats {
  total: number;
  ready: number;
  approved: number;
  contacted: number;
  replied: number;
  not_interested: number;
  potential_client: number;
  won: number;
  highValue: number;
}

/** Summary object returned by `runClientHunterAgent`. */
export interface AgentRunSummary {
  runId: string;
  totalFound: number;
  saved: number;
  skippedDuplicates: number;
  skippedBelowScore: number;
  skippedHasWebsite: number;
  highValueLeads: number;
  errors: string[];
  leadIds: string[];
}

// ---------------------------------------------------------------------------
// Campaign Agent
// ---------------------------------------------------------------------------

export type CampaignStatus = "pending" | "running" | "completed" | "failed";

export interface Campaign {
  id: string;
  name: string;
  market: Market;
  cities: string[];
  categories: string[];
  max_per_pair: number;
  min_score: number;
  skip_with_website: boolean;
  prioritize_social_only: boolean;
  prioritize_tourism: boolean;
  status: CampaignStatus;
  started_at: string | null;
  completed_at: string | null;
  total_pairs: number;
  pairs_done: number;
  total_found: number;
  total_saved: number;
  total_skipped_duplicate: number;
  total_skipped_below_score: number;
  total_skipped_has_website: number;
  total_high_value: number;
  created_at: string;
}

export interface CampaignPair {
  id: string;
  campaign_id: string;
  city: string;
  category: string;
  status: CampaignStatus;
  found: number;
  saved: number;
  skipped_duplicate: number;
  skipped_below_score: number;
  skipped_has_website: number;
  high_value: number;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CampaignWithPairs extends Campaign {
  pairs: CampaignPair[];
}
