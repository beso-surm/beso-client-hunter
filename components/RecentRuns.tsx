import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatRelative } from "@/lib/utils";
import type { AgentRun } from "@/types";

export function RecentRuns({ runs }: { runs: AgentRun[] }) {
  if (!runs.length) return null;

  return (
    <Card>
      <CardHeader title="Recent agent runs" description="Every run is logged." />
      <ul className="divide-y divide-slate-100">
        {runs.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 px-5 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {[r.category, r.city].filter(Boolean).join(" · ") || "Agent run"}
              </p>
              <p className="truncate text-xs text-slate-400">
                {formatRelative(r.started_at)}
                {r.summary ? ` · ${r.summary}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {r.status === "failed" ? (
                <Badge tone="red">Failed</Badge>
              ) : (
                <Badge tone="green">{r.saved} saved</Badge>
              )}
              {r.high_value_leads > 0 ? (
                <Badge tone="violet">{r.high_value_leads} hot</Badge>
              ) : null}
              {r.skipped_duplicates > 0 ? (
                <Badge tone="slate">{r.skipped_duplicates} dup</Badge>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
