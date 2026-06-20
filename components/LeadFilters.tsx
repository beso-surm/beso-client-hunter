"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Field";
import { CITIES, CATEGORIES, LEAD_STATUSES } from "@/lib/constants";

export function LeadFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the text box in sync if the URL changes elsewhere (e.g. Clear).
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

  const hasFilters = ["q", "city", "category", "status", "minScore"].some((k) =>
    sp.get(k),
  );

  return (
    <Card className="p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search business name…"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          className="lg:col-span-1"
        />
        <Select
          value={sp.get("city") ?? ""}
          onChange={(e) => setParam("city", e.target.value)}
          aria-label="Filter by city"
        >
          <option value="">All cities</option>
          {CITIES.map((c) => (
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
          {CATEGORIES.map((c) => (
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

      {hasFilters ? (
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => router.push(pathname)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            Clear filters
          </button>
        </div>
      ) : null}
    </Card>
  );
}
