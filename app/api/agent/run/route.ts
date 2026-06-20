import { NextResponse } from "next/server";
import { runAgentSchema } from "@/lib/schemas";
import { runClientHunterAgent } from "@/agents/runClientHunterAgent";

export const runtime = "nodejs";
// Agent runs can take a while (search + per-lead AI calls).
export const maxDuration = 120;

/**
 * POST /api/agent/run
 * Body: { city: string, category: string, maxResults?: number }
 * Runs the Client Hunter agent and returns the run summary.
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
    const summary = await runClientHunterAgent({
      city: parsed.data.city,
      category: parsed.data.category,
      maxResults: parsed.data.maxResults,
    });
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Agent run failed" },
      { status: 500 },
    );
  }
}
