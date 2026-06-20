/**
 * Tool: writeFollowUp(lead, previousMessage)
 *
 * Drafts a gentle follow-up after no reply. Draft only — never sent.
 */

import "server-only";
import { claudeEnabled, generateJSON } from "@/lib/claude";
import { messageAISchema } from "@/lib/schemas";
import { buildFollowUpPrompt } from "@/agents/prompts/outreach";
import type { MessageLanguage, Settings } from "@/types";
import type { OutreachLead, OutreachResult } from "@/agents/tools/writeGeorgianOutreach";

export async function writeFollowUp(
  lead: OutreachLead,
  previousMessage: string,
  settings: Settings,
  language?: MessageLanguage,
): Promise<OutreachResult> {
  const lang = language ?? settings.default_language ?? "ka";

  if (claudeEnabled) {
    const { system, user } = buildFollowUpPrompt({
      businessName: lead.business_name,
      category: lead.category,
      city: lead.city,
      previousMessage,
      settings,
      language: lang,
    });
    const { body } = await generateJSON({
      system,
      user,
      schema: messageAISchema,
      maxTokens: 900,
    });
    return { body, language: lang, aiUsed: true };
  }

  return {
    body: templateFollowUp(lead, settings, lang),
    language: lang,
    aiUsed: false,
  };
}

function templateFollowUp(
  lead: OutreachLead,
  settings: Settings,
  lang: MessageLanguage,
): string {
  const name = lead.business_name;
  const sign = settings.signature || settings.my_name;

  if (lang === "ka") {
    return [
      `გამარჯობა კიდევ ერთხელ! 👋 უბრალოდ შეგახსენებთ წინა შეტყობინებას ${name}-ის შესახებ.`,
      "",
      "თუ დრო გექნებათ, სიამოვნებით გამოგიგზავნით უფასო მოკლე იდეას, როგორი შეიძლება იყოს თქვენი ვებგვერდი — ვალდებულების გარეშე.",
      "",
      "პატივისცემით,",
      sign,
    ].join("\n");
  }

  if (lang === "ru") {
    return [
      `Здравствуйте ещё раз! 👋 Просто напоминаю о своём предыдущем сообщении по поводу ${name}.`,
      "",
      "Если будет минутка, с радостью пришлю бесплатную короткую идею, как мог бы выглядеть ваш сайт — без обязательств.",
      "",
      "С уважением,",
      sign,
    ].join("\n");
  }

  return [
    `Hi again! 👋 Just following up on my previous note about ${name}.`,
    "",
    "If you have a minute, I'd happily send a free quick mockup idea of how your website could look — no obligation.",
    "",
    "Best regards,",
    sign,
  ].join("\n");
}
