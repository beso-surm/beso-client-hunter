"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface ExportMenuProps {
  leadsQuery?: string;
}

export function ExportMenu({ leadsQuery = "" }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const leadsUrl = `/api/export/leads${leadsQuery ? `?${leadsQuery}` : ""}`;

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        ↓ Export
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {[
            {
              href: leadsUrl,
              label: "Leads (current view)",
              icon: "📋",
            },
            {
              href: "/api/export/messages?approved=true",
              label: "Approved drafts",
              icon: "✅",
            },
            {
              href: "/api/export/messages",
              label: "All drafts",
              icon: "✍️",
            },
            {
              href: "/api/export/attempts",
              label: "Contact history",
              icon: "📞",
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              download
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span>{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
