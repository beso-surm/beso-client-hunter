import { Badge, type BadgeTone } from "@/components/ui/Badge";
import {
  CONFIDENCE_LABELS,
  LEAD_STATUSES,
  WEBSITE_STATUS_LABELS,
} from "@/lib/constants";
import type { Confidence, LeadStatus, WebsiteStatus } from "@/types";

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <Badge tone="slate">Not scored</Badge>;
  const tone: BadgeTone = score >= 70 ? "green" : score >= 45 ? "amber" : "slate";
  return (
    <Badge tone={tone}>
      <span aria-hidden>★</span> {score}
    </Badge>
  );
}

const STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  new: "slate",
  ready: "violet",
  approved: "blue",
  contacted: "indigo",
  replied: "amber",
  not_interested: "red",
  potential_client: "green",
  won: "green",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const label =
    LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;
  return <Badge tone={STATUS_TONE[status]}>{label}</Badge>;
}

const WEBSITE_TONE: Record<WebsiteStatus, BadgeTone> = {
  none: "red",
  social_only: "amber",
  outdated: "amber",
  broken: "red",
  ok: "green",
  unknown: "slate",
};

export function WebsiteStatusBadge({ status }: { status: WebsiteStatus }) {
  return (
    <Badge tone={WEBSITE_TONE[status]}>{WEBSITE_STATUS_LABELS[status]}</Badge>
  );
}

const CONFIDENCE_TONE: Record<Confidence, BadgeTone> = {
  high: "green",
  medium: "amber",
  low: "slate",
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <Badge tone={CONFIDENCE_TONE[confidence]}>
      {CONFIDENCE_LABELS[confidence]}
    </Badge>
  );
}
