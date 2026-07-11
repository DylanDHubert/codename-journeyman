import type { RouteDefinition } from "./definitionTypes";
import merchant from "@/content/routes/merchant.json";
import pirate from "@/content/routes/pirate.json";

const ROUTE_FILES = [pirate, merchant] as RouteDefinition[];

function buildRouteCatalog(): Record<string, RouteDefinition> {
  const catalog: Record<string, RouteDefinition> = {};
  for (const def of ROUTE_FILES) {
    catalog[def.id] = def;
  }
  return catalog;
}

export const ROUTE_DEFINITIONS = buildRouteCatalog();
export const ROUTE_DEFINITION_LIST = Object.values(ROUTE_DEFINITIONS);

export function routeDefinition(id: string): RouteDefinition | undefined {
  return ROUTE_DEFINITIONS[id];
}
