/** Tool: saveAnalysis(data) — persist (or replace) a lead's analysis. */

import "server-only";
import { upsertAnalysis, type UpsertAnalysisData } from "@/lib/repo";
import type { LeadAnalysis } from "@/types";

export async function saveAnalysis(
  data: UpsertAnalysisData,
): Promise<LeadAnalysis> {
  return upsertAnalysis(data);
}
