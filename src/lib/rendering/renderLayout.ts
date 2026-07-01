import { terrainGridPixelHeight, terrainGridPixelWidth } from "@/lib/rendering/terrainBorders";
import type { PuzzleRenderFrame } from "@/lib/game/renderFrame";

export function frameCanvasSize(
  frame: PuzzleRenderFrame,
  cellSize: number,
  gap: number,
): { width: number; height: number } {
  return {
    width: terrainGridPixelWidth(frame.cols, cellSize, gap),
    height: terrainGridPixelHeight(frame.rows, cellSize, gap),
  };
}

export function frameCanvasOffset(
  frame: PuzzleRenderFrame,
  cellSize: number,
  gap: number,
): { left: number; top: number } {
  const stride = cellSize + gap;

  return {
    left: -frame.originCol * stride,
    top: -frame.originRow * stride,
  };
}

export function frameOverlayStyle(
  frame: PuzzleRenderFrame,
  cellSize: number,
  gap: number,
): {
  left: number;
  top: number;
  width: number;
  height: number;
  imageRendering: "pixelated";
} {
  const { width, height } = frameCanvasSize(frame, cellSize, gap);
  const { left, top } = frameCanvasOffset(frame, cellSize, gap);

  return {
    left,
    top,
    width,
    height,
    imageRendering: "pixelated",
  };
}
