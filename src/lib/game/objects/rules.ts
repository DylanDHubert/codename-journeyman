import { DIRECTIONS } from "../constants";
import { inBounds, indexFor } from "../coords";
import type { Level, LevelObject } from "../level/types";
import type { CellCoord, TileKind } from "../types";
import { resolveEffects, type Effect, type ResolvedEffects } from "./effects";
import {
  objectDefinition,
  terrainDefinition,
  type ObjectDefinition,
} from "./registry";

// DEFAULT BRIDGE COST WHEN NO EFFECT SPECIFIES ONE
const FALLBACK_BRIDGE_COST = 1;

export function terrainKindAt(
  level: Level,
  row: number,
  col: number,
): TileKind | undefined {
  if (!inBounds(row, col, level.rows, level.cols)) {
    return undefined;
  }
  return level.terrain[indexFor(row, col, level.cols)];
}

export function objectAt(
  level: Level,
  row: number,
  col: number,
): LevelObject | undefined {
  return level.objects.find(
    (object) => object.at.row === row && object.at.col === col,
  );
}

/** COLLECT EFFECTS CONTRIBUTED BY THE TERRAIN + ANY OBJECT ON A CELL */
export function effectsAtCell(level: Level, row: number, col: number): Effect[] {
  const effects: Effect[] = [];

  const kind = terrainKindAt(level, row, col);
  if (kind) {
    const terrain = terrainDefinition(kind);
    if (terrain) {
      effects.push(...terrain.effects);
    }
  }

  const object = objectAt(level, row, col);
  if (object) {
    const definition = objectDefinition(object.defId);
    if (definition) {
      effects.push(...definition.effects);
    }
  }

  return effects;
}

export function resolvedAtCell(
  level: Level,
  row: number,
  col: number,
): ResolvedEffects {
  return resolveEffects(effectsAtCell(level, row, col));
}

/** A BRIDGE MAY BE PLACED WHEN TERRAIN IS BRIDGEABLE AND NO EFFECT BLOCKS IT */
export function canPlaceBridgeAt(
  level: Level,
  row: number,
  col: number,
): boolean {
  const kind = terrainKindAt(level, row, col);
  if (!kind) {
    return false;
  }

  const terrain = terrainDefinition(kind);
  if (!terrain?.bridgeable) {
    return false;
  }

  return !resolvedAtCell(level, row, col).blocksBridge;
}

export function bridgeCostAt(level: Level, row: number, col: number): number {
  const resolved = resolvedAtCell(level, row, col);
  return resolved.bridgeCost ?? FALLBACK_BRIDGE_COST;
}

function hasAdjacentTerrain(
  level: Level,
  row: number,
  col: number,
  allowed: TileKind[],
): boolean {
  for (const { dr, dc } of DIRECTIONS) {
    const neighbor = terrainKindAt(level, row + dr, col + dc);
    if (neighbor && allowed.includes(neighbor)) {
      return true;
    }
  }
  return false;
}

/** VALIDATE OBJECT PLACEMENT AGAINST ITS REGISTRY RULES */
export function canPlaceObjectAt(
  level: Level,
  definition: ObjectDefinition,
  row: number,
  col: number,
): boolean {
  const kind = terrainKindAt(level, row, col);
  if (!kind) {
    return false;
  }

  if (!definition.placement.allowedTerrain.includes(kind)) {
    return false;
  }

  const adjacency = definition.placement.requiresAdjacentTerrain;
  if (adjacency && !hasAdjacentTerrain(level, row, col, adjacency)) {
    return false;
  }

  return true;
}

/** WATER CELLS A ROUTE MAY PASS THROUGH */
export function canRouteEnter(
  level: Level,
  allowedTerrain: TileKind[],
  cell: CellCoord,
): boolean {
  const kind = terrainKindAt(level, cell.row, cell.col);
  return Boolean(kind && allowedTerrain.includes(kind));
}
