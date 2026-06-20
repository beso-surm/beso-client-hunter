/**
 * Static option lists used across the agent and the UI.
 *
 * These are intentionally Georgia-focused because Beso targets local
 * hospitality / tourism / service businesses.
 */

import type {
  LeadStatus,
  MessageLanguage,
  OutreachTone,
  WebsiteStatus,
  Confidence,
} from "@/types";

export const CITIES = [
  "Tbilisi",
  "Batumi",
  "Kutaisi",
  "Rustavi",
  "Gori",
  "Zugdidi",
  "Telavi",
  "Mtskheta",
  "Sighnaghi",
  "Borjomi",
  "Bakuriani",
  "Gudauri",
  "Mestia",
  "Kazbegi",
] as const;

export const CATEGORIES = [
  "Hotel",
  "Guesthouse",
  "Cottage / Villa",
  "Cafe",
  "Restaurant",
  "Car Wash",
  "Beauty Salon",
  "Spa",
  "Tour Operator",
  "Winery",
  "Bakery",
  "Bar",
] as const;

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "ready", label: "Ready to review" },
  { value: "approved", label: "Approved" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "not_interested", label: "Not interested" },
  { value: "potential_client", label: "Potential client" },
  { value: "won", label: "Won" },
];

export const WEBSITE_STATUS_LABELS: Record<WebsiteStatus, string> = {
  none: "No website",
  social_only: "Social only",
  outdated: "Outdated site",
  broken: "Broken site",
  ok: "Has a site",
  unknown: "Unknown",
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export const LANGUAGES: { value: MessageLanguage; label: string }[] = [
  { value: "ka", label: "Georgian (ქართული)" },
  { value: "en", label: "English" },
  { value: "ru", label: "Russian (русский)" },
];

export const TONES: { value: OutreachTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "warm", label: "Warm" },
  { value: "professional", label: "Professional" },
  { value: "direct", label: "Direct" },
];

/** A high-value lead is anything scoring at or above this threshold. */
export const HIGH_VALUE_THRESHOLD = 70;

/** Extended city list used by the Campaign Agent. */
export const CAMPAIGN_CITIES = [
  "Tbilisi", "Batumi", "Kutaisi", "Kazbegi", "Gudauri", "Bakuriani",
  "Borjomi", "Sairme", "Mestia", "Telavi", "Sighnaghi", "Kobuleti", "Gonio",
  "Rustavi", "Gori", "Zugdidi", "Mtskheta",
] as const;

/** Extended category list used by the Campaign Agent. */
export const CAMPAIGN_CATEGORIES = [
  "Café", "Restaurant", "Cottage", "Guesthouse", "Small Hotel",
  "Wine Cellar", "Tourist Experience", "Beauty Salon", "Gym",
  "Hotel", "Spa", "Tour Operator", "Winery", "Bar", "Car Wash", "Bakery",
] as const;

export const DEFAULT_CAMPAIGN_CITIES = ["Tbilisi", "Batumi", "Kutaisi"];
export const DEFAULT_CAMPAIGN_CATEGORIES = ["Café", "Restaurant", "Guesthouse", "Cottage"];

export const FIXED_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
