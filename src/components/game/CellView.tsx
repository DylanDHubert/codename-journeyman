import type { CSSProperties } from "react";

import { canPlaceBridgeAt } from "@/lib/game/rules";
import {
  appearanceForCell,
  isMarkerOverlay,
  overlayAccent,
  overlayLabel,
  type AppearanceContext,
} from "@/lib/rendering/cellAppearance";

type CellViewProps = {
  row: number;
  col: number;
  context: AppearanceContext;
  cellSize: number;
  interactive: boolean;
  editable?: boolean;
  onToggle?: (row: number, col: number) => void;
};

export function CellView({
  row,
  col,
  context,
  cellSize,
  interactive,
  editable = false,
  onToggle,
}: CellViewProps) {
  const appearance = appearanceForCell(row, col, context);
  const accent = overlayAccent(appearance.overlay);
  const label = overlayLabel(appearance.overlay);
  const bridgeable = context.level
    ? canPlaceBridgeAt(context.level, row, col)
    : false;
  const clickable = editable || (interactive && bridgeable);

  const style: CSSProperties = {
    width: cellSize,
    height: cellSize,
    backgroundColor: appearance.backgroundColor,
    backgroundImage: appearance.shimmer,
  };

  return (
    <button
      type="button"
      aria-label={`Cell ${row + 1}, ${col + 1}`}
      disabled={!clickable}
      onClick={() => onToggle?.(row, col)}
      className={[
        "relative transition-transform duration-100",
        clickable
          ? "cursor-pointer hover:brightness-110 active:scale-95"
          : "cursor-default",
        appearance.overlay === "path" ? "brightness-110" : "",
      ].join(" ")}
      style={style}
    >
      {accent && isMarkerOverlay(appearance.overlay) ? (
        <span
          className="pointer-events-none absolute inset-1 rounded-full border-2 shadow-sm"
          style={{ borderColor: accent }}
        />
      ) : null}

      {label ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {label}
        </span>
      ) : null}

      {appearance.bridgeCostLabel === 2 && appearance.overlay !== "bridge" ? (
        <span className="pointer-events-none absolute bottom-0.5 right-0.5 rounded bg-black/35 px-0.5 text-[8px] font-bold text-lime-200">
          ×2
        </span>
      ) : null}
    </button>
  );
}
