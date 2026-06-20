import { NextResponse } from "next/server";
import { runAgentSchema } from "@/lib/schemas";
import { runClientHunterAgent } from "@/agents/runClientHunterAgent";

export const runtime = "nodejs";
// Agent runs can take a while (search + per-lead AI calls).
export const maxDuration = 120;

/**
 * POST /api/agent/run
 * Body: { city: string, categories: string[], maxResults?: number }
 * Runs the Client Hunter agent across all selected categories and returns
 * an aggregated run summary.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = runAgentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    );
  }

  try {
    const { city, categories, maxResults } = parsed.data;
    const results = await Promise.all(
      categories.map((category) =>
        runClientHunterAgent({ city, category, maxResults }),
      ),
    );
    // Merge per-category summaries into one.
    const merged = results.reduce(
      (acc, r) => ({
        runId: r.runId,
        totalFound: acc.totalFound + r.totalFound,
        saved: acc.saved + r.saved,
        skippedDuplicates: acc.skippedDuplicates + r.skippedDuplicates,
        skippedBelowScore: acc.skippedBelowScore + r.skippedBelowScore,
        skippedHasWebsite: acc.skippedHasWebsite + r.skippedHasWebsite,
        highValueLeads: acc.highValueLeads + r.highValueLeads,
        errors: [...acc.errors, ...r.errors],
        leadIds: [...acc.leadIds, ...r.leadIds],
      }),
      {
        runId: "",
        totalFound: 0,
        saved: 0,
        skippedDuplicates: 0,
        skippedBelowScore: 0,
        skippedHasWebsite: 0,
        highValueLeads: 0,
        errors: [] as string[],
        leadIds: [] as string[],
      },
    );
    return NextResponse.json(merged);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent run failed" },
      { status: 500 },
    );
  }
}
