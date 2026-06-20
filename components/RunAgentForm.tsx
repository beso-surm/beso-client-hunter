"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label, Select, Input, FieldError } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { CITIES, CATEGORIES } from "@/lib/constants";
import { runAgentAction } from "@/app/actions/agent";
import type { AgentRunSummary } from "@/types";

export function RunAgentForm({
  defaultCity,
  defaultCategory,
  onDone,
}: {
  defaultCity?: string;
  defaultCategory?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [city, setCity] = useState(defaultCity ?? CITIES[0]);
  const [category, setCategory] = useState(defaultCategory ?? CATEGORIES[0]);
  const [maxResults, setMaxResults] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AgentRunSummary | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setSummary(null);
    const res = await runAgentAction({ city, category, maxResults });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSummary(res.data ?? null);
    router.refresh();
  }

  if (summary) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            Run complete — {summary.saved} new lead
            {summary.saved === 1 ? "" : "s"} added.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-emerald-700">
            <li>Found: {summary.totalFound}</li>
            <li>Saved: {summary.saved}</li>
            <li>Skipped duplicates: {summary.skippedDuplicates}</li>
            <li>High-value leads: {summary.highValueLeads}</li>
            {summary.errors.length ? (
              <li className="text-amber-700">
                Errors: {summary.errors.length}
              </li>
            ) : null}
          </ul>
        </div>
        <p className="text-xs text-slate-500">
          Every lead got a draft outreach message marked “ready for review”.
          Nothing was sent.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setSummary(null)}>
            Run again
          </Button>
          <Button onClick={() => onDone?.()}>View leads</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        The agent searches for businesses, checks their web presence, analyzes
        and scores them, and drafts a Georgian outreach message for each — all
        for your review. It never contacts anyone.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="agent-city">City</Label>
          <Select
            id="agent-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="agent-category">Category</Label>
          <Select
            id="agent-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="agent-max" hint="1–25">
          Max results
        </Label>
        <Input
          id="agent-max"
          type="number"
          min={1}
          max={25}
          value={maxResults}
          onChange={(e) => setMaxResults(Number(e.target.value))}
        />
      </div>

      <FieldError>{error}</FieldError>

      <div className="flex justify-end">
        <Button onClick={run} disabled={loading} variant="secondary">
          {loading ? (
            <>
              <Spinner /> Running agent…
            </>
          ) : (
            <>🎯 Run agent</>
          )}
        </Button>
      </div>
    </div>
  );
}
