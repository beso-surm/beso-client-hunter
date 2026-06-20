"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { LEAD_STATUSES } from "@/lib/constants";
import { updateLeadStatusAction } from "@/app/actions/leads";
import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types";

const PILL_COLORS: Record<LeadStatus, { active: string; inactive: string }> = {
  new:              { active: "border-slate-700 bg-slate-700 text-white",         inactive: "border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-800" },
  ready:            { active: "border-violet-600 bg-violet-600 text-white",       inactive: "border-violet-300 text-violet-600 hover:border-violet-500" },
  approved:         { active: "border-sky-600 bg-sky-600 text-white",             inactive: "border-sky-300 text-sky-600 hover:border-sky-500" },
  contacted:        { active: "border-indigo-600 bg-indigo-600 text-white",       inactive: "border-indigo-300 text-indigo-600 hover:border-indigo-500" },
  replied:          { active: "border-amber-500 bg-amber-500 text-white",         inactive: "border-amber-300 text-amber-600 hover:border-amber-500" },
  not_interested:   { active: "border-red-600 bg-red-600 text-white",             inactive: "border-red-300 text-red-500 hover:border-red-500" },
  potential_client: { active: "border-emerald-600 bg-emerald-600 text-white",     inactive: "border-emerald-300 text-emerald-600 hover:border-emerald-500" },
  won:              { active: "border-emerald-700 bg-emerald-700 text-white",     inactive: "border-emerald-400 text-emerald-700 hover:border-emerald-600" },
};

const SHORT_LABELS: Record<LeadStatus, string> = {
  new:              "New",
  ready:            "Ready",
  approved:         "Approved",
  contacted:        "Contacted",
  replied:          "Replied",
  not_interested:   "Not interested",
  potential_client: "Potential client",
  won:              "Won ✓",
};

export function StatusControl({
  leadId,
  status,
}: {
  leadId: string;
  status: LeadStatus;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<LeadStatus>(status);
  const [loading, setLoading] = useState<LeadStatus | null>(null);

  async function change(next: LeadStatus) {
    if (next === current || loading) return;
    setLoading(next);
    await updateLeadStatusAction({ id: leadId, status: next });
    setCurrent(next);
    setLoading(null);
    router.refresh();
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
        Status
      </p>
      <div className="flex flex-wrap gap-2">
        {LEAD_STATUSES.map((s) => {
          const isActive = s.value === current;
          const isLoading = loading === s.value;
          const colors = PILL_COLORS[s.value];
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => change(s.value)}
              disabled={!!loading}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
                isActive ? colors.active : cn("bg-white", colors.inactive),
              )}
            >
              {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {SHORT_LABELS[s.value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
