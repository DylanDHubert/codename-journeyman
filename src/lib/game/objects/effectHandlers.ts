/**
 * CUSTOM EFFECT HANDLERS — GAMEPLAY BEHAVIOR FOR JSON `custom` EFFECTS.
 * STUBS TODAY; OLIVER IMPLEMENTS REAL RULES (E.G. lighthouseLight, port).
 */
import type { Level } from "../level/types";
import type { CellCoord } from "../types";

export type EffectHandlerContext = {
  level: Level;
  row: number;
  col: number;
};

export type EffectHandler = (context: EffectHandlerContext) => void;

const HANDLERS: Record<string, EffectHandler> = {
  lighthouseLight: () => {
    // STUB — FUTURE: REVEAL FOG, EXTEND VISION, ETC.
  },
  port: () => {
    // STUB — FUTURE: MERCHANT ROUTE ANCHOR, TRADE, ETC.
  },
};

export function runCustomEffect(
  id: string,
  context: EffectHandlerContext,
): void {
  HANDLERS[id]?.(context);
}

export function registerEffectHandler(id: string, handler: EffectHandler): void {
  HANDLERS[id] = handler;
}

/** MISSION CHECKPOINT AT CELL — USED BY MISSION OVERLAY */
export function missionMarkerAt(
  mission: { x: CellCoord; y: CellCoord; z: CellCoord },
  row: number,
  col: number,
): "x" | "y" | "z" | null {
  if (mission.x.row === row && mission.x.col === col) {
    return "x";
  }
  if (mission.y.row === row && mission.y.col === col) {
    return "y";
  }
  if (mission.z.row === row && mission.z.col === col) {
    return "z";
  }
  return null;
}
