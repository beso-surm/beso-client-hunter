"use server";

import { revalidatePath } from "next/cache";
import {
  getLead,
  getMessage,
  getSettings,
  listMessagesByLead,
  setMessageApproved,
} from "@/lib/repo";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { writeFollowUp } from "@/agents/tools/writeFollowUp";
import { saveGeneratedMessage } from "@/agents/tools/saveGeneratedMessage";
import type { MessageLanguage } from "@/types";

/**
 * Approve / un-approve a draft. Approval is a REVIEW flag only — it marks the
 * message as ready for Beso to copy and send himself. Nothing is auto-sent.
 */
export async function setMessageApprovedAction(
  id: string,
  approved: boolean,
): Promise<ActionResult> {
  if (!id) return fail("Missing message id");
  try {
    const msg = await getMessage(id);
    if (!msg) return fail("Message not found");
    await setMessageApproved(id, approved);
    revalidatePath(`/leads/${msg.lead_id}`);
    revalidatePath("/dashboard");
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to update message");
  }
}

/** Draft a follow-up based on the lead's most recent outreach message. */
export async function generateFollowUpAction(
  leadId: string,
  language?: MessageLanguage,
): Promise<ActionResult> {
  if (!leadId) return fail("Missing lead id");
  try {
    const lead = await getLead(leadId);
    if (!lead) return fail("Lead not found");
    const settings = await getSettings();

    const messages = await listMessagesByLead(leadId);
    const lastOutreach =
      messages.find((m) => m.message_type === "outreach") ?? messages[0];
    if (!lastOutreach) {
      return fail("Draft an outreach message first, then a follow-up.");
    }

    const result = await writeFollowUp(
      {
        business_name: lead.business_name,
        category: lead.category,
        city: lead.city,
      },
      lastOutreach.body,
      settings,
      lastOutreach.language,
    );
    await saveGeneratedMessage({
      lead_id: lead.id,
      message_type: "follow_up",
      language: result.language,
      body: result.body,
    });
    revalidatePath(`/leads/${lead.id}`);
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to draft follow-up");
  }
}
