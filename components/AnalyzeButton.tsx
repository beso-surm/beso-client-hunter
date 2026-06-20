"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { analyzeLeadAction } from "@/app/actions/leads";

export function AnalyzeButton({
  leadId,
  hasAnalysis,
}: {
  leadId: string;
  hasAnalysis: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const res = await analyzeLeadAction(leadId);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" onClick={run} disabled={loading}>
        {loading ? (
          <>
            <Spinner /> Analyzing…
          </>
        ) : hasAnalysis ? (
          "Re-analyze with AI"
        ) : (
          "🔎 Analyze with AI"
        )}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
