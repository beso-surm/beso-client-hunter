import {
  getStats,
  getSettings,
  listAgentRuns,
  listLeadsWithAnalysis,
  type LeadFilters,
} from "@/lib/repo";
import { LEAD_STATUSES } from "@/lib/constants";
import { FileText, Edit3, CheckCircle, Send, Trophy } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { LeadCard } from "@/components/LeadCard";
import { LeadFilters as LeadFiltersBar } from "@/components/LeadFilters";
import { DashboardActions } from "@/components/DashboardActions";
import { RecentRuns } from "@/components/RecentRuns";
import { ExportMenu } from "@/components/ExportMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import type { LeadStatus, Market } from "@/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const statusParam = one(sp.status);
  const validStatus = LEAD_STATUSES.some((s) => s.value === statusParam)
    ? (statusParam as LeadStatus)
    : null;
  const minScoreParam = one(sp.minScore);
  const marketParam = one(sp.market);
  const validMarket =
    marketParam === "Georgia" || marketParam === "USA"
      ? (marketParam as Market)
      : null;

  const filters: LeadFilters = {
    q: one(sp.q) ?? null,
    city: one(sp.city) ?? null,
    category: one(sp.category) ?? null,
    status: validStatus,
    minScore: minScoreParam ? Number(minScoreParam) : null,
    market: validMarket,
  };

  const [leads, stats, runs, settings] = await Promise.all([
    listLeadsWithAnalysis(filters),
    getStats(),
    listAgentRuns(5),
    getSettings(),
  ]);

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.city ||
      filters.category ||
      filters.status ||
      filters.minScore ||
      filters.market,
  );

  const leadsQuery = new URLSearchParams(
    Object.fromEntries(
      Object.entries({
        status: filters.status,
        city: filters.city,
        category: filters.category,
        market: filters.market,
      }).filter(([, v]) => v != null) as [string, string][],
    ),
  ).toString();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Find businesses that need a website, analyze them, and review draft
            outreach.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu leadsQuery={leadsQuery} />
          <DashboardActions
            defaultCity={settings.preferred_cities[0]}
            defaultCategory={settings.preferred_categories[0]}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total leads" value={stats.total} Icon={FileText} />
        <StatCard
          label="Ready to review"
          value={stats.ready}
          accent="violet"
          Icon={Edit3}
        />
        <StatCard
          label="Approved"
          value={stats.approved}
          accent="violet"
          Icon={CheckCircle}
        />
        <StatCard
          label="Contacted"
          value={stats.contacted}
          accent="indigo"
          Icon={Send}
        />
        <StatCard label="Won" value={stats.won} accent="green" Icon={Trophy} />
      </div>

      {/* Filters */}
      <LeadFiltersBar />

      {/* Lead grid */}
      {leads.length === 0 ? (
        <EmptyState
          title={
            hasActiveFilters ? "No leads match your filters" : "No leads yet"
          }
          description={
            hasActiveFilters
              ? "Try clearing the filters above."
              : "Run the agent to discover businesses, or add a lead manually to get started."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      {/* Recent agent runs */}
      <RecentRuns runs={runs} />
    </div>
  );
}
