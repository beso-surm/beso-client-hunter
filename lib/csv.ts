import type { LeadAnalysis, GeneratedMessage, ContactAttempt, Lead } from "@/types";
import type { LeadWithAnalysis } from "@/lib/repo";

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] ?? "").trim(); });
    rows.push(row);
  }
  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Column name aliases → internal field name
// ---------------------------------------------------------------------------

const COLUMN_MAP: Record<string, string> = {
  business_name: "business_name",
  "business name": "business_name",
  name: "business_name",
  city: "city",
  category: "category",
  type: "category",
  website: "website_url",
  website_url: "website_url",
  url: "website_url",
  instagram: "instagram_url",
  instagram_url: "instagram_url",
  ig: "instagram_url",
  facebook: "facebook_url",
  facebook_url: "facebook_url",
  fb: "facebook_url",
  phone: "phone",
  telephone: "phone",
  tel: "phone",
  email: "email",
  "e-mail": "email",
  google_maps: "google_maps",
  "google maps": "google_maps",
  maps: "google_maps",
  maps_url: "google_maps",
  google_maps_link: "google_maps",
  google_map: "google_maps",
  notes: "notes",
  note: "notes",
  source: "source_label",
};

export interface ParsedCsvLead {
  business_name: string;
  city: string | null;
  category: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  source_label: string | null;
}

function normalizeUrl(val: string | undefined): string | null {
  if (!val) return null;
  const v = val.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.includes(".")) return `https://${v}`;
  return null;
}

export function mapCsvRowToLead(row: CsvRow): ParsedCsvLead {
  const mapped: Record<string, string> = {};
  for (const [col, val] of Object.entries(row)) {
    const field = COLUMN_MAP[col];
    if (field && val) mapped[field] = val;
  }

  let notes = mapped.notes ?? null;
  if (mapped.google_maps) {
    notes = notes
      ? `${notes}\nMaps: ${mapped.google_maps}`
      : `Maps: ${mapped.google_maps}`;
  }

  return {
    business_name: mapped.business_name ?? "",
    city: mapped.city || null,
    category: mapped.category || null,
    website_url: normalizeUrl(mapped.website_url),
    instagram_url: normalizeUrl(mapped.instagram_url),
    facebook_url: normalizeUrl(mapped.facebook_url),
    phone: mapped.phone || null,
    email: mapped.email || null,
    notes,
    source_label: mapped.source_label || null,
  };
}

// ---------------------------------------------------------------------------
// CSV export helpers
// ---------------------------------------------------------------------------

function escapeField(value: string | null | undefined): string {
  const v = value ?? "";
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map((f) => escapeField(f?.toString())).join(",");
}

export function leadsToCSV(leads: LeadWithAnalysis[]): string {
  const headers = [
    "business_name",
    "city",
    "category",
    "status",
    "score",
    "website_url",
    "instagram_url",
    "facebook_url",
    "phone",
    "email",
    "source",
    "notes",
    "created_at",
  ];
  const rows = leads.map((l) =>
    csvRow([
      l.business_name,
      l.city,
      l.category,
      l.status,
      l.analysis?.lead_score ?? "",
      l.website_url,
      l.instagram_url,
      l.facebook_url,
      l.phone,
      l.email,
      l.source,
      l.notes,
      l.created_at,
    ]),
  );
  return [headers.join(","), ...rows].join("\n");
}

export function messagesToCSV(
  leads: Lead[],
  messages: GeneratedMessage[],
): string {
  const leadMap = new Map(leads.map((l) => [l.id, l]));
  const headers = [
    "lead_name",
    "city",
    "language",
    "type",
    "approved",
    "body",
    "created_at",
  ];
  const rows = messages.map((m) => {
    const lead = leadMap.get(m.lead_id);
    return csvRow([
      lead?.business_name ?? "",
      lead?.city ?? "",
      m.language,
      m.message_type,
      m.approved ? "yes" : "no",
      m.body,
      m.created_at,
    ]);
  });
  return [headers.join(","), ...rows].join("\n");
}

export function attemptsToCSV(
  leads: Lead[],
  attempts: ContactAttempt[],
): string {
  const leadMap = new Map(leads.map((l) => [l.id, l]));
  const headers = [
    "lead_name",
    "city",
    "channel",
    "outcome",
    "note",
    "created_at",
  ];
  const rows = attempts.map((a) => {
    const lead = leadMap.get(a.lead_id);
    return csvRow([
      lead?.business_name ?? "",
      lead?.city ?? "",
      a.channel,
      a.outcome ?? "",
      a.note ?? "",
      a.created_at,
    ]);
  });
  return [headers.join(","), ...rows].join("\n");
}
