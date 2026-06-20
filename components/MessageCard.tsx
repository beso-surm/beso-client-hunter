"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { CopyButton } from "@/components/CopyButton";
import { setMessageApprovedAction } from "@/app/actions/messages";
import { LANGUAGES } from "@/lib/constants";
import { formatRelative } from "@/lib/utils";
import type { GeneratedMessage } from "@/types";

export function MessageCard({ message }: { message: GeneratedMessage }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const langLabel =
    LANGUAGES.find((l) => l.value === message.language)?.label ??
    message.language;

  async function toggleApproval() {
    setLoading(true);
    await setMessageApprovedAction(message.id, !message.approved);
    setLoading(false);
    router.refresh();
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={message.message_type === "outreach" ? "violet" : "blue"}>
            {message.message_type === "outreach" ? "Outreach" : "Follow-up"}
          </Badge>
          <Badge tone="slate">{langLabel}</Badge>
          {message.approved ? <Badge tone="green">✓ Ready to send</Badge> : null}
        </div>
        <span className="text-xs text-slate-400">
          {formatRelative(message.created_at)}
        </span>
      </div>

      <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-800">
        {message.body}
      </pre>

      <div className="mt-4 flex items-center gap-2">
        <CopyButton text={message.body} />
        <Button
          size="sm"
          variant={message.approved ? "outline" : "primary"}
          onClick={toggleApproval}
          disabled={loading}
        >
          {loading ? (
            <Spinner />
          ) : message.approved ? (
            "Unapprove"
          ) : (
            "Approve for sending"
          )}
        </Button>
      </div>
    </Card>
  );
}
