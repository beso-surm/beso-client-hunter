"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — ignore silently.
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? "✓ Copied" : label}
    </Button>
  );
}
