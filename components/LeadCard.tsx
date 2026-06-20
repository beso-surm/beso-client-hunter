import Link from "next/link";
import { Phone, Mail, Globe, Camera, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  ScoreBadge,
  StatusBadge,
  WebsiteStatusBadge,
} from "@/components/Badges";
import type { LeadWithAnalysis } from "@/lib/repo";

export function LeadCard({ lead }: { lead: LeadWithAnalysis }) {
  const contacts = [
    { has: !!lead.phone, Icon: Phone, label: "Phone" },
    { has: !!lead.email, Icon: Mail, label: "Email" },
    { has: !!lead.instagram_url, Icon: Camera, label: "Instagram" },
    { has: !!lead.website_url, Icon: Globe, label: "Website" },
  ];

  return (
    <Link href={`/leads/${lead.id}`} className="group block">
      <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all group-hover:border-indigo-200 group-hover:shadow-md">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-900 transition-colors group-hover:text-indigo-600">
              {lead.business_name}
            </h3>
            {(lead.category || lead.city) && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                {lead.city && (
                  <>
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span>{[lead.category, lead.city].filter(Boolean).join(" · ")}</span>
                  </>
                )}
                {!lead.city && lead.category && <span>{lead.category}</span>}
              </p>
            )}
          </div>
          <ScoreBadge score={lead.analysis?.lead_score ?? null} />
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={lead.status} />
          {lead.analysis ? (
            <WebsiteStatusBadge status={lead.analysis.website_status} />
          ) : null}
          {lead.source === "demo" ? <Badge tone="amber">Demo</Badge> : null}
        </div>

        {/* Contact icons */}
        <div className="mt-4 flex items-center gap-2">
          {contacts.map(({ has, Icon, label }) => (
            <span
              key={label}
              title={label}
              className={
                has
                  ? "text-slate-500"
                  : "text-slate-200"
              }
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
