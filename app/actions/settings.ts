"use server";

import { revalidatePath } from "next/cache";
import { saveSettings } from "@/lib/repo";
import { settingsSchema } from "@/lib/schemas";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export async function saveSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => i.message).join(", "));
  }
  if (parsed.data.default_price_min_gel > parsed.data.default_price_max_gel) {
    return fail("Minimum price cannot be greater than maximum price.");
  }
  try {
    await saveSettings(parsed.data);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return ok();
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to save settings");
  }
}
