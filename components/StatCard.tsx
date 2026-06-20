import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

type Accent = "slate" | "violet" | "green" | "indigo" | "amber";

const accentText: Record<Accent, string> = {
  slate: "text-slate-900",
  violet: "text-violet-600",
  green: "text-emerald-600",
  indigo: "text-indigo-600",
  amber: "text-amber-600",
};

const accentIcon: Record<Accent, string> = {
  slate: "text-slate-400 bg-slate-100",
  violet: "text-violet-500 bg-violet-50",
  green: "text-emerald-500 bg-emerald-50",
  indigo: "text-indigo-500 bg-indigo-50",
  amber: "text-amber-500 bg-amber-50",
};

export function StatCard({
  label,
  value,
  accent = "slate",
  Icon,
}: {
  label: string;
  value: number | string;
  accent?: Accent;
  Icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md",
              accentIcon[accent],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
      <p className={cn("mt-2 text-3xl font-bold leading-none", accentText[accent])}>
        {value}
      </p>
    </div>
  );
}
