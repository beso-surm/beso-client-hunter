"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { deleteLeadAction } from "@/app/actions/leads";

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (!confirm("Delete this lead and all its analysis & messages?")) return;
    setLoading(true);
    const res = await deleteLeadAction(leadId);
    if (!res.ok) {
      setLoading(false);
      alert(res.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Button variant="danger" size="sm" onClick={remove} disabled={loading}>
      {loading ? <Spinner /> : "Delete"}
    </Button>
  );
}
