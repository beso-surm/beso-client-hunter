"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackButton({
  label,
  fallbackHref,
}: {
  label: string;
  fallbackHref: string;
}) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
