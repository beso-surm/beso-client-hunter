"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RunAgentForm } from "@/components/RunAgentForm";
import { NewLeadForm } from "@/components/NewLeadForm";

export function DashboardActions({
  defaultCity,
  defaultCategory,
}: {
  defaultCity?: string;
  defaultCategory?: string;
}) {
  const [openAgent, setOpenAgent] = useState(false);
  const [openLead, setOpenLead] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={() => setOpenLead(true)}>
        + Add lead
      </Button>
      <Button variant="secondary" onClick={() => setOpenAgent(true)}>
        🎯 Run agent
      </Button>

      <Modal
        open={openAgent}
        onClose={() => setOpenAgent(false)}
        title="Run Client Hunter agent"
      >
        <RunAgentForm
          defaultCity={defaultCity}
          defaultCategory={defaultCategory}
          onDone={() => setOpenAgent(false)}
        />
      </Modal>

      <Modal
        open={openLead}
        onClose={() => setOpenLead(false)}
        title="Add a lead manually"
      >
        <NewLeadForm onDone={() => setOpenLead(false)} />
      </Modal>
    </div>
  );
}
