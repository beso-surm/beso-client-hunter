"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label, Select, Input, FieldError } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { CITIES, US_CITIES, CAMPAIGN_CATEGORIES, MARKETS, type Market } from "@/lib/constants";
import { runAgentAction } from "@/app/actions/agent";
import { cn } from "@/lib/utils";
import type { AgentRunSummary } from "@/types";

export function RunAgentForm({
  defaultCity,
  defaultCategory,
  defaultMarket = "Georgia",
  onDone,
}: {
  defaultCity?: string;
  defaultCategory?: string;
  defaultMarket?: Market;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [market, setMarket] = useState<Market>(defaultMarket);
  const cityList = market === "USA" ? US_CITIES : CITIES;
  const [city, setCity] = useState(defaultCity ?? cityList[0]);
  const [categories, setCategories] = useState<string[]>(
    defaultCategory ? [defaultCategory] : [...CAMPAIGN_CATEGORIES],
  );
  const [maxResults, setMaxResults] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AgentRunSummary | null>(null);

  function switchMarket(m: Market) {
    setMarket(m);
    setCity((m === "USA" ? US_CITIES : CITIES)[0]);
  }

  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  async function run() {
    setLoading(true);
    setError(null);
    setSummary(null);
    const res = await runAgentAction({ city, categories, maxResults });
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
          Every lead got a draft outreach message marked "ready for review".
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

  const estimatedLeads = categories.length * maxResults;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        The agent searches for businesses, checks their web presence, analyzes
        and scores them, and drafts an outreach message for each — all for your
        review. It never contacts anyone.
      </p>

      {/* Market toggle */}
      <div>
        <Label>Market</Label>
        <div className="flex gap-2">
          {MARKETS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => switchMarket(m.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                market === m.value
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* City + Max results */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="agent-city">City</Label>
          <Select
            id="agent-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            {cityList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="agent-max" hint="per category">
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
      </div>

      {/* Categories — multi-select chips */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>
            Categories{" "}
            <span className="font-normal text-slate-400">
              ({categories.length} selected)
            </span>
          </Label>
          <div className="flex gap-3 text-xs">
            <button
              type="button"
              onClick={() => setCategories([...CAMPAIGN_CATEGORIES])}
              className="text-indigo-600 hover:underline"
            >
              All
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setCategories([])}
              className="text-slate-400 hover:underline"
            >
              None
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CAMPAIGN_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                categories.includes(cat)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 1 && (
        <p className="text-xs text-slate-500">
          {categories.length} categories × {maxResults} = up to{" "}
          <span className="font-semibold text-slate-700">{estimatedLeads}</span>{" "}
          leads searched. Runs sequentially — may take a couple of minutes.
        </p>
      )}

      <FieldError>{error}</FieldError>

      <div className="flex justify-end">
        <Button
          onClick={run}
          disabled={loading || categories.length === 0}
          variant="secondary"
        >
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
