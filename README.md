# 🎯 Beso Client Hunter

A personal AI agent platform that finds Georgian businesses needing a website,
analyzes & scores them, and drafts personalized **Georgian** outreach messages —
all for review. **It never contacts anyone automatically.**

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Zod, the Claude
API, and SQLite / Supabase.

---

## Quick start (local dev, no API keys needed)

```bash
npm install
npm run dev      # http://localhost:3000
```

The app boots immediately with **local SQLite storage** — data persists across
restarts in `.data/bch.db`. The nav bar always shows which backends are active.

---

## Storage tiers (automatic fallback)

| Badge shown | What's active | How to enable |
|-------------|---------------|---------------|
| 🟢 **Supabase** | Cloud Postgres (persistent, shareable) | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| 🟢 **Local DB** | SQLite at `.data/bch.db` (persistent, local) | Default when `better-sqlite3` is installed |
| ⚪ **In-memory** | RAM only — resets on restart | Fallback if SQLite unavailable |

---

## Adding real Claude AI (analysis + Georgian outreach)

1. Create or copy `.env.example` → `.env.local`
2. Add your key:

```env
ANTHROPIC_API_KEY=sk-ant-...
```

3. Restart the dev server.

The nav shows **🟢 Claude AI** when the key is active. Without it the app runs
fine in **Heuristic** fallback mode (low-confidence analysis, template outreach).

**Safety:** Claude is called only when you click a button (Analyze, Generate
draft, Run agent). Nothing is called automatically. The API key is server-side
only — never sent to the browser.

---

## Adding Google Places search

```env
GOOGLE_PLACES_API_KEY=...
```

Switches the agent's business discovery from demo candidates to real Google
Places results. Without it the agent returns clearly-labelled sample leads
(contacts always blank, never invented).

---

## Adding Supabase (cloud storage)

1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL editor
3. Run `supabase/seed.sql` (optional — seeds example data)
4. Add to `.env.local`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Supabase takes priority over SQLite when both are configured.

---

## CSV import / export

- **Import** (`/import`) — upload a CSV, preview (new / duplicate / invalid),
  then confirm. Supported columns: `business_name`, `city`, `category`,
  `website`, `instagram`, `facebook`, `phone`, `email`, `google_maps`, `notes`.
- **Export** (↓ Export dropdown on Dashboard / Campaign) — CSV downloads for
  leads, approved drafts, and contact history. Respects active filters.

---

## How the agent works

`runClientHunterAgent({ city, category, maxResults })`:

1. Opens an `agent_runs` record
2. `searchBusinesses` → 3. dedupe → 4. `checkWebsite` → 5. `analyzeBusiness`
   (Claude, strict Zod JSON, **retry once** on invalid output) → 6. `scoreLead`
   (deterministic 0–100) → 7. `writeGeorgianOutreach` (draft only, never sent)
   → 8. save all → marks the lead **"Ready to review"** → 9. returns summary

---

## Workflow statuses

`New → Ready to review → Approved → Contacted → Replied → Potential client → Won`

Plus `Not interested` as a dead-end branch. All visible in the **Campaign**
funnel view (`/campaign`).

---

## Project structure

```
app/            routes (dashboard, leads/[id], campaign, import, settings),
                server actions, /api/agent/run, /api/export/*
agents/         orchestrator + tools (searchBusinesses, checkWebsite,
                analyzeBusiness, scoreLead, writeGeorgianOutreach, writeFollowUp)
components/     UI (cards, badges, filters, modals, CsvImport, ExportMenu)
lib/            repo (3-tier: Supabase | SQLite | memory), claude wrapper,
                csv utilities, zod schemas, constants, utils
  sqlite/       db.ts (connection + schema), adapter.ts (all CRUD)
supabase/       schema.sql + seed.sql (for cloud deployment)
types/          shared domain types
```

---

## Safety guarantees

- Drafts only — messages are saved unapproved; nothing is ever sent
- Contact info is never invented; unknown fields show "Not provided"
- Duplicate leads are skipped (unique on business name + city)
- Claude is called only on button click — no auto-bulk spending
- Every agent run is logged; you approve each message manually
