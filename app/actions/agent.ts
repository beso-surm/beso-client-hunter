"use server";

import { revalidatePath } from "next/cache";
import { runAgentSchema } from "@/lib/schemas";
import { runClientHunterAgent } from "@/agents/runClientHunterAgent";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import type { AgentRunSummary } from "@/types";

export async function runAgentAction(
  input: unknown,
): Promise<ActionResult<AgentRunSummary>> {
  const parsed = runAgentSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => i.message).join(", "));
  }
  try {
    const { city, categories, maxResults } = parsed.data;

    const aggregated: AgentRunSummary = {
      runId: "",
      totalFound: 0,
      saved: 0,
      skippedDuplicates: 0,
      skippedBelowScore: 0,
      skippedHasWebsite: 0,
      highValueLeads: 0,
      errors: [],
      leadIds: [],
    };

    for (const category of categories) {
      const summary = await runClientHunterAgent({ city, category, maxResults });
      aggregated.runId = summary.runId;
      aggregated.totalFound += summary.totalFound;
      aggregated.saved += summary.saved;
      aggregated.skippedDuplicates += summary.skippedDuplicates;
      aggregated.skippedBelowScore += summary.skippedBelowScore;
      aggregated.skippedHasWebsite += summary.skippedHasWebsite;
      aggregated.highValueLeads += summary.highValueLeads;
      aggregated.errors.push(...summary.errors);
      aggregated.leadIds.push(...summary.leadIds);
    }

    revalidatePath("/dashboard");
    return ok(aggregated);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Agent run failed");
  }
}
