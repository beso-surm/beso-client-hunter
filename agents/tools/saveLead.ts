/** Tool: saveLead(data) — persist a lead via the data layer. */

import "server-only";
import { createLead, type CreateLeadData } from "@/lib/repo";
import type { Lead } from "@/types";

export async function saveLead(data: CreateLeadData): Promise<Lead> {
  return createLead(data);
}
