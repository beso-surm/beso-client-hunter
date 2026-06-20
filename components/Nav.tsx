import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import { dataMode } from "@/lib/repo";
import { claudeEnabled } from "@/lib/claude";
import { searchProvider } from "@/agents/tools/searchBusinesses";
import { cn } from "@/lib/utils";

/**
 * Top navigation. Also surfaces which backends are live so it's always clear
 * whether the app is running on real services or in demo mode.
 */
export default function Nav() {
  const storageLabel =
    dataMode === "supabase" ? "Supabase" :
    dataMode === "sqlite" ? "Local DB" :
    "In-memory";

  const modes: { label: string; on: boolean }[] = [
    { label: storageLabel, on: dataMode !== "memory" },
    { label: claudeEnabled ? "Claude AI" : "Heuristic", on: claudeEnabled },
    {
      label: searchProvider === "google_places" ? "Live search" : "Demo search",
      on: searchProvider === "google_places",
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-base">
            🎯
          </span>
          <span className="hidden font-semibold tracking-tight text-slate-900 sm:inline">
            Beso Client Hunter
          </span>
        </Link>

        <NavLinks
          items={[
            { href: "/dashboard", label: "Dashboard", prefixes: ["/dashboard", "/leads"] },
            { href: "/campaign", label: "Campaign", prefixes: ["/campaign"] },
            { href: "/import", label: "Import", prefixes: ["/import"] },
            { href: "/settings", label: "Settings", prefixes: ["/settings"] },
          ]}
        />

        <div className="hidden items-center gap-1.5 md:flex">
          {modes.map((m) => (
            <span
              key={m.label}
              title={m.on ? "connected" : "fallback / demo mode"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                m.on
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-50 text-slate-500",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  m.on ? "bg-emerald-500" : "bg-slate-300",
                )}
              />
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
