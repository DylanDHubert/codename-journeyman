import { drawWhirlpoolSpiral } from "./waterFeatures";

// EACH OBJECT DEFINITION MAPS TO ONE RENDERER (registry.render -> THIS TABLE).
// RENDERERS DRAW INTO A CELL-SIZED BOX AT (originX, originY). PHASE ANIMATES.

export type ObjectRenderArgs = {
  ctx: CanvasRenderingContext2D;
  originX: number;
  originY: number;
  cellSize: number;
  phase: number;
};

export type ObjectRenderer = (args: ObjectRenderArgs) => void;

/** WHICH RENDERERS REPAINT EVERY ANIMATION FRAME (VS. STATIC ONE-TIME DRAW) */
export const ANIMATED_RENDERERS: ReadonlySet<string> = new Set(["whirlpool"]);

function renderWhirlpool({ ctx, originX, originY, cellSize, phase }: ObjectRenderArgs): void {
  drawWhirlpoolSpiral(ctx, originX, originY, cellSize, phase);
}

function renderLighthouse({ ctx, originX, originY, cellSize }: ObjectRenderArgs): void {
  const cx = originX + cellSize / 2;
  const towerW = Math.max(4, Math.round(cellSize * 0.28));
  const towerH = Math.max(6, Math.round(cellSize * 0.6));
  const towerX = Math.round(cx - towerW / 2);
  const towerY = Math.round(originY + cellSize * 0.28);
  const bandH = Math.max(2, Math.round(towerH / 4));

  // TOWER BODY (WHITE) WITH RED BANDS
  ctx.fillStyle = "rgb(244 244 245)";
  ctx.fillRect(towerX, towerY, towerW, towerH);
  ctx.fillStyle = "rgb(220 38 38)";
  for (let band = 0; band < towerH; band += bandH * 2) {
    ctx.fillRect(towerX, towerY + band, towerW, bandH);
  }

  // LANTERN ROOM + LIGHT
  const lanternH = Math.max(2, Math.round(cellSize * 0.12));
  ctx.fillStyle = "rgb(30 41 59)";
  ctx.fillRect(towerX - 1, towerY - lanternH, towerW + 2, lanternH);
  ctx.fillStyle = "rgb(253 224 71)";
  const lightR = Math.max(1, Math.round(cellSize * 0.06));
  ctx.fillRect(
    Math.round(cx - lightR),
    Math.round(towerY - lanternH / 2 - lightR),
    lightR * 2,
    lightR * 2,
  );
}

function renderPort({ ctx, originX, originY, cellSize }: ObjectRenderArgs): void {
  const cx = originX + cellSize / 2;
  const cy = originY + cellSize / 2;

  // DECK PLANK
  const deckW = Math.max(6, Math.round(cellSize * 0.66));
  const deckH = Math.max(3, Math.round(cellSize * 0.22));
  ctx.fillStyle = "rgb(120 72 40)";
  ctx.fillRect(Math.round(cx - deckW / 2), Math.round(cy - deckH / 2), deckW, deckH);

  // MOORING POSTS
  const postW = Math.max(2, Math.round(cellSize * 0.1));
  const postH = Math.max(3, Math.round(cellSize * 0.3));
  ctx.fillStyle = "rgb(66 40 22)";
  ctx.fillRect(Math.round(cx - deckW / 2), Math.round(cy - postH), postW, postH);
  ctx.fillRect(Math.round(cx + deckW / 2 - postW), Math.round(cy - postH), postW, postH);
}

export const OBJECT_RENDERERS: Record<string, ObjectRenderer> = {
  whirlpool: renderWhirlpool,
  lighthouse: renderLighthouse,
  port: renderPort,
};

export function objectRenderer(id: string): ObjectRenderer | undefined {
  return OBJECT_RENDERERS[id];
}
