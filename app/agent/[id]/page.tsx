import { notFound } from "next/navigation";
import { Lock, Rocket } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { getCampaignWithPairs, listLeadsByIds, getCampaignLeadIds } from "@/lib/repo";
import { CampaignRunner } from "@/components/CampaignRunner";
import { CampaignSummary } from "@/components/CampaignSummary";
import { ReviewQueue } from "@/components/ReviewQueue";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cwp = await getCampaignWithPairs(id);
  if (!cwp) notFound();

  const leadIds = await getCampaignLeadIds(id);
  const leads = await listLeadsByIds(leadIds);

  const isComplete = cwp.status === "completed";

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <BackButton label="All campaigns" fallbackHref="/agent" />

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
          <Rocket className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {cwp.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {cwp.cities.join(", ")} · {cwp.categories.join(", ")}
          </p>
        </div>
      </div>

      {/* Safety notice */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
        <p className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">Nothing is sent automatically.</span>{" "}
          Leads are drafted for your review. Approve and send them yourself.
        </p>
      </div>

      {/* Runner or Summary */}
      {!isComplete ? (
        <CampaignRunner campaign={cwp} />
      ) : (
        <>
          <CampaignSummary campaign={cwp} leads={leads} />

          <div>
            <h2 className="mb-4 text-base font-semibold text-slate-700">
              Review queue{" "}
              <span className="text-slate-400 font-normal">
                ({leads.filter((l) => l.status === "ready").length} ready)
              </span>
            </h2>
            <ReviewQueue campaignId={id} leads={leads} />
          </div>
        </>
      )}
    </div>
  );
}
