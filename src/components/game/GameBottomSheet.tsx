"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

type GameBottomSheetProps = {
  expanded: boolean;
  onToggle: () => void;
  peekLabel: string;
  children: ReactNode;
};

export function GameBottomSheet({
  expanded,
  onToggle,
  peekLabel,
  children,
}: GameBottomSheetProps) {
  return (
    <div className="flex min-h-0 flex-col border-t border-white/10 bg-[#07141c]/95 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? "Hide controls" : "Show controls"}
        className="flex w-full shrink-0 flex-col items-center gap-1.5 px-4 py-3 text-sky-100/80 transition hover:bg-white/5"
      >
        <span className="h-1 w-10 rounded-full bg-white/25" />
        {!expanded ? (
          <span className="text-xs font-medium text-sky-100/70">{peekLabel}</span>
        ) : null}
        {expanded ? (
          <ChevronDown className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronUp className="h-4 w-4" aria-hidden />
        )}
      </button>

      {expanded ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      ) : null}
    </div>
  );
}
