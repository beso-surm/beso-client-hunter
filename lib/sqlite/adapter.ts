/**
 * SQLite implementations of all repo functions.
 * Called by lib/repo.ts when dataMode === "sqlite".
 */

import "server-only";
import { getDb } from "@/lib/sqlite/db";
import { normalizeName, nowISO, uuid } from "@/lib/utils";
import { HIGH_VALUE_THRESHOLD, FIXED_SETTINGS_ID, CITIES, CAMPAIGN_CITIES, US_CITIES, US_CAMPAIGN_CITIES } from "@/lib/constants";
import type {
  AgentRun,
  AgentRunStatus,
  Confidence,
  ContactAttempt,
  ContactChannel,
  ContactOutcome,
  GeneratedMessage,
  Lead,
  LeadAnalysis,
  LeadSource,
  LeadStatus,
  MessageLanguage,
  MessageType,
  Settings,
  WebsiteStatus,
  DashboardStats,
} from "@/types";
import type {
  CreateLeadData,
  CreateMessageData,
  CreateAttemptData,
  LeadFilters,
  LeadWithAnalysis,
  UpsertAnalysisData,
} from "@/lib/repo";

// ---------------------------------------------------------------------------
// Row → domain type converters
// ---------------------------------------------------------------------------

function arr(v: unknown): string[] {
  if (!v) return [];
  try { return JSON.parse(v as string) as string[]; }
  catch { return []; }
}

function rowToLead(r: Record<string, unknown>): Lead {
  return {
    id: r.id as string,
    business_name: r.business_name as string,
    category: (r.category as string) ?? null,
    city: (r.city as string) ?? null,
    website_url: (r.website_url as string) ?? null,
    instagram_url: (r.instagram_url as string) ?? null,
    facebook_url: (r.facebook_url as string) ?? null,
    phone: (r.phone as string) ?? null,
    email: (r.email as string) ?? null,
    source: r.source as LeadSource,
    status: r.status as LeadStatus,
    notes: (r.notes as string) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}

function rowToAnalysis(r: Record<string, unknown>): LeadAnalysis {
  return {
    id: r.id as string,
    lead_id: r.lead_id as string,
    website_status: r.website_status as WebsiteStatus,
    problems_found: arr(r.problems_found),
    business_strengths: arr(r.business_strengths),
    why_they_need_website: (r.why_they_need_website as string) ?? "",
    lead_score: r.lead_score as number,
    suggested_price_range_gel: (r.suggested_price_range_gel as string) ?? "",
    best_outreach_angle: (r.best_outreach_angle as string) ?? "",
    confidence: r.confidence as Confidence,
    created_at: r.created_at as string,
  };
}

function rowToMessage(r: Record<string, unknown>): GeneratedMessage {
  return {
    id: r.id as string,
    lead_id: r.lead_id as string,
    message_type: r.message_type as MessageType,
    language: r.language as MessageLanguage,
    body: r.body as string,
    approved: Boolean(r.approved),
    created_at: r.created_at as string,
  };
}

function rowToAttempt(r: Record<string, unknown>): ContactAttempt {
  return {
    id: r.id as string,
    lead_id: r.lead_id as string,
    channel: r.channel as ContactChannel,
    outcome: ((r.outcome as string) ?? null) as ContactOutcome | null,
    note: (r.note as string) ?? null,
    created_at: r.created_at as string,
  };
}

function rowToRun(r: Record<string, unknown>): AgentRun {
  return {
    id: r.id as string,
    status: r.status as AgentRunStatus,
    city: (r.city as string) ?? null,
    category: (r.category as string) ?? null,
    max_results: r.max_results as number,
    total_found: r.total_found as number,
    saved: r.saved as number,
    skipped_duplicates: r.skipped_duplicates as number,
    high_value_leads: r.high_value_leads as number,
    errors: arr(r.errors),
    summary: (r.summary as string) ?? null,
    started_at: r.started_at as string,
    finished_at: (r.finished_at as string) ?? null,
  };
}

function rowToSettings(r: Record<string, unknown>): Settings {
  return {
    id: r.id as string,
    my_name: (r.my_name as string) ?? "",
    service_description: (r.service_description as string) ?? "",
    market: ((r.market as string) ?? "Georgia") as Settings["market"],
    preferred_cities: arr(r.preferred_cities),
    preferred_categories: arr(r.preferred_categories),
    default_price_min_gel: r.default_price_min_gel as number,
    default_price_max_gel: r.default_price_max_gel as number,
    tone: (r.tone as Settings["tone"]) ?? "friendly",
    default_language: (r.default_language as MessageLanguage) ?? "ka",
    signature: (r.signature as string) ?? "",
    contact_phone: (r.contact_phone as string) ?? null,
    contact_email: (r.contact_email as string) ?? null,
    updated_at: r.updated_at as string,
  };
}

function db() {
  const d = getDb();
  if (!d) throw new Error("SQLite DB unavailable");
  return d;
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

const GEORGIA_CITY_LIST = [...new Set([...CITIES, ...CAMPAIGN_CITIES])];
const USA_CITY_LIST = [...new Set([...US_CITIES, ...US_CAMPAIGN_CITIES])];

function buildLeadQuery(filters: LeadFilters) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.city) {
    conditions.push("lower(l.city) = lower(?)");
    params.push(filters.city);
  } else if (filters.market) {
    const cities = filters.market === "USA" ? USA_CITY_LIST : GEORGIA_CITY_LIST;
    const placeholders = cities.map(() => "lower(?)").join(", ");
    conditions.push(`lower(coalesce(l.city,'')) IN (${placeholders})`);
    params.push(...cities);
  }
  if (filters.category) {
    conditions.push("lower(l.category) = lower(?)");
    params.push(filters.category);
  }
  if (filters.status) {
    conditions.push("l.status = ?");
    params.push(filters.status);
  }
  if (filters.q) {
    const q = `%${filters.q}%`;
    conditions.push(
      "(lower(l.business_name) LIKE lower(?) OR lower(coalesce(l.city,'')) LIKE lower(?) OR lower(coalesce(l.category,'')) LIKE lower(?) OR lower(coalesce(l.notes,'')) LIKE lower(?))",
    );
    params.push(q, q, q, q);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return { where, params, limit: filters.limit ?? 120 };
}

export function listLeadsWithAnalysis(filters: LeadFilters): LeadWithAnalysis[] {
  const { where, params, limit } = buildLeadQuery(filters);

  const rows = db()
    .prepare(
      `SELECT l.*,
              a.id          AS a_id,
              a.website_status,
              a.problems_found,
              a.business_strengths,
              a.why_they_need_website,
              a.lead_score,
              a.suggested_price_range_gel,
              a.best_outreach_angle,
              a.confidence,
              a.created_at  AS a_created_at
       FROM leads l
       LEFT JOIN lead_analyses a ON a.lead_id = l.id
       ${where}
       ORDER BY coalesce(a.lead_score, -1) DESC, l.updated_at DESC
       LIMIT ${limit}`,
    )
    .all(...params) as Record<string, unknown>[];

  return rows
    .map((r) => ({
      ...rowToLead(r),
      analysis: r.a_id
        ? rowToAnalysis({
            id: r.a_id,
            lead_id: r.id,
            website_status: r.website_status,
            problems_found: r.problems_found,
            business_strengths: r.business_strengths,
            why_they_need_website: r.why_they_need_website,
            lead_score: r.lead_score,
            suggested_price_range_gel: r.suggested_price_range_gel,
            best_outreach_angle: r.best_outreach_angle,
            confidence: r.confidence,
            created_at: r.a_created_at,
          })
        : null,
    }))
    .filter((l) =>
      filters.minScore != null
        ? (l.analysis?.lead_score ?? -1) >= filters.minScore
        : true,
    );
}

export function getLead(id: string): Lead | null {
  const r = db().prepare("SELECT * FROM leads WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return r ? rowToLead(r) : null;
}

export function findLeadByNameCity(name: string, city: string | null): Lead | null {
  const n = normalizeName(name);
  const c = (city ?? "").trim().toLowerCase();
  const rows = db()
    .prepare(
      "SELECT * FROM leads WHERE lower(business_name) LIKE ? AND lower(coalesce(city,'')) = ?",
    )
    .all(`%${n}%`, c) as Record<string, unknown>[];
  return rows.find((r) => normalizeName(r.business_name as string) === n)
    ? rowToLead(rows.find((r) => normalizeName(r.business_name as string) === n)!)
    : null;
}

export function createLead(input: CreateLeadData): Lead {
  const now = nowISO();
  const id = uuid();
  db()
    .prepare(
      `INSERT INTO leads (id, business_name, category, city, website_url, instagram_url,
        facebook_url, phone, email, source, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.business_name.trim(),
      input.category ?? null,
      input.city ?? null,
      input.website_url ?? null,
      input.instagram_url ?? null,
      input.facebook_url ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.source ?? "manual",
      input.status ?? "new",
      input.notes ?? null,
      now,
      now,
    );
  return getLead(id)!;
}

export function updateLead(
  id: string,
  patch: Partial<Omit<Lead, "id" | "created_at">>,
): Lead | null {
  if (!getLead(id)) return null;
  const cols = Object.keys(patch)
    .map((k) => `${k} = ?`)
    .join(", ");
  const vals = Object.values(patch);
  db()
    .prepare(`UPDATE leads SET ${cols}, updated_at = ? WHERE id = ?`)
    .run(...vals, nowISO(), id);
  return getLead(id);
}

export function deleteLead(id: string): void {
  db().prepare("DELETE FROM leads WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Analyses
// ---------------------------------------------------------------------------

export function getAnalysisByLead(leadId: string): LeadAnalysis | null {
  const r = db()
    .prepare("SELECT * FROM lead_analyses WHERE lead_id = ?")
    .get(leadId) as Record<string, unknown> | undefined;
  return r ? rowToAnalysis(r) : null;
}

export function upsertAnalysis(input: UpsertAnalysisData): LeadAnalysis {
  const existing = getAnalysisByLead(input.lead_id);
  if (existing) {
    db()
      .prepare(
        `UPDATE lead_analyses SET website_status=?, problems_found=?, business_strengths=?,
          why_they_need_website=?, lead_score=?, suggested_price_range_gel=?,
          best_outreach_angle=?, confidence=?
         WHERE lead_id=?`,
      )
      .run(
        input.website_status,
        JSON.stringify(input.problems_found),
        JSON.stringify(input.business_strengths),
        input.why_they_need_website,
        input.lead_score,
        input.suggested_price_range_gel,
        input.best_outreach_angle,
        input.confidence,
        input.lead_id,
      );
    return getAnalysisByLead(input.lead_id)!;
  }
  const id = uuid();
  const now = nowISO();
  db()
    .prepare(
      `INSERT INTO lead_analyses (id, lead_id, website_status, problems_found,
        business_strengths, why_they_need_website, lead_score, suggested_price_range_gel,
        best_outreach_angle, confidence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.lead_id,
      input.website_status,
      JSON.stringify(input.problems_found),
      JSON.stringify(input.business_strengths),
      input.why_they_need_website,
      input.lead_score,
      input.suggested_price_range_gel,
      input.best_outreach_angle,
      input.confidence,
      now,
    );
  return getAnalysisByLead(input.lead_id)!;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export function listMessagesByLead(leadId: string): GeneratedMessage[] {
  const rows = db()
    .prepare(
      "SELECT * FROM generated_messages WHERE lead_id = ? ORDER BY created_at DESC",
    )
    .all(leadId) as Record<string, unknown>[];
  return rows.map(rowToMessage);
}

export function createMessage(input: CreateMessageData): GeneratedMessage {
  const id = uuid();
  const now = nowISO();
  db()
    .prepare(
      `INSERT INTO generated_messages (id, lead_id, message_type, language, body, approved, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.lead_id,
      input.message_type,
      input.language,
      input.body,
      input.approved ? 1 : 0,
      now,
    );
  return db()
    .prepare("SELECT * FROM generated_messages WHERE id = ?")
    .get(id) as GeneratedMessage;
}

export function setMessageApproved(
  id: string,
  approved: boolean,
): GeneratedMessage | null {
  const r = db()
    .prepare("SELECT * FROM generated_messages WHERE id = ?")
    .get(id);
  if (!r) return null;
  db()
    .prepare("UPDATE generated_messages SET approved = ? WHERE id = ?")
    .run(approved ? 1 : 0, id);
  return rowToMessage(
    db()
      .prepare("SELECT * FROM generated_messages WHERE id = ?")
      .get(id) as Record<string, unknown>,
  );
}

export function getMessage(id: string): GeneratedMessage | null {
  const r = db()
    .prepare("SELECT * FROM generated_messages WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return r ? rowToMessage(r) : null;
}

export function listAllMessages(filter?: { approved?: boolean }): GeneratedMessage[] {
  let sql = "SELECT * FROM generated_messages";
  const params: (number | string)[] = [];
  if (filter?.approved !== undefined) {
    sql += " WHERE approved = ?";
    params.push(filter.approved ? 1 : 0);
  }
  sql += " ORDER BY created_at DESC";
  return (db().prepare(sql).all(...params) as Record<string, unknown>[]).map(
    rowToMessage,
  );
}

// ---------------------------------------------------------------------------
// Contact attempts
// ---------------------------------------------------------------------------

export function listAttemptsByLead(leadId: string): ContactAttempt[] {
  return (
    db()
      .prepare(
        "SELECT * FROM contact_attempts WHERE lead_id = ? ORDER BY created_at DESC",
      )
      .all(leadId) as Record<string, unknown>[]
  ).map(rowToAttempt);
}

export function createAttempt(input: CreateAttemptData): ContactAttempt {
  const id = uuid();
  const now = nowISO();
  db()
    .prepare(
      `INSERT INTO contact_attempts (id, lead_id, channel, outcome, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.lead_id, input.channel, input.outcome ?? null, input.note ?? null, now);
  return rowToAttempt(
    db()
      .prepare("SELECT * FROM contact_attempts WHERE id = ?")
      .get(id) as Record<string, unknown>,
  );
}

export function listAllAttempts(): ContactAttempt[] {
  return (
    db()
      .prepare("SELECT * FROM contact_attempts ORDER BY created_at DESC")
      .all() as Record<string, unknown>[]
  ).map(rowToAttempt);
}

// ---------------------------------------------------------------------------
// Agent runs
// ---------------------------------------------------------------------------

export function createAgentRun(input: {
  city: string | null;
  category: string | null;
  max_results: number;
}): AgentRun {
  const id = uuid();
  const now = nowISO();
  db()
    .prepare(
      `INSERT INTO agent_runs (id, status, city, category, max_results, total_found,
        saved, skipped_duplicates, high_value_leads, errors, summary, started_at, finished_at)
       VALUES (?, 'running', ?, ?, ?, 0, 0, 0, 0, '[]', null, ?, null)`,
    )
    .run(id, input.city, input.category, input.max_results, now);
  return rowToRun(
    db().prepare("SELECT * FROM agent_runs WHERE id = ?").get(id) as Record<
      string,
      unknown
    >,
  );
}

export function updateAgentRun(
  id: string,
  patch: Partial<AgentRun>,
): AgentRun | null {
  const r = db()
    .prepare("SELECT * FROM agent_runs WHERE id = ?")
    .get(id);
  if (!r) return null;

  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    mapped[k] = Array.isArray(v) ? JSON.stringify(v) : v;
  }

  const cols = Object.keys(mapped)
    .map((k) => `${k} = ?`)
    .join(", ");
  db()
    .prepare(`UPDATE agent_runs SET ${cols} WHERE id = ?`)
    .run(...Object.values(mapped), id);

  return rowToRun(
    db().prepare("SELECT * FROM agent_runs WHERE id = ?").get(id) as Record<
      string,
      unknown
    >,
  );
}

export function listAgentRuns(limit = 10): AgentRun[] {
  return (
    db()
      .prepare(
        "SELECT * FROM agent_runs ORDER BY started_at DESC LIMIT ?",
      )
      .all(limit) as Record<string, unknown>[]
  ).map(rowToRun);
}

// ---------------------------------------------------------------------------
// Settings (singleton)
// ---------------------------------------------------------------------------

export function getSettings(): Settings {
  const r = db()
    .prepare("SELECT * FROM settings WHERE id = ?")
    .get(FIXED_SETTINGS_ID) as Record<string, unknown> | undefined;
  if (r) return rowToSettings(r);

  // Shouldn't happen (seeded on DB open), but guard anyway.
  db()
    .prepare(
      `INSERT OR IGNORE INTO settings (id, my_name, service_description,
        preferred_cities, preferred_categories, default_price_min_gel, default_price_max_gel,
        tone, default_language, signature, contact_phone, contact_email, updated_at)
       VALUES (?, '', '', '[]', '[]', 800, 2500, 'friendly', 'ka', '', null, null, ?)`,
    )
    .run(FIXED_SETTINGS_ID, nowISO());
  return rowToSettings(
    db()
      .prepare("SELECT * FROM settings WHERE id = ?")
      .get(FIXED_SETTINGS_ID) as Record<string, unknown>,
  );
}

export function saveSettings(
  patch: Partial<Omit<Settings, "id" | "updated_at">>,
): Settings {
  const mapped: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    mapped[k] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  mapped.updated_at = nowISO();

  const cols = Object.keys(mapped)
    .map((k) => `${k} = ?`)
    .join(", ");
  db()
    .prepare(`UPDATE settings SET ${cols} WHERE id = ?`)
    .run(...Object.values(mapped), FIXED_SETTINGS_ID);
  return getSettings();
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getStats(): DashboardStats {
  const d = db();
  const statusRows = d
    .prepare("SELECT status, COUNT(*) as cnt FROM leads GROUP BY status")
    .all() as { status: string; cnt: number }[];
  const m: Record<string, number> = {};
  let total = 0;
  for (const r of statusRows) { m[r.status] = r.cnt; total += r.cnt; }
  const { cnt: highValue } = d
    .prepare("SELECT COUNT(*) as cnt FROM lead_analyses WHERE lead_score >= ?")
    .get(HIGH_VALUE_THRESHOLD) as { cnt: number };
  return {
    total,
    ready: m.ready ?? 0,
    approved: m.approved ?? 0,
    contacted: m.contacted ?? 0,
    replied: m.replied ?? 0,
    not_interested: m.not_interested ?? 0,
    potential_client: m.potential_client ?? 0,
    won: m.won ?? 0,
    highValue,
  };
}
