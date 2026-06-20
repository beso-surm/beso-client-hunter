"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rocket } from "lucide-react";
import {
  CAMPAIGN_CITIES,
  US_CAMPAIGN_CITIES,
  CAMPAIGN_CATEGORIES,
  DEFAULT_CAMPAIGN_CITIES,
  DEFAULT_CAMPAIGN_CATEGORIES,
  DEFAULT_US_CAMPAIGN_CITIES,
  DEFAULT_US_CAMPAIGN_CATEGORIES,
  MARKETS,
  type Market,
} from "@/lib/constants";
import { createCampaignAction } from "@/app/actions/campaign-agent";
import { cn } from "@/lib/utils";

export function CampaignAgentForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(() => {
    const d = new Date();
    return `Campaign ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
  });
  const [market, setMarket] = useState<Market>("Georgia");
  const campaignCityList = market === "USA" ? US_CAMPAIGN_CITIES : CAMPAIGN_CITIES;
  const [cities, setCities] = useState<string[]>(DEFAULT_CAMPAIGN_CITIES);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CAMPAIGN_CATEGORIES);

  function switchMarket(m: Market) {
    setMarket(m);
    setCities(m === "USA" ? [...DEFAULT_US_CAMPAIGN_CITIES] : [...DEFAULT_CAMPAIGN_CITIES]);
    setCategories(m === "USA" ? [...DEFAULT_US_CAMPAIGN_CATEGORIES] : [...DEFAULT_CAMPAIGN_CATEGORIES]);
  }
  const [maxPerPair, setMaxPerPair] = useState(8);
  const [minScore, setMinScore] = useState(0);
  const [skipWithWebsite, setSkipWithWebsite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPairs = cities.length * categories.length;
  const estLeads = totalPairs * maxPerPair;

  function toggleCity(city: string) {
    setCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city],
    );
  }
  function toggleCategory(cat: string) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createCampaignAction({
        name,
        market,
        cities,
        categories,
        max_per_pair: maxPerPair,
        min_score: minScore,
        skip_with_website: skipWithWebsite,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/agent/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Campaign name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Campaign name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          required
        />
      </div>

      {/* Market */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-700">Market</label>
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
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cities */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Cities <span className="ml-1 text-slate-400">({cities.length} selected)</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCities([...campaignCityList])}
              className="text-xs text-indigo-600 hover:underline"
            >
              All
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setCities([])}
              className="text-xs text-slate-400 hover:underline"
            >
              None
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaignCityList.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => toggleCity(city)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                cities.includes(city)
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600",
              )}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">
            Categories <span className="ml-1 text-slate-400">({categories.length} selected)</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCategories([...CAMPAIGN_CATEGORIES])}
              className="text-xs text-indigo-600 hover:underline"
            >
              All
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setCategories([])}
              className="text-xs text-slate-400 hover:underline"
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
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                categories.includes(cat)
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-violet-600",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Config options */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Max leads per pair
          </label>
          <select
            value={maxPerPair}
            onChange={(e) => setMaxPerPair(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {[3, 5, 8, 10, 15, 20].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Min score to keep
          </label>
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value={0}>No filter</option>
            <option value={40}>40+ (any interest)</option>
            <option value={55}>55+ (decent)</option>
            <option value={70}>70+ (high value only)</option>
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-2.5">
            <div className="relative">
              <input
                type="checkbox"
                checked={skipWithWebsite}
                onChange={(e) => setSkipWithWebsite(e.target.checked)}
                className="sr-only"
              />
              <div
                className={cn(
                  "h-5 w-9 rounded-full transition-colors",
                  skipWithWebsite ? "bg-indigo-600" : "bg-slate-200",
                )}
              />
              <div
                className={cn(
                  "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                  skipWithWebsite ? "translate-x-4" : "translate-x-0",
                )}
              />
            </div>
            <span className="text-sm text-slate-700">Skip businesses with a website</span>
          </label>
        </div>
      </div>

      {/* Estimate */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{totalPairs}</span> pairs ·{" "}
          up to <span className="font-semibold text-slate-800">{estLeads}</span> leads searched
          {minScore > 0 && (
            <> · only score ≥ {minScore} saved</>
          )}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Each pair runs as a separate request (~30 s). Nothing is sent automatically.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !cities.length || !categories.length}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Rocket className="h-4 w-4" />
        {pending ? "Creating…" : "Create & Start Campaign"}
      </button>
    </form>
  );
}
