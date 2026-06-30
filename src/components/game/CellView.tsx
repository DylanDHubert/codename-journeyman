import type { CSSProperties } from "react";

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
};

export function CellView({
  row,
  col,
  context,
  cellSize,
  interactive,
}: CellViewProps) {
  const appearance = appearanceForCell(row, col, context);
  const accent = overlayAccent(appearance.overlay);
  const label = overlayLabel(appearance.overlay);

  const style: CSSProperties = {
    width: cellSize,
    height: cellSize,
    backgroundColor: appearance.backgroundColor,
    backgroundImage: appearance.shimmer,
  };

  return (
    <div
      role="gridcell"
      aria-label={`Cell ${row + 1}, ${col + 1}`}
      className={[
        "relative",
        interactive ? "pointer-events-none" : "",
        appearance.overlay === "path" ? "brightness-110" : "",
        context.puzzle.cells[row * context.puzzle.cols + col]?.kind === "whirlpool"
          ? "overflow-hidden"
          : "",
      ].join(" ")}
      style={style}
    >
      {appearance.componentTint ? (
        <span
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: appearance.componentTint }}
        />
      ) : null}

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
    </div>
  );
}
