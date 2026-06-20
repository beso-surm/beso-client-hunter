import Link from "next/link";
import { Rocket, Clock, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { listCampaigns, dataMode } from "@/lib/repo";
import { CampaignAgentForm } from "@/components/CampaignAgentForm";
import type { Campaign, CampaignStatus } from "@/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function StatusDot({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "completed" && "bg-emerald-50 text-emerald-700",
        status === "running" && "bg-indigo-50 text-indigo-700",
        status === "pending" && "bg-slate-100 text-slate-500",
        status === "failed" && "bg-red-50 text-red-600",
      )}
    >
      {status === "completed" && <CheckCircle className="h-3 w-3" />}
      {status === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "pending" && <Clock className="h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default async function AgentPage() {
  const isSqlite = dataMode === "sqlite";
  const campaigns: Campaign[] = isSqlite ? await listCampaigns() : [];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Campaign Agent
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Run multi-city, multi-category search campaigns. Leads are drafted for
          your review — nothing is sent automatically.
        </p>
      </div>

      {!isSqlite && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium text-amber-800">
            Campaign Agent requires SQLite storage.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Remove Supabase environment variables to enable local SQLite mode.
          </p>
        </div>
      )}

      {/* Past campaigns */}
      {campaigns.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-slate-700">
            Campaigns
          </h2>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                href={`/agent/${c.id}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Rocket className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {c.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {c.cities.length} cities · {c.categories.length} categories ·{" "}
                    {c.total_saved} saved
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusDot status={c.status} />
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* New campaign form */}
      {isSqlite && (
        <div>
          <h2 className="mb-4 text-base font-semibold text-slate-700">
            New campaign
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <CampaignAgentForm />
          </div>
        </div>
      )}
    </div>
  );
}
