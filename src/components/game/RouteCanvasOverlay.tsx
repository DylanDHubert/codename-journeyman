import { routeDefinition } from "@/lib/game/objects/registry";
import type { LevelRoute } from "@/lib/game/level/types";
import type { CellCoord } from "@/lib/game/types";

export type DraftRoute = {
  defId: string;
  path: CellCoord[];
  closed: boolean;
};

type RouteCanvasOverlayProps = {
  routes: LevelRoute[];
  draftRoute?: DraftRoute | null;
  rows: number;
  cols: number;
  cellSize: number;
  gap: number;
};

function cellCenter(
  cell: CellCoord,
  cellSize: number,
  gap: number,
): { x: number; y: number } {
  const stride = cellSize + gap;
  return {
    x: cell.col * stride + cellSize / 2,
    y: cell.row * stride + cellSize / 2,
  };
}

function pointsFor(
  path: CellCoord[],
  closed: boolean,
  cellSize: number,
  gap: number,
): string {
  const cells = closed && path.length > 1 ? [...path, path[0]!] : path;
  return cells
    .map((cell) => {
      const { x, y } = cellCenter(cell, cellSize, gap);
      return `${x},${y}`;
    })
    .join(" ");
}

function RoutePolyline({
  path,
  closed,
  color,
  cellSize,
  gap,
  dashed,
}: {
  path: CellCoord[];
  closed: boolean;
  color: string;
  cellSize: number;
  gap: number;
  dashed?: boolean;
}) {
  const strokeWidth = Math.max(2, cellSize * 0.16);
  const nodeRadius = Math.max(1.5, cellSize * 0.12);

  return (
    <g>
      {path.length >= 2 ? (
        <polyline
          points={pointsFor(path, closed, cellSize, gap)}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashed ? `${strokeWidth * 1.5} ${strokeWidth * 1.5}` : undefined}
          opacity={0.9}
        />
      ) : null}
      {path.map((cell, index) => {
        const { x, y } = cellCenter(cell, cellSize, gap);
        const isEnd = index === 0 || index === path.length - 1;
        return (
          <circle
            key={`${cell.row}-${cell.col}-${index}`}
            cx={x}
            cy={y}
            r={isEnd ? nodeRadius * 1.4 : nodeRadius}
            fill={isEnd ? color : "white"}
            stroke={color}
            strokeWidth={Math.max(1, cellSize * 0.04)}
          />
        );
      })}
    </g>
  );
}

export function RouteCanvasOverlay({
  routes,
  draftRoute,
  rows,
  cols,
  cellSize,
  gap,
}: RouteCanvasOverlayProps) {
  const width = cols * cellSize + Math.max(0, cols - 1) * gap;
  const height = rows * cellSize + Math.max(0, rows - 1) * gap;

  if (routes.length === 0 && (!draftRoute || draftRoute.path.length === 0)) {
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
      {routes.map((route) => (
        <RoutePolyline
          key={route.id}
          path={route.path}
          closed={route.closed}
          color={routeDefinition(route.defId)?.color ?? "rgb(226 232 240)"}
          cellSize={cellSize}
          gap={gap}
        />
      ))}
      {draftRoute && draftRoute.path.length > 0 ? (
        <RoutePolyline
          path={draftRoute.path}
          closed={draftRoute.closed}
          color={routeDefinition(draftRoute.defId)?.color ?? "rgb(226 232 240)"}
          cellSize={cellSize}
          gap={gap}
          dashed
        />
      ) : null}
    </svg>
  );
}
