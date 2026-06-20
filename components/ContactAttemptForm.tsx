"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

  return (
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
  );
}
