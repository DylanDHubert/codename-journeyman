import type { CellCoord } from "@/lib/game/types";

export type PathLineStyle = {
  id: string;
  path: CellCoord[];
  stroke: string;
  strokeWidth?: number;
  dashArray?: string;
  opacity?: number;
};

type PathLineOverlayProps = {
  paths: PathLineStyle[];
  rows: number;
  cols: number;
  cellSize: number;
  gap?: number;
};

function cellCenter(
  row: number,
  col: number,
  cellSize: number,
  gap: number,
): { x: number; y: number } {
  return {
    x: col * (cellSize + gap) + cellSize / 2,
    y: row * (cellSize + gap) + cellSize / 2,
  };
}

function pathToPoints(
  path: CellCoord[],
  cellSize: number,
  gap: number,
): string {
  if (path.length === 0) {
    return "";
  }

  return path
    .map(({ row, col }) => {
      const { x, y } = cellCenter(row, col, cellSize, gap);
      return `${x},${y}`;
    })
    .join(" ");
}

export function PathLineOverlay({
  paths,
  rows,
  cols,
  cellSize,
  gap = 2,
}: PathLineOverlayProps) {
  const width = cols * cellSize + (cols - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;

  const visiblePaths = paths.filter((entry) => entry.path.length >= 2);
  if (visiblePaths.length === 0) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      {visiblePaths.map((entry) => (
        <polyline
          key={entry.id}
          points={pathToPoints(entry.path, cellSize, gap)}
          fill="none"
          stroke={entry.stroke}
          strokeWidth={entry.strokeWidth ?? Math.max(2, cellSize * 0.12)}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={entry.dashArray}
          opacity={entry.opacity ?? 1}
        />
      ))}
    </svg>
  );
}
