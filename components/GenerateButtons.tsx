"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { LANGUAGES } from "@/lib/constants";
import { generateOutreachAction } from "@/app/actions/leads";
import { generateFollowUpAction } from "@/app/actions/messages";
import type { MessageLanguage } from "@/types";

export function GenerateButtons({
  leadId,
  canDraft,
  hasMessages,
  defaultLanguage = "ka",
}: {
  leadId: string;
  canDraft: boolean;
  hasMessages: boolean;
  defaultLanguage?: MessageLanguage;
}) {
  const router = useRouter();
  const [lang, setLang] = useState<MessageLanguage>(defaultLanguage);
  const [busy, setBusy] = useState<null | "outreach" | "follow">(null);
  const [error, setError] = useState<string | null>(null);

  async function draftOutreach() {
    setBusy("outreach");
    setError(null);
    const res = await generateOutreachAction(leadId, lang);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function draftFollowUp() {
    setBusy("follow");
    setError(null);
    const res = await generateFollowUpAction(leadId, lang);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={lang}
          onChange={(e) => setLang(e.target.value as MessageLanguage)}
          className="w-auto"
          aria-label="Message language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          onClick={draftOutreach}
          disabled={!canDraft || busy !== null}
          title={canDraft ? undefined : "Analyze the lead first"}
        >
          {busy === "outreach" ? <Spinner /> : "Draft outreach"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={draftFollowUp}
          disabled={!hasMessages || busy !== null}
          title={hasMessages ? undefined : "Draft an outreach message first"}
        >
          {busy === "follow" ? <Spinner /> : "Draft follow-up"}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
