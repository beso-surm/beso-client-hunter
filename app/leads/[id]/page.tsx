import { notFound } from "next/navigation";
import { Lock, Phone, Mail, Globe, Camera, Link2, MapPin, Tag } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { getLeadWithDetails, getSettings } from "@/lib/repo";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  ScoreBadge,
  WebsiteStatusBadge,
  ConfidenceBadge,
} from "@/components/Badges";
import { StatusControl } from "@/components/StatusControl";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { GenerateButtons } from "@/components/GenerateButtons";
import { MessageCard } from "@/components/MessageCard";
import { ContactAttemptForm } from "@/components/ContactAttemptForm";
import { DeleteLeadButton } from "@/components/DeleteLeadButton";
import { formatRelative, instagramHandle } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, settings] = await Promise.all([
    getLeadWithDetails(id),
    getSettings(),
  ]);
  if (!lead) notFound();

  const a = lead.analysis;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <BackButton label="Back to dashboard" fallbackHref="/dashboard" />

      {/* Header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {lead.business_name}
              </h1>
              {lead.source === "demo" ? (
                <Badge tone="amber">Demo</Badge>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {lead.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {lead.city}
                </span>
              )}
              {lead.category && (
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {lead.category}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ScoreBadge score={a?.lead_score ?? null} />
              {a ? <WebsiteStatusBadge status={a.website_status} /> : null}
            </div>
          </div>
          <DeleteLeadButton leadId={lead.id} />
        </div>

        {/* Status pills — full width row */}
        <div className="mt-5 border-t border-slate-100 pt-5">
          <StatusControl leadId={lead.id} status={lead.status} />
        </div>

        {/* Safety note */}
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <p className="text-xs text-slate-500">
            <span className="font-medium text-slate-700">Nothing is sent automatically.</span>{" "}
            The agent only drafts messages for your review. You approve and send everything yourself.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact details */}
          <Card>
            <CardHeader title="Contact details" />
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
              <ContactRow
                label="Website"
                value={lead.website_url}
                href={lead.website_url ?? undefined}
                Icon={Globe}
              />
              <ContactRow
                label="Instagram"
                value={instagramHandle(lead.instagram_url) ?? lead.instagram_url}
                href={lead.instagram_url ?? undefined}
                Icon={Camera}
              />
              <ContactRow
                label="Facebook"
                value={lead.facebook_url}
                href={lead.facebook_url ?? undefined}
                Icon={Link2}
              />
              <ContactRow
                label="Phone"
                value={lead.phone}
                href={lead.phone ? `tel:${lead.phone}` : undefined}
                Icon={Phone}
              />
              <ContactRow
                label="Email"
                value={lead.email}
                href={lead.email ? `mailto:${lead.email}` : undefined}
                Icon={Mail}
              />
              <ContactRow label="Source" value={lead.source} />
            </dl>
            {lead.notes ? (
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Notes
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">
                  {lead.notes}
                </p>
              </div>
            ) : null}
          </Card>

          {/* Analysis */}
          <Card>
            <CardHeader
              title="Website analysis"
              action={
                <AnalyzeButton leadId={lead.id} hasAnalysis={Boolean(a)} />
              }
            />
            {a ? (
              <div className="space-y-5 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <WebsiteStatusBadge status={a.website_status} />
                  <ConfidenceBadge confidence={a.confidence} />
                  <ScoreBadge score={a.lead_score} />
                  <Badge tone="indigo">{a.suggested_price_range_gel}</Badge>
                </div>

                <AnalysisSection title="Why they need a website">
                  <p className="text-sm text-slate-700">
                    {a.why_they_need_website}
                  </p>
                </AnalysisSection>

                <AnalysisSection title="Best outreach angle">
                  <p className="text-sm text-slate-700">
                    {a.best_outreach_angle}
                  </p>
                </AnalysisSection>

                {a.problems_found.length ? (
                  <AnalysisSection title="Problems found">
                    <ul className="space-y-1.5">
                      {a.problems_found.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </AnalysisSection>
                ) : null}

                {a.business_strengths.length ? (
                  <AnalysisSection title="Business strengths">
                    <ul className="space-y-1.5">
                      {a.business_strengths.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </AnalysisSection>
                ) : null}
              </div>
            ) : (
              <div className="px-5 py-6">
                <EmptyState
                  title="Not analyzed yet"
                  description="Run the AI analysis to score this lead and find its biggest website opportunities."
                />
              </div>
            )}
          </Card>

          {/* Outreach drafts */}
          <Card>
            <CardHeader
              title="Outreach drafts"
              description="Drafts only — copy and send them yourself."
            />
            <div className="space-y-4 px-5 py-5">
              <GenerateButtons
                leadId={lead.id}
                canDraft={Boolean(a)}
                hasMessages={lead.messages.length > 0}
                defaultLanguage={settings.default_language}
              />
              {lead.messages.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No drafts yet.{" "}
                  {a
                    ? `Use "Draft outreach" above.`
                    : "Analyze the lead first, then draft a message."}
                </p>
              ) : (
                <div className="space-y-3">
                  {lead.messages.map((m) => (
                    <MessageCard key={m.id} message={m} />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Log contact attempt */}
          <Card>
            <CardHeader title="Log a contact attempt" />
            <div className="px-5 py-4">
              <ContactAttemptForm leadId={lead.id} />
            </div>
          </Card>

          {/* Contact history */}
          <Card>
            <CardHeader title="Contact history" />
            {lead.contact_attempts.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">
                No contact attempts logged yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lead.contact_attempts.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium capitalize text-slate-800">
                        {c.channel.replace("_", " ")}
                        {c.outcome
                          ? ` · ${c.outcome.replace("_", " ")}`
                          : ""}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatRelative(c.created_at)}
                      </span>
                    </div>
                    {c.note ? (
                      <p className="mt-1 text-sm text-slate-600">{c.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AnalysisSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {children}
    </div>
  );
}

function ContactRow({
  label,
  value,
  href,
  Icon,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-slate-400" />
        </div>
      )}
      <div className="min-w-0">
        <dt className="text-xs font-medium text-slate-400">{label}</dt>
        <dd className="mt-0.5 text-sm">
          {value ? (
            href ? (
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="break-all text-indigo-600 hover:underline"
              >
                {value}
              </a>
            ) : (
              <span className="break-words text-slate-700">{value}</span>
            )
          ) : (
            <span className="text-slate-400">Not provided</span>
          )}
        </dd>
      </div>
    </div>
  );
}
