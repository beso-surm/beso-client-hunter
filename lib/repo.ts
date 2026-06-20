/**
 * Data access layer.
 *
 * Every page, server action and agent tool goes through these functions. They
 * transparently use Supabase when configured, otherwise the in-memory store —
 * so the rest of the codebase never has to care which backend is live.
 */

import "server-only";
import { getServiceClient, supabaseEnabled } from "@/lib/supabase/server";
import { findLeadByNameCityMem, memory } from "@/lib/store";
import { sqliteEnabled } from "@/lib/sqlite/db";
import * as sq from "@/lib/sqlite/adapter";
import * as sqc from "@/lib/sqlite/campaign-adapter";
import type { Campaign, CampaignPair, CampaignWithPairs } from "@/types";
import { FIXED_SETTINGS_ID, HIGH_VALUE_THRESHOLD, CITIES, CAMPAIGN_CITIES, US_CITIES, US_CAMPAIGN_CITIES } from "@/lib/constants";
import { normalizeName, nowISO, uuid } from "@/lib/utils";
import type {
  AgentRun,
  AgentRunStatus,
  ContactAttempt,
  ContactChannel,
  ContactOutcome,
  Confidence,
  DashboardStats,
  GeneratedMessage,
  Lead,
  LeadAnalysis,
  LeadSource,
  LeadStatus,
  LeadWithDetails,
  MessageLanguage,
  MessageType,
  Settings,
  WebsiteStatus,
} from "@/types";

export const dataMode: "supabase" | "sqlite" | "memory" = supabaseEnabled
  ? "supabase"
  : sqliteEnabled
    ? "sqlite"
    : "memory";

export interface LeadFilters {
  city?: string | null;
  category?: string | null;
  status?: LeadStatus | null;
  minScore?: number | null;
  q?: string | null;
  market?: import("@/types").Market | null;
  limit?: number;
}

export type LeadWithAnalysis = Lead & { analysis: LeadAnalysis | null };

export interface CreateLeadData {
  business_name: string;
  category?: string | null;
  city?: string | null;
  website_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: LeadSource;
  status?: LeadStatus;
  notes?: string | null;
}

export interface UpsertAnalysisData {
  lead_id: string;
  website_status: WebsiteStatus;
  problems_found: string[];
  business_strengths: string[];
  why_they_need_website: string;
  lead_score: number;
  suggested_price_range_gel: string;
  best_outreach_angle: string;
  confidence: Confidence;
}

export interface CreateMessageData {
  lead_id: string;
  message_type: MessageType;
  language: MessageLanguage;
  body: string;
  approved?: boolean;
}

export interface CreateAttemptData {
  lead_id: string;
  channel: ContactChannel;
  outcome?: ContactOutcome | null;
  note?: string | null;
}

function db() {
  const client = getServiceClient();
  if (!client) throw new Error("Supabase client unavailable");
  return client;
}

// ===========================================================================
// Leads
// ===========================================================================

const GEORGIA_CITIES_SET = new Set(
  [...CITIES, ...CAMPAIGN_CITIES].map((c) => c.toLowerCase()),
);
const USA_CITIES_SET = new Set(
  [...US_CITIES, ...US_CAMPAIGN_CITIES].map((c) => c.toLowerCase()),
);

function matchesFilters(lead: Lead, f: LeadFilters): boolean {
  if (f.city && (lead.city ?? "").toLowerCase() !== f.city.toLowerCase())
    return false;
  if (
    f.category &&
    (lead.category ?? "").toLowerCase() !== f.category.toLowerCase()
  )
    return false;
  if (f.status && lead.status !== f.status) return false;
  if (f.market && !f.city) {
    const cityLc = (lead.city ?? "").toLowerCase();
    const set = f.market === "USA" ? USA_CITIES_SET : GEORGIA_CITIES_SET;
    if (!set.has(cityLc)) return false;
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = `${lead.business_name} ${lead.city ?? ""} ${lead.category ?? ""} ${lead.notes ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export async function listLeadsWithAnalysis(
  filters: LeadFilters = {},
): Promise<LeadWithAnalysis[]> {
  if (dataMode === "sqlite") return sq.listLeadsWithAnalysis(filters);
  if (dataMode === "memory") {
    const rows = memory.leads
      .filter((l) => matchesFilters(l, filters))
      .map((l) => ({
        ...l,
        analysis: memory.analyses.find((a) => a.lead_id === l.id) ?? null,
      }))
      .filter((l) =>
        filters.minScore != null
          ? (l.analysis?.lead_score ?? -1) >= filters.minScore
          : true,
      );
    const limit = filters.limit ?? 120;
    return sortLeads(rows).slice(0, limit);
  }

  let query = db().from("leads").select("*");
  if (filters.city) query = query.ilike("city", filters.city);
  if (filters.category) query = query.ilike("category", filters.category);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.q) query = query.ilike("business_name", `%${filters.q}%`);
  const { data: leads, error } = await query;
  if (error) throw new Error(error.message);

  const list = (leads ?? []) as Lead[];
  const ids = list.map((l) => l.id);
  let analyses: LeadAnalysis[] = [];
  if (ids.length) {
    const { data, error: aErr } = await db()
      .from("lead_analyses")
      .select("*")
      .in("lead_id", ids);
    if (aErr) throw new Error(aErr.message);
    analyses = (data ?? []) as LeadAnalysis[];
  }
  const rows = list
    .map((l) => ({
      ...l,
      analysis: analyses.find((a) => a.lead_id === l.id) ?? null,
    }))
    .filter((l) =>
      filters.minScore != null
        ? (l.analysis?.lead_score ?? -1) >= filters.minScore
        : true,
    );
  return sortLeads(rows);
}

function sortLeads(rows: LeadWithAnalysis[]): LeadWithAnalysis[] {
  return [...rows].sort((a, b) => {
    const sa = a.analysis?.lead_score ?? -1;
    const sb = b.analysis?.lead_score ?? -1;
    if (sb !== sa) return sb - sa;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

export async function getLead(id: string): Promise<Lead | null> {
  if (dataMode === "sqlite") return sq.getLead(id);
  if (dataMode === "memory") {
    return memory.leads.find((l) => l.id === id) ?? null;
  }
  const { data, error } = await db()
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Lead) ?? null;
}

export async function getLeadWithDetails(
  id: string,
): Promise<LeadWithDetails | null> {
  const lead = await getLead(id);
  if (!lead) return null;
  const [analysis, messages, attempts] = await Promise.all([
    getAnalysisByLead(id),
    listMessagesByLead(id),
    listAttemptsByLead(id),
  ]);
  return { ...lead, analysis, messages, contact_attempts: attempts };
}

export async function findLeadByNameCity(
  name: string,
  city: string | null,
): Promise<Lead | null> {
  if (dataMode === "sqlite") return sq.findLeadByNameCity(name, city);
  if (dataMode === "memory") return findLeadByNameCityMem(name, city);
  const { data, error } = await db()
    .from("leads")
    .select("*")
    .ilike("business_name", name.trim())
    .ilike("city", (city ?? "").trim() || "%")
    .limit(1);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Lead[];
  const n = normalizeName(name);
  return rows.find((r) => normalizeName(r.business_name) === n) ?? null;
}

export async function createLead(input: CreateLeadData): Promise<Lead> {
  if (dataMode === "sqlite") return sq.createLead(input);
  const payload = {
    business_name: input.business_name.trim(),
    category: input.category ?? null,
    city: input.city ?? null,
    website_url: input.website_url ?? null,
    instagram_url: input.instagram_url ?? null,
    facebook_url: input.facebook_url ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    source: input.source ?? "manual",
    status: input.status ?? "new",
    notes: input.notes ?? null,
  };

  if (dataMode === "memory") {
    const now = nowISO();
    const lead: Lead = { id: uuid(), ...payload, created_at: now, updated_at: now };
    memory.leads.push(lead);
    return lead;
  }
  const { data, error } = await db()
    .from("leads")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function updateLead(
  id: string,
  patch: Partial<Omit<Lead, "id" | "created_at">>,
): Promise<Lead | null> {
  if (dataMode === "sqlite") return sq.updateLead(id, patch);
  if (dataMode === "memory") {
    const lead = memory.leads.find((l) => l.id === id);
    if (!lead) return null;
    Object.assign(lead, patch, { updated_at: nowISO() });
    return lead;
  }
  const { data, error } = await db()
    .from("leads")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Lead) ?? null;
}

export async function deleteLead(id: string): Promise<void> {
  if (dataMode === "sqlite") { sq.deleteLead(id); return; }
  if (dataMode === "memory") {
    memory.leads = memory.leads.filter((l) => l.id !== id);
    memory.analyses = memory.analyses.filter((a) => a.lead_id !== id);
    memory.messages = memory.messages.filter((m) => m.lead_id !== id);
    memory.attempts = memory.attempts.filter((c) => c.lead_id !== id);
    return;
  }
  const { error } = await db().from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ===========================================================================
// Analyses
// ===========================================================================

export async function getAnalysisByLead(
  leadId: string,
): Promise<LeadAnalysis | null> {
  if (dataMode === "sqlite") return sq.getAnalysisByLead(leadId);
  if (dataMode === "memory") {
    return memory.analyses.find((a) => a.lead_id === leadId) ?? null;
  }
  const { data, error } = await db()
    .from("lead_analyses")
    .select("*")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LeadAnalysis) ?? null;
}

export async function upsertAnalysis(
  input: UpsertAnalysisData,
): Promise<LeadAnalysis> {
  if (dataMode === "sqlite") return sq.upsertAnalysis(input);
  if (dataMode === "memory") {
    const existing = memory.analyses.find((a) => a.lead_id === input.lead_id);
    if (existing) {
      Object.assign(existing, input);
      return existing;
    }
    const row: LeadAnalysis = { id: uuid(), ...input, created_at: nowISO() };
    memory.analyses.push(row);
    return row;
  }
  const { data, error } = await db()
    .from("lead_analyses")
    .upsert(input, { onConflict: "lead_id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as LeadAnalysis;
}

// ===========================================================================
// Messages
// ===========================================================================

export async function listMessagesByLead(
  leadId: string,
): Promise<GeneratedMessage[]> {
  if (dataMode === "sqlite") return sq.listMessagesByLead(leadId);
  if (dataMode === "memory") {
    return memory.messages
      .filter((m) => m.lead_id === leadId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await db()
    .from("generated_messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as GeneratedMessage[];
}

export async function createMessage(
  input: CreateMessageData,
): Promise<GeneratedMessage> {
  if (dataMode === "sqlite") return sq.createMessage(input);
  const payload = { ...input, approved: input.approved ?? false };
  if (dataMode === "memory") {
    const row: GeneratedMessage = {
      id: uuid(),
      ...payload,
      created_at: nowISO(),
    };
    memory.messages.push(row);
    return row;
  }
  const { data, error } = await db()
    .from("generated_messages")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GeneratedMessage;
}

export async function setMessageApproved(
  id: string,
  approved: boolean,
): Promise<GeneratedMessage | null> {
  if (dataMode === "sqlite") return sq.setMessageApproved(id, approved);
  if (dataMode === "memory") {
    const msg = memory.messages.find((m) => m.id === id);
    if (!msg) return null;
    msg.approved = approved;
    return msg;
  }
  const { data, error } = await db()
    .from("generated_messages")
    .update({ approved })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GeneratedMessage) ?? null;
}

export async function getMessage(id: string): Promise<GeneratedMessage | null> {
  if (dataMode === "sqlite") return sq.getMessage(id);
  if (dataMode === "memory") {
    return memory.messages.find((m) => m.id === id) ?? null;
  }
  const { data, error } = await db()
    .from("generated_messages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as GeneratedMessage) ?? null;
}

// ===========================================================================
// Contact attempts
// ===========================================================================

export async function listAttemptsByLead(
  leadId: string,
): Promise<ContactAttempt[]> {
  if (dataMode === "sqlite") return sq.listAttemptsByLead(leadId);
  if (dataMode === "memory") {
    return memory.attempts
      .filter((c) => c.lead_id === leadId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await db()
    .from("contact_attempts")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactAttempt[];
}

export async function createAttempt(
  input: CreateAttemptData,
): Promise<ContactAttempt> {
  if (dataMode === "sqlite") return sq.createAttempt(input);
  const payload = {
    lead_id: input.lead_id,
    channel: input.channel,
    outcome: input.outcome ?? null,
    note: input.note ?? null,
  };
  if (dataMode === "memory") {
    const row: ContactAttempt = { id: uuid(), ...payload, created_at: nowISO() };
    memory.attempts.push(row);
    return row;
  }
  const { data, error } = await db()
    .from("contact_attempts")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContactAttempt;
}

// ===========================================================================
// Agent runs
// ===========================================================================

export async function createAgentRun(input: {
  city: string | null;
  category: string | null;
  max_results: number;
}): Promise<AgentRun> {
  if (dataMode === "sqlite") return sq.createAgentRun(input);
  const base = {
    status: "running" as AgentRunStatus,
    city: input.city,
    category: input.category,
    max_results: input.max_results,
    total_found: 0,
    saved: 0,
    skipped_duplicates: 0,
    high_value_leads: 0,
    errors: [] as string[],
    summary: null as string | null,
  };
  if (dataMode === "memory") {
    const run: AgentRun = {
      id: uuid(),
      ...base,
      started_at: nowISO(),
      finished_at: null,
    };
    memory.runs.unshift(run);
    return run;
  }
  const { data, error } = await db()
    .from("agent_runs")
    .insert(base)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as AgentRun;
}

export async function updateAgentRun(
  id: string,
  patch: Partial<AgentRun>,
): Promise<AgentRun | null> {
  if (dataMode === "sqlite") return sq.updateAgentRun(id, patch);
  if (dataMode === "memory") {
    const run = memory.runs.find((r) => r.id === id);
    if (!run) return null;
    Object.assign(run, patch);
    return run;
  }
  const { data, error } = await db()
    .from("agent_runs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as AgentRun) ?? null;
}

export async function listAgentRuns(limit = 10): Promise<AgentRun[]> {
  if (dataMode === "sqlite") return sq.listAgentRuns(limit);
  if (dataMode === "memory") {
    return [...memory.runs]
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, limit);
  }
  const { data, error } = await db()
    .from("agent_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AgentRun[];
}

// ===========================================================================
// Settings
// ===========================================================================

export async function getSettings(): Promise<Settings> {
  if (dataMode === "sqlite") return sq.getSettings();
  if (dataMode === "memory") return memory.settings;
  const { data, error } = await db()
    .from("settings")
    .select("*")
    .eq("id", FIXED_SETTINGS_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as Settings;
  // No row yet — create the singleton from in-memory defaults.
  const { data: created, error: cErr } = await db()
    .from("settings")
    .insert({ ...memory.settings })
    .select("*")
    .single();
  if (cErr) throw new Error(cErr.message);
  return created as Settings;
}

export async function saveSettings(
  patch: Partial<Omit<Settings, "id" | "updated_at">>,
): Promise<Settings> {
  if (dataMode === "sqlite") return sq.saveSettings(patch);
  if (dataMode === "memory") {
    Object.assign(memory.settings, patch, { updated_at: nowISO() });
    return memory.settings;
  }
  const { data, error } = await db()
    .from("settings")
    .upsert({ id: FIXED_SETTINGS_ID, ...patch }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Settings;
}

// ===========================================================================
// Stats
// ===========================================================================

export async function getStats(): Promise<DashboardStats> {
  if (dataMode === "sqlite") return sq.getStats();
  const leads = await listLeadsWithAnalysis({});
  const count = (status: string) =>
    leads.filter((l) => l.status === status).length;
  return {
    total: leads.length,
    ready: count("ready"),
    approved: count("approved"),
    contacted: count("contacted"),
    replied: count("replied"),
    not_interested: count("not_interested"),
    potential_client: count("potential_client"),
    won: count("won"),
    highValue: leads.filter(
      (l) => (l.analysis?.lead_score ?? 0) >= HIGH_VALUE_THRESHOLD,
    ).length,
  };
}

export async function listAllMessages(filter?: {
  approved?: boolean;
}): Promise<GeneratedMessage[]> {
  if (dataMode === "sqlite") return sq.listAllMessages(filter);
  if (dataMode === "memory") {
    let rows = [...memory.messages];
    if (filter?.approved !== undefined)
      rows = rows.filter((m) => m.approved === filter.approved);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  let query = db().from("generated_messages").select("*");
  if (filter?.approved !== undefined)
    query = query.eq("approved", filter.approved);
  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as GeneratedMessage[];
}

// ===========================================================================
// Campaign Agent (SQLite-only)
// ===========================================================================

export async function createCampaign(
  input: sqc.CreateCampaignData,
): Promise<Campaign> {
  if (dataMode !== "sqlite") throw new Error("Campaigns require SQLite mode");
  return sqc.createCampaign(input);
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  if (dataMode !== "sqlite") return null;
  return sqc.getCampaign(id);
}

export async function listCampaigns(): Promise<Campaign[]> {
  if (dataMode !== "sqlite") return [];
  return sqc.listCampaigns();
}

export async function getCampaignWithPairs(
  id: string,
): Promise<CampaignWithPairs | null> {
  if (dataMode !== "sqlite") return null;
  return sqc.getCampaignWithPairs(id);
}

export async function getCampaignPair(pairId: string): Promise<CampaignPair | null> {
  if (dataMode !== "sqlite") return null;
  return sqc.getCampaignPair(pairId);
}

export async function updateCampaignPair(
  pairId: string,
  patch: Partial<Omit<CampaignPair, "id" | "campaign_id">>,
): Promise<CampaignPair | null> {
  if (dataMode !== "sqlite") return null;
  return sqc.updateCampaignPair(pairId, patch);
}

export async function startCampaignIfNeeded(campaignId: string): Promise<void> {
  if (dataMode !== "sqlite") return;
  sqc.startCampaignIfNeeded(campaignId);
}

export async function incrementCampaignAggregates(
  campaignId: string,
  delta: Parameters<typeof sqc.incrementCampaignAggregates>[1],
): Promise<void> {
  if (dataMode !== "sqlite") return;
  sqc.incrementCampaignAggregates(campaignId, delta);
}

export async function completeCampaign(campaignId: string): Promise<void> {
  if (dataMode !== "sqlite") return;
  sqc.completeCampaign(campaignId);
}

export async function linkLeadToCampaign(
  campaignId: string,
  leadId: string,
): Promise<void> {
  if (dataMode !== "sqlite") return;
  sqc.linkLeadToCampaign(campaignId, leadId);
}

export async function getCampaignLeadIds(campaignId: string): Promise<string[]> {
  if (dataMode !== "sqlite") return [];
  return sqc.getCampaignLeadIds(campaignId);
}

export async function listLeadsByIds(
  ids: string[],
): Promise<LeadWithAnalysis[]> {
  if (!ids.length) return [];
  const all = await listLeadsWithAnalysis({});
  const set = new Set(ids);
  return all.filter((l) => set.has(l.id));
}

export async function listAllAttempts(): Promise<ContactAttempt[]> {
  if (dataMode === "sqlite") return sq.listAllAttempts();
  if (dataMode === "memory") {
    return [...memory.attempts].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }
  const { data, error } = await db()
    .from("contact_attempts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContactAttempt[];
}
