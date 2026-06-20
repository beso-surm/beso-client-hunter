/**
 * SQLite connection singleton for local-persistent dev mode.
 *
 * Tier order: Supabase (env vars) → SQLite (.data/bch.db) → in-memory.
 * Falls back to null (triggering in-memory) if better-sqlite3 is unavailable
 * or the .data directory cannot be created.
 */

import "server-only";
import path from "path";
import fs from "fs";
import type BetterSqlite3 from "better-sqlite3";

export type SQLiteDB = BetterSqlite3.Database;

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "bch.db");

const DDL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS leads (
  id            TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  category      TEXT,
  city          TEXT,
  website_url   TEXT,
  instagram_url TEXT,
  facebook_url  TEXT,
  phone         TEXT,
  email         TEXT,
  source        TEXT NOT NULL DEFAULT 'manual',
  status        TEXT NOT NULL DEFAULT 'new',
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS leads_name_city_uniq
  ON leads (lower(business_name), lower(coalesce(city, '')));
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (status);

CREATE TABLE IF NOT EXISTS lead_analyses (
  id                        TEXT PRIMARY KEY,
  lead_id                   TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  website_status            TEXT NOT NULL DEFAULT 'unknown',
  problems_found            TEXT NOT NULL DEFAULT '[]',
  business_strengths        TEXT NOT NULL DEFAULT '[]',
  why_they_need_website     TEXT NOT NULL DEFAULT '',
  lead_score                INTEGER NOT NULL DEFAULT 0,
  suggested_price_range_gel TEXT NOT NULL DEFAULT '',
  best_outreach_angle       TEXT NOT NULL DEFAULT '',
  confidence                TEXT NOT NULL DEFAULT 'medium',
  created_at                TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS lead_analyses_lead_uniq ON lead_analyses (lead_id);

CREATE TABLE IF NOT EXISTS generated_messages (
  id           TEXT PRIMARY KEY,
  lead_id      TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'outreach',
  language     TEXT NOT NULL DEFAULT 'ka',
  body         TEXT NOT NULL,
  approved     INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS generated_messages_lead_idx ON generated_messages (lead_id);

CREATE TABLE IF NOT EXISTS contact_attempts (
  id         TEXT PRIMARY KEY,
  lead_id    TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL,
  outcome    TEXT,
  note       TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS contact_attempts_lead_idx ON contact_attempts (lead_id);

CREATE TABLE IF NOT EXISTS agent_runs (
  id                 TEXT PRIMARY KEY,
  status             TEXT NOT NULL DEFAULT 'running',
  city               TEXT,
  category           TEXT,
  max_results        INTEGER NOT NULL DEFAULT 10,
  total_found        INTEGER NOT NULL DEFAULT 0,
  saved              INTEGER NOT NULL DEFAULT 0,
  skipped_duplicates INTEGER NOT NULL DEFAULT 0,
  high_value_leads   INTEGER NOT NULL DEFAULT 0,
  errors             TEXT NOT NULL DEFAULT '[]',
  summary            TEXT,
  started_at         TEXT NOT NULL,
  finished_at        TEXT
);

CREATE TABLE IF NOT EXISTS campaigns (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  country               TEXT NOT NULL DEFAULT 'Georgia',
  cities                TEXT NOT NULL DEFAULT '[]',
  categories            TEXT NOT NULL DEFAULT '[]',
  max_per_pair          INTEGER NOT NULL DEFAULT 8,
  min_score             INTEGER NOT NULL DEFAULT 0,
  skip_with_website     INTEGER NOT NULL DEFAULT 0,
  prioritize_social_only INTEGER NOT NULL DEFAULT 0,
  prioritize_tourism    INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'pending',
  started_at            TEXT,
  completed_at          TEXT,
  total_pairs           INTEGER NOT NULL DEFAULT 0,
  pairs_done            INTEGER NOT NULL DEFAULT 0,
  total_found           INTEGER NOT NULL DEFAULT 0,
  total_saved           INTEGER NOT NULL DEFAULT 0,
  total_skipped_duplicate    INTEGER NOT NULL DEFAULT 0,
  total_skipped_below_score  INTEGER NOT NULL DEFAULT 0,
  total_skipped_has_website  INTEGER NOT NULL DEFAULT 0,
  total_high_value      INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaign_pairs (
  id           TEXT PRIMARY KEY,
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  city         TEXT NOT NULL,
  category     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  found        INTEGER NOT NULL DEFAULT 0,
  saved        INTEGER NOT NULL DEFAULT 0,
  skipped_duplicate    INTEGER NOT NULL DEFAULT 0,
  skipped_below_score  INTEGER NOT NULL DEFAULT 0,
  skipped_has_website  INTEGER NOT NULL DEFAULT 0,
  high_value   INTEGER NOT NULL DEFAULT 0,
  error        TEXT,
  started_at   TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS campaign_pairs_campaign_idx ON campaign_pairs (campaign_id);

CREATE TABLE IF NOT EXISTS campaign_leads (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id     TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, lead_id)
);

CREATE TABLE IF NOT EXISTS settings (
  id                   TEXT PRIMARY KEY,
  my_name              TEXT NOT NULL DEFAULT '',
  service_description  TEXT NOT NULL DEFAULT '',
  preferred_cities     TEXT NOT NULL DEFAULT '[]',
  preferred_categories TEXT NOT NULL DEFAULT '[]',
  default_price_min_gel INTEGER NOT NULL DEFAULT 800,
  default_price_max_gel INTEGER NOT NULL DEFAULT 2500,
  tone                 TEXT NOT NULL DEFAULT 'friendly',
  default_language     TEXT NOT NULL DEFAULT 'ka',
  signature            TEXT NOT NULL DEFAULT '',
  contact_phone        TEXT,
  contact_email        TEXT,
  updated_at           TEXT NOT NULL
);
`;

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

function seedSettings(db: SQLiteDB): void {
  const row = db.prepare("SELECT id FROM settings WHERE id = ?").get(SETTINGS_ID);
  if (row) return;
  db.prepare(`
    INSERT INTO settings (id, my_name, service_description, preferred_cities,
      preferred_categories, default_price_min_gel, default_price_max_gel,
      tone, default_language, signature, contact_phone, contact_email, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    SETTINGS_ID,
    "Beso Surmava",
    "I design and build fast, modern websites for hotels, cottages, cafes, restaurants, car washes, beauty salons and tourism businesses in Georgia. Mobile-friendly, multilingual (EN/KA/RU), with booking and contact forms.",
    JSON.stringify(["Kutaisi", "Batumi", "Tbilisi"]),
    JSON.stringify(["Hotel", "Guesthouse", "Cottage / Villa", "Cafe", "Restaurant"]),
    800, 2500,
    "friendly", "ka",
    "Beso Surmava — Web Developer",
    null, "besosurm12@gmail.com",
    new Date().toISOString(),
  );
}

// Idempotent column migrations for DBs created before a schema change.
// SQLite errors if a column already exists; we ignore those errors.
const COLUMN_MIGRATIONS = [
  `ALTER TABLE campaign_pairs ADD COLUMN skipped_duplicate INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE campaign_pairs ADD COLUMN skipped_below_score INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE campaign_pairs ADD COLUMN skipped_has_website INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE campaigns ADD COLUMN total_skipped_duplicate INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE campaigns ADD COLUMN total_skipped_below_score INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE campaigns ADD COLUMN total_skipped_has_website INTEGER NOT NULL DEFAULT 0`,
];

function runMigrations(db: SQLiteDB): void {
  for (const sql of COLUMN_MIGRATIONS) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}

function openDb(): SQLiteDB | null {
  try {
    // Dynamic require so the app still boots if the native module is absent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3") as typeof BetterSqlite3;
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const db = new Database(DB_PATH);
    db.exec(DDL);
    seedSettings(db);
    runMigrations(db);
    return db;
  } catch (err) {
    console.warn(
      "[bch] SQLite unavailable — using in-memory store:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

// Process-global singleton: survives Next.js HMR module reloads.
const g = globalThis as unknown as { __bchDb?: SQLiteDB | null };
export function getDb(): SQLiteDB | null {
  if ("__bchDb" in g) return g.__bchDb ?? null;
  return (g.__bchDb = openDb());
}

export const sqliteEnabled: boolean = getDb() !== null;
