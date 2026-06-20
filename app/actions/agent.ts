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
    const summary = await runClientHunterAgent({
      city: parsed.data.city,
      category: parsed.data.category,
      maxResults: parsed.data.maxResults,
    });
    revalidatePath("/dashboard");
    return ok(summary);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Agent run failed");
  }
}
