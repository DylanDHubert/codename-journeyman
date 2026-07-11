"use client";

import type { Mission } from "@/lib/game/types";

type MissionMarkerOverlayProps = {
  mission: Mission;
  rows: number;
  cols: number;
  cellSize: number;
  gap: number;
};

const MARKERS: Array<{ key: keyof Mission; label: string; color: string }> = [
  { key: "x", label: "X", color: "#38bdf8" },
  { key: "y", label: "Y", color: "#a78bfa" },
  { key: "z", label: "Z", color: "#fbbf24" },
];

function cellCenter(
  row: number,
  col: number,
  cellSize: number,
  gap: number,
): { x: number; y: number } {
  const stride = cellSize + gap;
  return {
    x: col * stride + cellSize / 2,
    y: row * stride + cellSize / 2,
  };
}

/** X / Y / Z MARKERS — UX SHOWS ORDER; WIN LOGIC IS ORDER-AGNOSTIC */
export function MissionMarkerOverlay({
  mission,
  rows,
  cols,
  cellSize,
  gap,
}: MissionMarkerOverlayProps) {
  const width = cols * cellSize + Math.max(0, cols - 1) * gap;
  const height = rows * cellSize + Math.max(0, rows - 1) * gap;
  const radius = Math.max(8, cellSize * 0.22);
  const fontSize = Math.max(10, cellSize * 0.28);

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {MARKERS.map(({ key, label, color }) => {
        const cell = mission[key];
        const { x, y } = cellCenter(cell.row, cell.col, cellSize, gap);
        return (
          <g key={key}>
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill="rgb(0 0 0 / 0.35)"
              stroke={color}
              strokeWidth={Math.max(2, cellSize * 0.06)}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize={fontSize}
              fontWeight="bold"
              style={{ paintOrder: "stroke", stroke: "rgb(0 0 0 / 0.8)", strokeWidth: 2 }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
