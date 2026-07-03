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

// TERRAIN THAT MAY EXIST IN A LEVEL (NOTE: NO WHIRLPOOL)
export const TERRAIN_DEFINITIONS: Record<
  Exclude<TileKind, "whirlpool">,
  TerrainDefinition
> = {
  ocean: {
    id: "ocean",
    label: "Water",
    land: false,
    bridgeable: true,
    effects: [{ type: "bridgeCost", cost: 1 }],
  },
  marsh: {
    id: "marsh",
    label: "Marsh",
    land: false,
    bridgeable: true,
    effects: [{ type: "bridgeCost", cost: 2 }],
  },
  beach: {
    id: "beach",
    label: "Sand",
    land: true,
    bridgeable: false,
    effects: [],
  },
  grass: {
    id: "grass",
    label: "Grass",
    land: true,
    bridgeable: false,
    effects: [],
  },
  cliff: {
    id: "cliff",
    label: "Cliff",
    land: true,
    bridgeable: false,
    effects: [],
    traversalClass: "cliff",
  },
};

export const TERRAIN_DEFINITION_LIST: TerrainDefinition[] =
  Object.values(TERRAIN_DEFINITIONS);

export function terrainDefinition(kind: TileKind): TerrainDefinition | undefined {
  return (TERRAIN_DEFINITIONS as Record<string, TerrainDefinition>)[kind];
}

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

const LAND_KINDS: TileKind[] = ["grass", "beach", "cliff"];
const WATER_KINDS: TileKind[] = ["ocean", "marsh"];

export const OBJECT_DEFINITIONS: Record<string, ObjectDefinition> = {
  whirlpool: {
    id: "whirlpool",
    label: "Whirlpool",
    category: "building",
    placement: { allowedTerrain: [...WATER_KINDS] },
    effects: [{ type: "blocksBridge" }],
    render: "whirlpool",
    previewTerrain: "ocean",
  },
  lighthouse: {
    id: "lighthouse",
    label: "Lighthouse",
    category: "building",
    placement: { allowedTerrain: ["cliff"] },
    effects: [{ type: "custom", id: "lighthouseLight" }],
    render: "lighthouse",
    previewTerrain: "cliff",
  },
  port: {
    id: "port",
    label: "Port",
    category: "building",
    placement: {
      allowedTerrain: [...WATER_KINDS],
      requiresAdjacentTerrain: [...LAND_KINDS],
    },
    effects: [{ type: "custom", id: "port" }],
    render: "port",
    previewTerrain: "ocean",
  },
};

export const OBJECT_DEFINITION_LIST: ObjectDefinition[] =
  Object.values(OBJECT_DEFINITIONS);

export function objectDefinition(id: string): ObjectDefinition | undefined {
  return OBJECT_DEFINITIONS[id];
}

// ============================================================================
// ROUTES — ORDERED PATHS DRAWN BY THE PLAYER. PIRATES LOOP, MERCHANTS DON'T.
// BOTH ARE THE SAME BASE ABSTRACTION WITH DIFFERENT DEFAULTS/EFFECTS.
// ============================================================================

export type RouteDefinition = {
  id: string;
  label: string;
  /** PIRATE LOOPS CLOSE BY DEFAULT; MERCHANT LANES DO NOT */
  closedByDefault: boolean;
  allowedTerrain: TileKind[];
  color: string;
  effects: Effect[];
};

export const ROUTE_DEFINITIONS: Record<string, RouteDefinition> = {
  pirate: {
    id: "pirate",
    label: "Pirate route",
    closedByDefault: true,
    allowedTerrain: [...WATER_KINDS],
    color: "rgb(248 113 113)",
    effects: [],
  },
  merchant: {
    id: "merchant",
    label: "Merchant route",
    closedByDefault: false,
    allowedTerrain: [...WATER_KINDS],
    color: "rgb(45 212 191)",
    effects: [],
  },
};

export const ROUTE_DEFINITION_LIST: RouteDefinition[] =
  Object.values(ROUTE_DEFINITIONS);

export function routeDefinition(id: string): RouteDefinition | undefined {
  return ROUTE_DEFINITIONS[id];
}
