import type { ObjectDefinition } from "./definitionTypes";
import lighthouse from "@/content/objects/lighthouse.json";
import port from "@/content/objects/port.json";
import whirlpool from "@/content/objects/whirlpool.json";

const OBJECT_FILES = [whirlpool, lighthouse, port] as ObjectDefinition[];

function buildObjectCatalog(): Record<string, ObjectDefinition> {
  const catalog: Record<string, ObjectDefinition> = {};
  for (const def of OBJECT_FILES) {
    catalog[def.id] = def;
  }
  return catalog;
}

export const OBJECT_DEFINITIONS = buildObjectCatalog();
export const OBJECT_DEFINITION_LIST = Object.values(OBJECT_DEFINITIONS);

export function objectDefinition(id: string): ObjectDefinition | undefined {
  return OBJECT_DEFINITIONS[id];
}
