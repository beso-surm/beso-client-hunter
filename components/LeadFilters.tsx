"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import {
  CITIES,
  CAMPAIGN_CITIES,
  US_CITIES,
  US_CAMPAIGN_CITIES,
  CAMPAIGN_CATEGORIES,
  LEAD_STATUSES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Market } from "@/types";

const GEORGIA_CITIES = [...new Set([...CITIES, ...CAMPAIGN_CITIES])].sort();
const USA_CITIES_LIST = [...new Set([...US_CITIES, ...US_CAMPAIGN_CITIES])].sort();
const ALL_CITIES = [...new Set([...GEORGIA_CITIES, ...USA_CITIES_LIST])].sort();

const MARKETS: { value: "" | Market; label: string }[] = [
  { value: "", label: "All markets" },
  { value: "Georgia", label: "Georgia" },
  { value: "USA", label: "United States" },
];

function cityListFor(market: "" | Market) {
  if (market === "USA") return USA_CITIES_LIST;
  if (market === "Georgia") return GEORGIA_CITIES;
  return ALL_CITIES;
}

export function LeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQ(sp.get("q") ?? "");
  }, [sp]);

  function pushParams(mutate: (p: URLSearchParams) => void) {
    const params = new URLSearchParams(sp.toString());
    mutate(params);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function setParam(key: string, value: string) {
    pushParams((p) => (value ? p.set(key, value) : p.delete(key)));
  }

  function onSearch(value: string) {
    setQ(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam("q", value), 300);
  }

  function selectMarket(value: "" | Market) {
    pushParams((p) => {
      if (value) p.set("market", value);
      else p.delete("market");
      // clear city since options change per market
      p.delete("city");
    });
  }

  const currentMarket = (sp.get("market") ?? "") as "" | Market;
  const cities = cityListFor(currentMarket);

  const hasFilters = ["q", "city", "category", "status", "minScore", "market"].some(
    (k) => sp.get(k),
  );

  return (
    <Card className="p-3 space-y-3">
      {/* Market toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Market:</span>
        {MARKETS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => selectMarket(m.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              currentMarket === m.value
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:text-indigo-600",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search business name…"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
        />
        <Select
          value={sp.get("city") ?? ""}
          onChange={(e) => setParam("city", e.target.value)}
          aria-label="Filter by city"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={sp.get("category") ?? ""}
          onChange={(e) => setParam("category", e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {CAMPAIGN_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={sp.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          value={sp.get("minScore") ?? ""}
          onChange={(e) => setParam("minScore", e.target.value)}
          aria-label="Filter by minimum score"
        >
          <option value="">Any score</option>
          <option value="45">Score 45+</option>
          <option value="70">High value (70+)</option>
        </Select>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <button
            onClick={() => router.push(pathname)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Clear filters
          </button>
        </div>
      )}
    </Card>
  );
}
