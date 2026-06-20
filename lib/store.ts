/**
 * In-memory fallback store.
 *
 * Used when Supabase env vars are not configured so the whole app — including
 * the agent pipeline — runs out of the box. Data lives in a process-global
 * singleton (survives Next.js HMR in dev) and resets on server restart.
 */

import "server-only";
import { FIXED_SETTINGS_ID } from "@/lib/constants";
import { normalizeName, nowISO, uuid } from "@/lib/utils";
import type {
  AgentRun,
  ContactAttempt,
  GeneratedMessage,
  Lead,
  LeadAnalysis,
  Settings,
} from "@/types";

interface MemoryData {
  leads: Lead[];
  analyses: LeadAnalysis[];
  messages: GeneratedMessage[];
  attempts: ContactAttempt[];
  runs: AgentRun[];
  settings: Settings;
}

function defaultSettings(): Settings {
  return {
    id: FIXED_SETTINGS_ID,
    my_name: "Beso Surmava",
    service_description:
      "I design and build fast, modern websites for hotels, cottages, cafes, restaurants, car washes, beauty salons and tourism businesses in Georgia. Mobile-friendly, multilingual (EN/KA/RU), with booking and contact forms.",
    preferred_cities: ["Kutaisi", "Batumi", "Tbilisi"],
    preferred_categories: ["Hotel", "Guesthouse", "Cottage / Villa", "Cafe", "Restaurant"],
    default_price_min_gel: 800,
    default_price_max_gel: 2500,
    tone: "friendly",
    default_language: "ka",
    signature: "Beso Surmava — Web Developer",
    contact_phone: null,
    contact_email: "besosurm12@gmail.com",
    updated_at: nowISO(),
  };
}

function seed(): MemoryData {
  const now = nowISO();
  const leadA: Lead = {
    id: uuid(),
    business_name: "Sample Guesthouse Imereti",
    category: "Guesthouse",
    city: "Kutaisi",
    website_url: null,
    instagram_url: "https://instagram.com/example_guesthouse",
    facebook_url: null,
    phone: null,
    email: null,
    source: "demo",
    status: "ready",
    notes: "Demo lead — replace with a real prospect.",
    created_at: now,
    updated_at: now,
  };
  const leadB: Lead = {
    id: uuid(),
    business_name: "Sample Seaside Cafe",
    category: "Cafe",
    city: "Batumi",
    website_url: null,
    instagram_url: "https://instagram.com/example_cafe",
    facebook_url: null,
    phone: null,
    email: null,
    source: "demo",
    status: "new",
    notes: "Demo lead — replace with a real prospect.",
    created_at: now,
    updated_at: now,
  };

  const analysisA: LeadAnalysis = {
    id: uuid(),
    lead_id: leadA.id,
    website_status: "social_only",
    problems_found: [
      "No website — only an Instagram page, so they are invisible on Google.",
      "Guests cannot check rooms, prices or availability online.",
      "No booking or contact form; enquiries rely on DMs.",
    ],
    business_strengths: [
      "Active Instagram with real photos and engaged followers.",
      "Located in a popular tourist region (Imereti / Kutaisi).",
    ],
    why_they_need_website:
      "A guesthouse relying only on Instagram loses direct bookings to OTAs and to competitors who rank on Google. A simple multilingual site with rooms, prices and a booking form would capture organic traffic and direct reservations.",
    lead_score: 78,
    suggested_price_range_gel: "1000–1800 GEL",
    best_outreach_angle:
      "Lead with direct bookings: a small site lets them take reservations without paying booking.com commissions.",
    confidence: "high",
    created_at: now,
  };

  const messageA: GeneratedMessage = {
    id: uuid(),
    lead_id: leadA.id,
    message_type: "outreach",
    language: "ka",
    body:
      "გამარჯობა! 👋 ვნახე თქვენი სასტუმროს გვერდი Instagram-ზე — ძალიან ლამაზი ფოტოები და სტუმრების კარგი შეფასებები გაქვთ.\n\nშევამჩნიე, რომ ვებგვერდი არ გაქვთ. დღეს სტუმრების უმეტესობა ჯერ Google-ში ეძებს და თუ საიტი არ გაქვთ, პირდაპირ ჯავშნებს კარგავთ.\n\nმე ვაკეთებ სწრაფ, მობილურზე მორგებულ საიტებს სასტუმროებისთვის — ოთახებით, ფასებით და ჯავშნის ფორმით (ქართ./ინგ./რუს.). ასე პირდაპირ მიიღებთ ჯავშნებს booking.com-ის საკომისიოს გარეშე.\n\nთუ დაინტერესდებით, სიამოვნებით გაჩვენებთ მაგალითს.\n\nპატივისცემით,\nბესო სურმავა — ვებ დეველოპერი",
    approved: false,
    created_at: now,
  };

  return {
    leads: [leadA, leadB],
    analyses: [analysisA],
    messages: [messageA],
    attempts: [],
    runs: [],
    settings: defaultSettings(),
  };
}

// Process-global singleton so data survives HMR module reloads in dev.
const globalForStore = globalThis as unknown as { __bchStore?: MemoryData };
export const memory: MemoryData = (globalForStore.__bchStore ??= seed());

// --- helpers used by repo.ts ----------------------------------------------

export function findLeadByNameCityMem(name: string, city: string | null): Lead | null {
  const n = normalizeName(name);
  const c = (city ?? "").trim().toLowerCase();
  return (
    memory.leads.find(
      (l) =>
        normalizeName(l.business_name) === n &&
        (l.city ?? "").trim().toLowerCase() === c,
    ) ?? null
  );
}
