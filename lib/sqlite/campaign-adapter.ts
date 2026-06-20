import "server-only";
import { getDb } from "@/lib/sqlite/db";
import { nowISO, uuid } from "@/lib/utils";
import type {
  Campaign,
  CampaignPair,
  CampaignStatus,
  CampaignWithPairs,
} from "@/types";

function db() {
  const d = getDb();
  if (!d) throw new Error("SQLite unavailable");
  return d;
}

function rowToCampaign(r: Record<string, unknown>): Campaign {
  return {
    id: r.id as string,
    name: r.name as string,
    country: r.country as string,
    cities: JSON.parse(r.cities as string),
    categories: JSON.parse(r.categories as string),
    max_per_pair: r.max_per_pair as number,
    min_score: r.min_score as number,
    skip_with_website: Boolean(r.skip_with_website),
    prioritize_social_only: Boolean(r.prioritize_social_only),
    prioritize_tourism: Boolean(r.prioritize_tourism),
    status: r.status as CampaignStatus,
    started_at: r.started_at as string | null,
    completed_at: r.completed_at as string | null,
    total_pairs: r.total_pairs as number,
    pairs_done: r.pairs_done as number,
    total_found: r.total_found as number,
    total_saved: r.total_saved as number,
    total_skipped_duplicate: (r.total_skipped_duplicate as number) ?? 0,
    total_skipped_below_score: (r.total_skipped_below_score as number) ?? 0,
    total_skipped_has_website: (r.total_skipped_has_website as number) ?? 0,
    total_high_value: r.total_high_value as number,
    created_at: r.created_at as string,
  };
}

function rowToPair(r: Record<string, unknown>): CampaignPair {
  return {
    id: r.id as string,
    campaign_id: r.campaign_id as string,
    city: r.city as string,
    category: r.category as string,
    status: r.status as CampaignStatus,
    found: r.found as number,
    saved: r.saved as number,
    skipped_duplicate: (r.skipped_duplicate as number) ?? 0,
    skipped_below_score: (r.skipped_below_score as number) ?? 0,
    skipped_has_website: (r.skipped_has_website as number) ?? 0,
    high_value: r.high_value as number,
    error: r.error as string | null,
    started_at: r.started_at as string | null,
    completed_at: r.completed_at as string | null,
  };
}

export interface CreateCampaignData {
  name: string;
  country?: string;
  cities: string[];
  categories: string[];
  max_per_pair?: number;
  min_score?: number;
  skip_with_website?: boolean;
  prioritize_social_only?: boolean;
  prioritize_tourism?: boolean;
}

export function createCampaign(input: CreateCampaignData): Campaign {
  const d = db();
  const id = uuid();
  const now = nowISO();
  const cities = input.cities;
  const categories = input.categories;
  const totalPairs = cities.length * categories.length;

  d.prepare(`
    INSERT INTO campaigns
      (id, name, country, cities, categories, max_per_pair, min_score,
       skip_with_website, prioritize_social_only, prioritize_tourism,
       status, total_pairs, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    input.name,
    input.country ?? "Georgia",
    JSON.stringify(cities),
    JSON.stringify(categories),
    input.max_per_pair ?? 8,
    input.min_score ?? 0,
    input.skip_with_website ? 1 : 0,
    input.prioritize_social_only ? 1 : 0,
    input.prioritize_tourism ? 1 : 0,
    "pending",
    totalPairs,
    now,
  );

  // Create all city×category pair rows.
  const insertPair = d.prepare(`
    INSERT INTO campaign_pairs (id, campaign_id, city, category, status)
    VALUES (?, ?, ?, ?, 'pending')
  `);
  const insertAll = d.transaction(() => {
    for (const city of cities) {
      for (const cat of categories) {
        insertPair.run(uuid(), id, city, cat);
      }
    }
  });
  insertAll();

  return getCampaign(id)!;
}

export function getCampaign(id: string): Campaign | null {
  const r = db().prepare("SELECT * FROM campaigns WHERE id = ?").get(id);
  return r ? rowToCampaign(r as Record<string, unknown>) : null;
}

export function listCampaigns(): Campaign[] {
  const rows = db()
    .prepare("SELECT * FROM campaigns ORDER BY created_at DESC")
    .all();
  return (rows as Record<string, unknown>[]).map(rowToCampaign);
}

export function updateCampaign(
  id: string,
  patch: Partial<Omit<Campaign, "id" | "created_at">>,
): Campaign | null {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (k === "cities" || k === "categories") {
      sets.push(`${k} = ?`);
      vals.push(JSON.stringify(v));
    } else if (k === "skip_with_website" || k === "prioritize_social_only" || k === "prioritize_tourism") {
      sets.push(`${k} = ?`);
      vals.push(v ? 1 : 0);
    } else {
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (!sets.length) return getCampaign(id);
  vals.push(id);
  db().prepare(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getCampaign(id);
}

export function getCampaignPairs(campaignId: string): CampaignPair[] {
  const rows = db()
    .prepare("SELECT * FROM campaign_pairs WHERE campaign_id = ? ORDER BY rowid")
    .all(campaignId);
  return (rows as Record<string, unknown>[]).map(rowToPair);
}

export function getCampaignPair(pairId: string): CampaignPair | null {
  const r = db().prepare("SELECT * FROM campaign_pairs WHERE id = ?").get(pairId);
  return r ? rowToPair(r as Record<string, unknown>) : null;
}

export function updateCampaignPair(
  id: string,
  patch: Partial<Omit<CampaignPair, "id" | "campaign_id">>,
): CampaignPair | null {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(patch)) {
    sets.push(`${k} = ?`);
    vals.push(v);
  }
  if (!sets.length) return getCampaignPair(id);
  vals.push(id);
  db().prepare(`UPDATE campaign_pairs SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  return getCampaignPair(id);
}

export function linkLeadToCampaign(campaignId: string, leadId: string): void {
  db()
    .prepare("INSERT OR IGNORE INTO campaign_leads (campaign_id, lead_id) VALUES (?, ?)")
    .run(campaignId, leadId);
}

export function getCampaignLeadIds(campaignId: string): string[] {
  const rows = db()
    .prepare("SELECT lead_id FROM campaign_leads WHERE campaign_id = ?")
    .all(campaignId) as { lead_id: string }[];
  return rows.map((r) => r.lead_id);
}

export function incrementCampaignAggregates(
  campaignId: string,
  delta: {
    pairs_done?: number;
    total_found?: number;
    total_saved?: number;
    total_skipped_duplicate?: number;
    total_skipped_below_score?: number;
    total_skipped_has_website?: number;
    total_high_value?: number;
  },
): void {
  const parts = Object.entries(delta)
    .filter(([, v]) => v !== undefined && v !== 0)
    .map(([k, v]) => `${k} = ${k} + ${v}`);
  if (!parts.length) return;
  db().prepare(`UPDATE campaigns SET ${parts.join(", ")} WHERE id = ?`).run(campaignId);
}

export function startCampaignIfNeeded(campaignId: string): void {
  db()
    .prepare(`UPDATE campaigns SET status = 'running', started_at = ? WHERE id = ? AND status = 'pending'`)
    .run(nowISO(), campaignId);
}

export function completeCampaign(campaignId: string): void {
  db()
    .prepare(`UPDATE campaigns SET status = 'completed', completed_at = ? WHERE id = ?`)
    .run(nowISO(), campaignId);
}

export function getCampaignWithPairs(id: string): CampaignWithPairs | null {
  const campaign = getCampaign(id);
  if (!campaign) return null;
  return { ...campaign, pairs: getCampaignPairs(id) };
}
