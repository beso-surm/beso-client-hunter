import Link from "next/link";
import { Trophy, MapPin, Tag } from "lucide-react";
import { ScoreBadge, StatusBadge } from "@/components/Badges";
import type { CampaignWithPairs } from "@/types";
import type { LeadWithAnalysis } from "@/lib/repo";

interface Props {
  campaign: CampaignWithPairs;
  leads: LeadWithAnalysis[];
}

export function CampaignSummary({ campaign, leads }: Props) {
  const top10 = [...leads]
    .sort((a, b) => (b.analysis?.lead_score ?? 0) - (a.analysis?.lead_score ?? 0))
    .slice(0, 10);

  // City breakdown
  const cityMap: Record<string, { found: number; saved: number }> = {};
  for (const p of campaign.pairs) {
    if (!cityMap[p.city]) cityMap[p.city] = { found: 0, saved: 0 };
    cityMap[p.city].found += p.found;
    cityMap[p.city].saved += p.saved;
  }

  // Category breakdown
  const catMap: Record<string, { found: number; saved: number }> = {};
  for (const p of campaign.pairs) {
    if (!catMap[p.category]) catMap[p.category] = { found: 0, saved: 0 };
    catMap[p.category].found += p.found;
    catMap[p.category].saved += p.saved;
  }

  const totalSkipped =
    campaign.total_skipped_duplicate +
    campaign.total_skipped_below_score +
    campaign.total_skipped_has_website;

  return (
    <div className="space-y-6">
      {/* Stats banner */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total found", value: campaign.total_found, color: "text-slate-700" },
          { label: "Leads saved", value: campaign.total_saved, color: "text-emerald-600" },
          { label: "High value", value: campaign.total_high_value, color: "text-amber-600" },
          { label: "Pairs run", value: campaign.total_pairs, color: "text-indigo-600" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center"
          >
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Skip breakdown */}
      {totalSkipped > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Filtered out (never deleted)
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            {campaign.total_skipped_duplicate > 0 && (
              <span className="text-slate-500">
                <span className="font-semibold text-slate-700">{campaign.total_skipped_duplicate}</span> already in DB
              </span>
            )}
            {campaign.total_skipped_below_score > 0 && (
              <span className="text-slate-500">
                <span className="font-semibold text-slate-700">{campaign.total_skipped_below_score}</span> below min score
              </span>
            )}
            {campaign.total_skipped_has_website > 0 && (
              <span className="text-slate-500">
                <span className="font-semibold text-slate-700">{campaign.total_skipped_has_website}</span> had a website
              </span>
            )}
          </div>
        </div>
      )}

      {/* Top leads */}
      {top10.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">Top leads</h3>
          </div>
          <ul className="divide-y divide-slate-50">
            {top10.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
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
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={lead.status} />
                    <ScoreBadge score={lead.analysis?.lead_score ?? null} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BreakdownTable
          title="By city"
          icon={<MapPin className="h-4 w-4 text-slate-400" />}
          rows={Object.entries(cityMap).sort((a, b) => b[1].saved - a[1].saved)}
        />
        <BreakdownTable
          title="By category"
          icon={<Tag className="h-4 w-4 text-slate-400" />}
          rows={Object.entries(catMap).sort((a, b) => b[1].saved - a[1].saved)}
        />
      </div>
    </div>
  );
}

function BreakdownTable({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: [string, { found: number; saved: number }][];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        {icon}
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th className="px-5 py-2.5 font-medium">Name</th>
            <th className="px-3 py-2.5 text-right font-medium">Found</th>
            <th className="px-5 py-2.5 text-right font-medium">Saved</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map(([name, s]) => (
            <tr key={name} className="text-sm">
              <td className="px-5 py-2.5 text-slate-700">{name}</td>
              <td className="px-3 py-2.5 text-right text-slate-400">{s.found}</td>
              <td className="px-5 py-2.5 text-right font-medium text-emerald-600">{s.saved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
