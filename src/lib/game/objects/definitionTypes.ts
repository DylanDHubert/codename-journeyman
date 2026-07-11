import type { TileKind } from "../types";
import type { Effect } from "./effects";

// ============================================================================
// TERRAIN — THE BASE LAYER. WHIRLPOOL IS NO LONGER TERRAIN; IT IS AN OBJECT.
// ============================================================================

export type TerrainDefinition = {
  id: TileKind;
  label: string;
  land: boolean;
  /** A BRIDGE MAY BE PLACED HERE (UNLESS AN EFFECT BLOCKS IT) */
  bridgeable: boolean;
  effects: Effect[];
  /** DATA-DRIVEN TRAVERSAL CLASS (CLIFFS CANNOT STEP ON/OFF BRIDGES) */
  traversalClass?: "cliff";
};

// ============================================================================
// OBJECTS — SINGLE-CELL ENTITIES (BUILDINGS). ONE OBJECT PER CELL, MAX.
// ============================================================================

export type ObjectCategory = "building";

export type PlacementRule = {
  /** OBJECT MAY ONLY SIT ON THESE TERRAIN KINDS */
  allowedTerrain: TileKind[];
  /** IF SET, AT LEAST ONE ORTHOGONAL NEIGHBOR MUST BE ONE OF THESE KINDS */
  requiresAdjacentTerrain?: TileKind[];
};

export type ObjectDefinition = {
  id: string;
  label: string;
  category: ObjectCategory;
  placement: PlacementRule;
  effects: Effect[];
  /** KEY INTO OBJECT_RENDERERS */
  render: string;
  /** BASE TERRAIN DRAWN BEHIND THIS OBJECT IN PALETTE PREVIEWS */
  previewTerrain: TileKind;
};

// ============================================================================
// ROUTES — ORDERED PATHS DRAWN BY THE PLAYER. PIRATES LOOP, MERCHANTS DON'T.
// ============================================================================

export type RouteDefinition = {
  id: string;
  label: string;
  /** PIRATE LOOPS CLOSE BY DEFAULT; MERCHANT LANES DO NOT */
  closedByDefault: boolean;
  allowedTerrain: TileKind[];
  color: string;
  /** TRANSIT SPEED IN CELLS PER SECOND */
  speed: number;
  effects: Effect[];
};
