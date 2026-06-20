"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createLead,
  createAttempt,
  deleteLead,
  getAnalysisByLead,
  getLead,
  getSettings,
  listMessagesByLead,
  updateLead,
  upsertAnalysis,
} from "@/lib/repo";
import {
  contactAttemptSchema,
  newLeadSchema,
  updateStatusSchema,
} from "@/lib/schemas";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { checkWebsite } from "@/agents/tools/checkWebsite";
import { analyzeBusiness } from "@/agents/tools/analyzeBusiness";
import { scoreLead } from "@/agents/tools/scoreLead";
import { writeGeorgianOutreach } from "@/agents/tools/writeGeorgianOutreach";
import { saveGeneratedMessage } from "@/agents/tools/saveGeneratedMessage";
import type { Lead, MessageLanguage } from "@/types";

function zodError(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(", ");
}

export async function createLeadAction(
  input: unknown,
): Promise<ActionResult<Lead>> {
  const parsed = newLeadSchema.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  try {
    const lead = await createLead({ ...parsed.data, source: "manual" });
    revalidatePath("/dashboard");
    return ok(lead);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to create lead");
  }
}

export async function updateLeadStatusAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  try {
    const updated = await updateLead(parsed.data.id, {
      status: parsed.data.status,
    });
    if (!updated) return fail("Lead not found");
    revalidatePath("/dashboard");
    revalidatePath(`/leads/${parsed.data.id}`);
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to update status");
  }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  if (!id) return fail("Missing lead id");
  try {
    await deleteLead(id);
    revalidatePath("/dashboard");
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to delete lead");
  }
}

export async function addContactAttemptAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = contactAttemptSchema.safeParse(input);
  if (!parsed.success) return fail(zodError(parsed.error));
  try {
    await createAttempt(parsed.data);
    revalidatePath(`/leads/${parsed.data.lead_id}`);
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to log attempt");
  }
}

/**
 * Run the AI analysis pipeline for ONE existing lead and draft an outreach
 * message. Used from the lead detail page. Never sends anything.
 */
export async function analyzeLeadAction(leadId: string): Promise<ActionResult> {
  if (!leadId) return fail("Missing lead id");
  try {
    const lead = await getLead(leadId);
    if (!lead) return fail("Lead not found");
    const settings = await getSettings();

    const website = await checkWebsite(lead.website_url);
    const { analysis } = await analyzeBusiness(
      {
        business_name: lead.business_name,
        category: lead.category,
        city: lead.city,
        website_url: lead.website_url,
        instagram_url: lead.instagram_url,
        facebook_url: lead.facebook_url,
        phone: lead.phone,
        email: lead.email,
      },
      website,
      settings,
    );
    const score = scoreLead(analysis, {
      hasPhone: Boolean(lead.phone),
      hasEmail: Boolean(lead.email),
      hasSocial: Boolean(lead.instagram_url || lead.facebook_url),
    });
    const savedAnalysis = await upsertAnalysis({
      lead_id: lead.id,
      ...analysis,
      lead_score: score,
    });

    // Only draft an outreach message if the lead has none yet.
    const existing = await listMessagesByLead(lead.id);
    const status: Lead["status"] = "ready";
    if (existing.length === 0) {
      const outreach = await writeGeorgianOutreach(
        {
          business_name: lead.business_name,
          category: lead.category,
          city: lead.city,
        },
        savedAnalysis,
        settings,
      );
      await saveGeneratedMessage({
        lead_id: lead.id,
        message_type: "outreach",
        language: outreach.language,
        body: outreach.body,
      });
    }

    await updateLead(lead.id, { status });
    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/dashboard");
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Analysis failed");
  }
}

/** Regenerate (or generate) an outreach draft for an analyzed lead. */
export async function generateOutreachAction(
  leadId: string,
  language?: MessageLanguage,
): Promise<ActionResult> {
  if (!leadId) return fail("Missing lead id");
  try {
    const lead = await getLead(leadId);
    if (!lead) return fail("Lead not found");
    const settings = await getSettings();
    const analysis = await getAnalysisByLead(leadId);
    if (!analysis) return fail("Analyze the lead first, then draft a message.");

    const outreach = await writeGeorgianOutreach(
      {
        business_name: lead.business_name,
        category: lead.category,
        city: lead.city,
      },
      analysis,
      settings,
      language,
    );
    await saveGeneratedMessage({
      lead_id: lead.id,
      message_type: "outreach",
      language: outreach.language,
      body: outreach.body,
    });
    if (lead.status === "new") {
      await updateLead(lead.id, { status: "ready" });
    }
    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/dashboard");
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to draft message");
  }
}
