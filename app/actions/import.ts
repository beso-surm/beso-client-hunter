"use server";

import { revalidatePath } from "next/cache";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { parseCsv, mapCsvRowToLead, type ParsedCsvLead } from "@/lib/csv";
import { findLeadByNameCity, createLead } from "@/lib/repo";

export interface CsvPreviewRow extends ParsedCsvLead {
  row_num: number;
  status: "new" | "duplicate" | "invalid";
  duplicate_id?: string;
  missing_contacts: string[];
}

export interface CsvPreviewResult {
  rows: CsvPreviewRow[];
  new_count: number;
  duplicate_count: number;
  invalid_count: number;
}

export async function previewCsvAction(
  formData: FormData,
): Promise<ActionResult<CsvPreviewResult>> {
  try {
    const file = formData.get("csv") as File | null;
    if (!file || file.size === 0) return fail("No file provided.");
    if (!file.name.toLowerCase().endsWith(".csv"))
      return fail("File must be a .csv file.");

    const text = await file.text();
    const { rows: csvRows } = parseCsv(text);

    if (csvRows.length === 0) return fail("CSV has no data rows.");
    if (csvRows.length > 500)
      return fail("Maximum 500 rows per import. Split your file and retry.");

    const preview: CsvPreviewRow[] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const mapped = mapCsvRowToLead(csvRows[i]);

      if (!mapped.business_name.trim()) {
        preview.push({
          ...mapped,
          row_num: i + 2,
          status: "invalid",
          missing_contacts: ["business_name is required"],
        });
        continue;
      }

      const missing: string[] = [];
      if (!mapped.phone) missing.push("phone");
      if (!mapped.email) missing.push("email");
      if (!mapped.instagram_url && !mapped.facebook_url) missing.push("instagram / facebook");

      const dup = await findLeadByNameCity(mapped.business_name, mapped.city);

      preview.push({
        ...mapped,
        row_num: i + 2,
        status: dup ? "duplicate" : "new",
        duplicate_id: dup?.id,
        missing_contacts: missing,
      });
    }

    return ok({
      rows: preview,
      new_count: preview.filter((r) => r.status === "new").length,
      duplicate_count: preview.filter((r) => r.status === "duplicate").length,
      invalid_count: preview.filter((r) => r.status === "invalid").length,
    });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to parse CSV.",
    );
  }
}

export async function importCsvAction(
  rows: CsvPreviewRow[],
): Promise<ActionResult<{ imported: number; skipped: number }>> {
  const toImport = rows.filter((r) => r.status === "new");
  let imported = 0;
  let skipped = 0;

  for (const row of toImport) {
    try {
      const dup = await findLeadByNameCity(row.business_name, row.city);
      if (dup) { skipped++; continue; }

      await createLead({
        business_name: row.business_name,
        city: row.city,
        category: row.category,
        website_url: row.website_url,
        instagram_url: row.instagram_url,
        facebook_url: row.facebook_url,
        phone: row.phone,
        email: row.email,
        notes: row.notes,
        source: "csv",
        status: "new",
      });
      imported++;
    } catch {
      skipped++;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/campaign");
  return ok({ imported, skipped });
}
