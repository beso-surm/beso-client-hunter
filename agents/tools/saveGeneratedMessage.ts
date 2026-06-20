/**
 * Tool: saveGeneratedMessage(data) — persist a draft message.
 * Always saved unapproved: nothing is ever sent automatically.
 */

import "server-only";
import { createMessage, type CreateMessageData } from "@/lib/repo";
import type { GeneratedMessage } from "@/types";

export async function saveGeneratedMessage(
  data: CreateMessageData,
): Promise<GeneratedMessage> {
  return createMessage({ ...data, approved: false });
}
