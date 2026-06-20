"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Upload,
  Settings,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    prefixes: ["/dashboard", "/leads"],
  },
  {
    href: "/agent",
    label: "Campaign Agent",
    icon: Rocket,
    prefixes: ["/agent"],
  },
  {
    href: "/campaign",
    label: "Quick Search",
    icon: TrendingUp,
    prefixes: ["/campaign"],
  },
  {
    href: "/import",
    label: "Import",
    icon: Upload,
    prefixes: ["/import"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    prefixes: ["/settings"],
  },
];

export default function SidebarLinks() {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active =
          pathname === item.href ||
          (item.prefixes?.some((p) => pathname.startsWith(p)) ?? false);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200",
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
