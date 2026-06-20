import { type NextRequest, NextResponse } from "next/server";
import { listLeadsWithAnalysis, type LeadFilters } from "@/lib/repo";
import { leadsToCSV } from "@/lib/csv";
import type { LeadStatus } from "@/types";
import { LEAD_STATUSES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const statusParam = sp.get("status");
    const validStatus = LEAD_STATUSES.some((s) => s.value === statusParam)
      ? (statusParam as LeadStatus)
      : null;

    const filters: LeadFilters = {
      status: validStatus,
      city: sp.get("city") || null,
      category: sp.get("category") || null,
      minScore: sp.get("minScore") ? Number(sp.get("minScore")) : null,
      q: sp.get("q") || null,
    };

    const leads = await listLeadsWithAnalysis(filters);
    const csv = leadsToCSV(leads);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="leads-${date}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 },
    );
  }
}
