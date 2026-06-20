"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckSquare, XSquare, Download, MapPin, Tag } from "lucide-react";
import { bulkUpdateLeadsAction } from "@/app/actions/campaign-agent";
import { ScoreBadge, StatusBadge } from "@/components/Badges";
import { cn } from "@/lib/utils";
import type { LeadWithAnalysis } from "@/lib/repo";

interface Props {
  campaignId: string;
  leads: LeadWithAnalysis[];
}

export function ReviewQueue({ campaignId, leads }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  const readyLeads = leads.filter((l) => l.status === "ready");

  function toggleAll() {
    if (selected.size === readyLeads.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(readyLeads.map((l) => l.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkAction(status: "approved" | "not_interested") {
    if (!selected.size) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await bulkUpdateLeadsAction(campaignId, [...selected], status);
      if (res.ok) {
        setFeedback(`${res.data.updated} leads marked as "${status.replace("_", " ")}".`);
        setSelected(new Set());
        router.refresh();
      } else {
        setFeedback(`Error: ${res.error}`);
      }
    });
  }

  function exportApproved() {
    const approved = leads.filter((l) => l.status === "approved");
    const header = "business_name,city,category,phone,email,website,score,status";
    const rows = approved.map((l) =>
      [
        `"${(l.business_name ?? "").replace(/"/g, '""')}"`,
        l.city ?? "",
        l.category ?? "",
        l.phone ?? "",
        l.email ?? "",
        l.website_url ?? "",
        l.analysis?.lead_score ?? "",
        l.status,
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-approved-leads.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!leads.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
        <p className="text-sm text-slate-400">No leads in this campaign yet.</p>
      </div>
    );
  }

  const approvedCount = leads.filter((l) => l.status === "approved").length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAll}
            disabled={!readyLeads.length}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selected.size === readyLeads.length && readyLeads.length > 0
              ? "Deselect all"
              : "Select all ready"}
          </button>

          {selected.size > 0 && (
            <>
              <button
                onClick={() => bulkAction("approved")}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:opacity-50"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Approve {selected.size}
              </button>
              <button
                onClick={() => bulkAction("not_interested")}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <XSquare className="h-3.5 w-3.5" />
                Reject {selected.size}
              </button>
            </>
          )}
        </div>

        {approvedCount > 0 && (
          <button
            onClick={exportApproved}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-100"
          >
            <Download className="h-3.5 w-3.5" />
            Export {approvedCount} approved
          </button>
        )}
      </div>

      {feedback && (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {feedback}
        </p>
      )}

      {/* Lead list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-50">
        {leads.map((lead) => {
          const isReady = lead.status === "ready";
          const isChecked = selected.has(lead.id);
          return (
            <div
              key={lead.id}
              className={cn("flex items-center gap-4 px-5 py-4", isChecked && "bg-indigo-50/40")}
            >
              {isReady ? (
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(lead.id)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              ) : (
                <div className="h-4 w-4 flex-shrink-0" />
              )}

              <Link
                href={`/leads/${lead.id}`}
                className="min-w-0 flex-1 hover:opacity-80"
              >
                <p className="truncate text-sm font-medium text-slate-900">
                  {lead.business_name}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                  {lead.city && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {lead.city}
                    </span>
                  )}
                  {lead.category && (
                    <span className="flex items-center gap-0.5">
                      <Tag className="h-3 w-3" />
                      {lead.category}
                    </span>
                  )}
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <StatusBadge status={lead.status} />
                <ScoreBadge score={lead.analysis?.lead_score ?? null} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
