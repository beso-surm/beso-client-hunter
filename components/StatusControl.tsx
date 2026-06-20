"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { LEAD_STATUSES } from "@/lib/constants";
import { updateLeadStatusAction } from "@/app/actions/leads";
import type { LeadStatus } from "@/types";

export function StatusControl({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function change(next: LeadStatus) {
    setLoading(true);
    await updateLeadStatusAction({ id: leadId, status: next });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        onChange={(e) => change(e.target.value as LeadStatus)}
        disabled={loading}
        className="w-auto"
        aria-label="Lead status"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      {loading ? <Spinner className="text-slate-400" /> : null}
    </div>
  );
}
