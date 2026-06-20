import { Target } from "lucide-react";
import SidebarLinks from "@/components/SidebarLinks";
import { dataMode } from "@/lib/repo";
import { claudeEnabled } from "@/lib/claude";
import { searchProvider } from "@/agents/tools/searchBusinesses";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const storageLabel =
    dataMode === "supabase"
      ? "Supabase"
      : dataMode === "sqlite"
        ? "Local DB"
        : "In-memory";

  const modes: { label: string; on: boolean }[] = [
    { label: storageLabel, on: dataMode !== "memory" },
    { label: claudeEnabled ? "Claude AI" : "Heuristic", on: claudeEnabled },
    {
      label:
        searchProvider === "google_places" ? "Live search" : "Demo search",
      on: searchProvider === "google_places",
    },
  ];

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-slate-950">
      {/* Brand */}
      <div className="flex h-14 items-center gap-3 border-b border-white/5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
          <Target className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">
          Client Hunter
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-4">
        <SidebarLinks />
      </div>

      {/* Status indicators */}
      <div className="space-y-2 border-t border-white/5 px-4 py-4">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-slate-600">
          System
        </p>
        {modes.map((m) => (
          <div key={m.label} className="flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 flex-shrink-0 rounded-full",
                m.on ? "bg-emerald-400" : "bg-slate-700",
              )}
            />
            <span
              className={cn(
                "text-xs",
                m.on ? "text-slate-400" : "text-slate-600",
              )}
            >
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
