"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, MapPin, Tag } from "lucide-react";
import { runCampaignPairAction, completeCampaignAction } from "@/app/actions/campaign-agent";
import { cn } from "@/lib/utils";
import type { CampaignWithPairs, CampaignPair } from "@/types";

interface Props {
  campaign: CampaignWithPairs;
}

export function CampaignRunner({ campaign }: Props) {
  const router = useRouter();
  const initialIdx = campaign.pairs.filter((p) => p.status !== "pending").length;
  const [currentIdx, setCurrentIdx] = useState(initialIdx);
  const [pairs, setPairs] = useState<CampaignPair[]>(campaign.pairs);
  const [done, setDone] = useState(initialIdx >= campaign.total_pairs);
  const [errors, setErrors] = useState<string[]>([]);
  const runningRef = useRef(false);

  const stats = pairs.reduce(
    (acc, p) => ({
      found: acc.found + p.found,
      saved: acc.saved + p.saved,
      skipped_duplicate: acc.skipped_duplicate + p.skipped_duplicate,
      skipped_below_score: acc.skipped_below_score + p.skipped_below_score,
      skipped_has_website: acc.skipped_has_website + p.skipped_has_website,
      high_value: acc.high_value + p.high_value,
    }),
    { found: 0, saved: 0, skipped_duplicate: 0, skipped_below_score: 0, skipped_has_website: 0, high_value: 0 },
  );

  // If all pairs were already done when we mounted (e.g. page reload after run),
  // the main effect exits early (done=true) and never calls finalize().
  // This one-time effect catches that case and marks the campaign complete.
  useEffect(() => {
    if (initialIdx >= campaign.total_pairs && campaign.status !== "completed") {
      completeCampaignAction(campaign.id).then(() => router.refresh());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (done || runningRef.current) return;
    if (currentIdx >= campaign.pairs.length) {
      finalize();
      return;
    }
    const pair = campaign.pairs[currentIdx];
    if (pair.status === "completed" || pair.status === "failed") {
      setCurrentIdx((i) => i + 1);
      return;
    }

    runningRef.current = true;
    runCampaignPairAction(campaign.id, pair.id).then((res) => {
      runningRef.current = false;
      setPairs((prev) =>
        prev.map((p) =>
          p.id === pair.id
            ? {
                ...p,
                status: res.ok ? "completed" : "failed",
                found: res.ok ? res.data.found : p.found,
                saved: res.ok ? res.data.saved : p.saved,
                skipped_duplicate: res.ok ? res.data.skipped_duplicate : p.skipped_duplicate,
                skipped_below_score: res.ok ? res.data.skipped_below_score : p.skipped_below_score,
                skipped_has_website: res.ok ? res.data.skipped_has_website : p.skipped_has_website,
                high_value: res.ok ? res.data.high_value : p.high_value,
                error: !res.ok ? res.error : null,
              }
            : p,
        ),
      );
      if (!res.ok) {
        setErrors((e) => [...e, `${pair.city} × ${pair.category}: ${res.error}`]);
      }
      setCurrentIdx((i) => i + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, done]);

  function finalize() {
    setDone(true);
    completeCampaignAction(campaign.id).then(() => {
      router.refresh();
    });
  }

  const currentPair = done ? null : pairs[currentIdx];
  const progress = Math.round((currentIdx / campaign.total_pairs) * 100);

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {done ? "Campaign complete" : "Running campaign…"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {currentIdx} of {campaign.total_pairs} pairs done
            </p>
          </div>
          <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 rounded-full bg-slate-100">
          <div
            className={cn(
              "h-2 rounded-full transition-all duration-500",
              done ? "bg-emerald-500" : "bg-indigo-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-4 sm:grid-cols-6">
          {[
            { label: "Found", value: stats.found, color: "text-slate-700" },
            { label: "Saved", value: stats.saved, color: "text-emerald-600" },
            { label: "Duplicate", value: stats.skipped_duplicate, color: "text-slate-400" },
            { label: "Low score", value: stats.skipped_below_score, color: "text-slate-400" },
            { label: "Has site", value: stats.skipped_has_website, color: "text-slate-400" },
            { label: "High value", value: stats.high_value, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {currentPair && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            <MapPin className="h-3.5 w-3.5" />
            {currentPair.city}
            <span className="text-slate-300">·</span>
            <Tag className="h-3.5 w-3.5" />
            {currentPair.category}
          </div>
        )}
      </div>

      {/* Pair list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Pair progress</h3>
        </div>
        <ul className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
          {pairs.map((p, i) => {
            const isActive = i === currentIdx && !done;
            return (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 text-sm",
                  isActive && "bg-indigo-50",
                )}
              >
                <div className="flex-shrink-0">
                  {p.status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : p.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-red-400" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                  )}
                </div>
                <span className="flex-1 text-slate-700">
                  {p.city} <span className="text-slate-400">×</span> {p.category}
                </span>
                {p.status === "completed" && (
                  <span className="text-xs text-slate-400">
                    {p.saved} saved
                  </span>
                )}
                {p.status === "failed" && p.error && (
                  <span className="text-xs text-red-400" title={p.error}>
                    error
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-400">
            Errors ({errors.length})
          </p>
          <ul className="space-y-1">
            {errors.map((e, i) => (
              <li key={i} className="text-xs text-red-600">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
