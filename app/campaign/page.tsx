import { getStats, listLeadsWithAnalysis } from "@/lib/repo";
import { ExportMenu } from "@/components/ExportMenu";
import Link from "next/link";
import {
  FileText,
  Edit3,
  CheckCircle,
  Send,
  MessageSquare,
  Star,
  Trophy,
  FileInput,
  Bot,
  PenLine,
  FlaskConical,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

export default async function CampaignPage() {
  const stats = await getStats();
  const leads = await listLeadsWithAnalysis({});

  const bySource = {
    csv: leads.filter((l) => l.source === "csv").length,
    agent: leads.filter(
      (l) => l.source === "agent" || l.source === "google_places",
    ).length,
    manual: leads.filter((l) => l.source === "manual").length,
    demo: leads.filter((l) => l.source === "demo").length,
  };

  const funnelSteps = [
    {
      label: "Total leads",
      count: stats.total,
      total: stats.total,
      Icon: FileText,
      href: "/dashboard",
      color: "text-slate-500 bg-slate-100",
    },
    {
      label: "Ready to review",
      count: stats.ready,
      total: stats.total,
      Icon: Edit3,
      href: "/dashboard?status=ready",
      color: "text-violet-500 bg-violet-50",
    },
    {
      label: "Approved",
      count: stats.approved,
      total: stats.total,
      Icon: CheckCircle,
      href: "/dashboard?status=approved",
      color: "text-blue-500 bg-blue-50",
    },
    {
      label: "Contacted",
      count: stats.contacted,
      total: stats.total,
      Icon: Send,
      href: "/dashboard?status=contacted",
      color: "text-indigo-500 bg-indigo-50",
    },
    {
      label: "Replied",
      count: stats.replied,
      total: stats.total,
      Icon: MessageSquare,
      href: "/dashboard?status=replied",
      color: "text-amber-500 bg-amber-50",
    },
    {
      label: "Potential clients",
      count: stats.potential_client,
      total: stats.total,
      Icon: Star,
      href: "/dashboard?status=potential_client",
      color: "text-emerald-500 bg-emerald-50",
    },
    {
      label: "Won",
      count: stats.won,
      total: stats.total,
      Icon: Trophy,
      href: "/dashboard?status=won",
      color: "text-emerald-600 bg-emerald-100",
    },
  ] as const;

  const sourceItems = [
    { label: "CSV import", count: bySource.csv, Icon: FileInput },
    { label: "AI agent", count: bySource.agent, Icon: Bot },
    { label: "Manual", count: bySource.manual, Icon: PenLine },
    { label: "Demo", count: bySource.demo, Icon: FlaskConical },
  ];

  const conversionMetrics = stats.total > 0
    ? [
        {
          label: "Contacted rate",
          value: `${pct(stats.contacted, stats.total)}%`,
          sub: `${stats.contacted} of ${stats.total}`,
        },
        {
          label: "Reply rate",
          value: stats.contacted
            ? `${pct(stats.replied, stats.contacted)}%`
            : "—",
          sub: `${stats.replied} of ${stats.contacted} contacted`,
        },
        {
          label: "Close rate",
          value: stats.contacted
            ? `${pct(stats.won, stats.contacted)}%`
            : "—",
          sub: `${stats.won} of ${stats.contacted} contacted`,
        },
        {
          label: "High value",
          value: `${pct(stats.highValue, stats.total)}%`,
          sub: `${stats.highValue} scored ≥70`,
        },
      ]
    : null;

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Campaign
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Outreach funnel from discovery to signed client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/import"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Import CSV
          </Link>
          <ExportMenu />
        </div>
      </div>

      {/* Funnel */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {funnelSteps.map((step, i) => (
          <Link
            key={step.label}
            href={step.href}
            className={cn(
              "group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50",
              i < funnelSteps.length - 1 && "border-b border-slate-100",
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                step.color,
              )}
            >
              <step.Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-slate-700 transition-colors group-hover:text-indigo-600">
                  {step.label}
                </span>
                <div className="flex flex-shrink-0 items-baseline gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {step.count}
                  </span>
                  {i > 0 && (
                    <span className="w-10 text-right text-xs text-slate-400">
                      {pct(step.count, step.total)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${pct(step.count, step.total)}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Not interested */}
      {stats.not_interested > 0 && (
        <Link
          href="/dashboard?status=not_interested"
          className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 transition-colors hover:bg-red-100"
        >
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{stats.not_interested}</strong> lead
            {stats.not_interested === 1 ? "" : "s"} marked{" "}
            <em>Not interested</em>
          </span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead sources */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">
            Lead sources
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {sourceItems.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <s.Icon className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">
                    {s.count}
                  </div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion metrics */}
        {conversionMetrics && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Conversion summary
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {conversionMetrics.map((m) => (
                  <div key={m.label}>
                    <div className="text-2xl font-bold text-slate-900">
                      {m.value}
                    </div>
                    <div className="text-xs font-medium text-slate-600">
                      {m.label}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">{m.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
