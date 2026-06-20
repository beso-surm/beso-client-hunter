/**
 * Claude API wrapper.
 *
 * `generateJSON` is the only way the agent talks to the model: it asks for a
 * JSON object, parses it, validates it against a Zod schema, and retries ONCE
 * (feeding the bad output back) if validation fails. Messy AI output never
 * reaches the database.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

const apiKey = process.env.ANTHROPIC_API_KEY;

export const claudeEnabled = Boolean(apiKey);
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";

const client = apiKey ? new Anthropic({ apiKey }) : null;

function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Drop a ```json … ``` fence if the model wrapped its answer in one. */
function stripFences(s: string): string {
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fence ? fence[1] : s).trim();
}

interface GenerateJSONArgs<T> {
  system: string;
  user: string;
  schema: ZodType<T>;
  maxTokens?: number;
}

export async function generateJSON<T>({
  system,
  user,
  schema,
  maxTokens = 2000,
}: GenerateJSONArgs<T>): Promise<T> {
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not set — cannot call Claude.");
  }

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];
  let lastError = "";

  // Two attempts total: one initial, one retry on invalid JSON / schema.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages,
    });

    const text = stripFences(extractText(response));
    try {
      const parsed = JSON.parse(text) as unknown;
      return schema.parse(parsed);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      // Show the model its mistake and ask once more (normal multi-turn,
      // not a prefill — the last message stays role:"user").
      messages.push({ role: "assistant", content: text });
      messages.push({
        role: "user",
        content:
          `Your previous reply was not valid. Error: ${lastError}\n` +
          "Reply again with ONLY a single valid JSON object — no markdown, no code fences, no commentary.",
      });
    }
  }

  throw new Error(`Claude returned invalid JSON after one retry: ${lastError}`);
}
