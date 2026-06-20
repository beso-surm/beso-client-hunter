"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { addContactAttemptAction } from "@/app/actions/leads";
import type { ContactChannel, ContactOutcome } from "@/types";

const CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "in_person", label: "In person" },
  { value: "other", label: "Other" },
];

const OUTCOMES: { value: ContactOutcome; label: string }[] = [
  { value: "no_answer", label: "No answer" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "callback", label: "Call back later" },
  { value: "meeting", label: "Meeting booked" },
  { value: "other", label: "Other" },
];

export function ContactAttemptForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [channel, setChannel] = useState<ContactChannel>("phone");
  const [outcome, setOutcome] = useState<ContactOutcome | "">("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickLoading, setQuickLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await addContactAttemptAction({
      lead_id: leadId,
      channel,
      outcome: outcome || undefined,
      note,
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNote("");
    setOutcome("");
    router.refresh();
  }

  async function logNoSocials() {
    setQuickLoading(true);
    setError(null);
    const res = await addContactAttemptAction({
      lead_id: leadId,
      channel: "other",
      note: "Could not find social media profiles for this business.",
    });
    setQuickLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {/* Quick preset */}
      <button
        type="button"
        onClick={logNoSocials}
        disabled={quickLoading}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
      >
        {quickLoading ? (
          <Spinner className="h-3.5 w-3.5" />
        ) : (
          <UserX className="h-3.5 w-3.5 text-slate-400" />
        )}
        Could not find socials
      </button>

      <div className="flex items-center gap-2 text-xs text-slate-300">
        <div className="flex-1 border-t border-slate-100" />
        <span>or log manually</span>
        <div className="flex-1 border-t border-slate-100" />
      </div>

      {/* Manual form */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={channel}
            onChange={(e) => setChannel(e.target.value as ContactChannel)}
            aria-label="Channel"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as ContactOutcome | "")}
            aria-label="Outcome"
          >
            <option value="">Outcome…</option>
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <Input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <Button size="sm" onClick={submit} disabled={loading} className="w-full">
          {loading ? <Spinner /> : "Log contact attempt"}
        </Button>
      </div>
    </div>
  );
}
