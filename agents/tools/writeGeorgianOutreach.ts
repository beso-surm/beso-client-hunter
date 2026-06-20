/**
 * Tool: writeGeorgianOutreach(lead, analysis)
 *
 * Produces a first-contact DRAFT (never sent automatically). Uses Claude when
 * available; otherwise a clean per-language template so the pipeline still
 * yields a usable draft.
 */

import "server-only";
import { claudeEnabled, generateJSON } from "@/lib/claude";
import { messageAISchema } from "@/lib/schemas";
import { buildOutreachPrompt } from "@/agents/prompts/outreach";
import type { LeadAnalysis, MessageLanguage, Settings } from "@/types";

export interface OutreachLead {
  business_name: string;
  category: string | null;
  city: string | null;
}

export interface OutreachResult {
  body: string;
  language: MessageLanguage;
  aiUsed: boolean;
}

export async function writeGeorgianOutreach(
  lead: OutreachLead,
  analysis: LeadAnalysis,
  settings: Settings,
  language?: MessageLanguage,
): Promise<OutreachResult> {
  const lang = language ?? settings.default_language ?? "ka";

  if (claudeEnabled) {
    const { system, user } = buildOutreachPrompt({
      businessName: lead.business_name,
      category: lead.category,
      city: lead.city,
      analysis,
      settings,
      language: lang,
    });
    const { body } = await generateJSON({
      system,
      user,
      schema: messageAISchema,
      maxTokens: 1200,
    });
    return { body, language: lang, aiUsed: true };
  }

  return { body: templateOutreach(lead, settings, lang), language: lang, aiUsed: false };
}

function templateOutreach(
  lead: OutreachLead,
  settings: Settings,
  lang: MessageLanguage,
): string {
  const name = lead.business_name;
  const city = lead.city ?? "";
  const sign = settings.signature || settings.my_name;
  const cat = (lead.category ?? "business").toLowerCase();

  if (lang === "ka") {
    return [
      `გამარჯობა! 👋 ვნახე ${name}${city ? ` (${city})` : ""}.`,
      "",
      "შევამჩნიე, რომ ონლაინ კარგად ვერ ჩანხართ — დღეს კლიენტების უმეტესობა ჯერ Google-ში ეძებს, და თანამედროვე ვებგვერდის გარეშე ბევრ მათგანს კარგავთ.",
      "",
      `მე ვაკეთებ სწრაფ, მობილურზე მორგებულ ვებგვერდებს — ფასებით, ფოტოებითა და კონტაქტის/ჯავშნის ფორმით (ქართ./ინგ./რუს.).`,
      "",
      "თუ დაგაინტერესებთ, სიამოვნებით გაჩვენებთ მაგალითს და მოკლედ გეტყვით ფასს.",
      "",
      "პატივისცემით,",
      sign,
    ].join("\n");
  }

  if (lang === "ru") {
    return [
      `Здравствуйте! 👋 Увидел(а) ${name}${city ? ` (${city})` : ""}.`,
      "",
      "Заметил(а), что в интернете вас сложно найти — сегодня большинство клиентов сначала ищут в Google, и без современного сайта вы теряете часть из них.",
      "",
      `Я делаю быстрые, удобные для телефона сайты для ${cat}-бизнеса — с ценами, фото и формой связи/брони (груз./англ./рус.).`,
      "",
      "Если интересно, с радостью покажу пример и сориентирую по цене.",
      "",
      "С уважением,",
      sign,
    ].join("\n");
  }

  const formNote = settings.market === "USA"
    ? "with prices, photos and a contact/booking form"
    : "with prices, photos and a contact/booking form (KA/EN/RU)";

  return [
    `Hi! 👋 I came across ${name}${city ? ` in ${city}` : ""}.`,
    "",
    "I noticed you're hard to find online — most customers search on Google first, and without a modern website you're losing some of them.",
    "",
    `I build fast, mobile-friendly websites for ${cat} businesses — ${formNote}.`,
    "",
    "If you're interested, I'd happily show you an example and give you a quick quote.",
    "",
    "Best regards,",
    sign,
  ].join("\n");
}
