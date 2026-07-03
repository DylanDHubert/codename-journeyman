// DECLARATIVE EFFECTS — GAME RULES ARE DATA ATTACHED TO TERRAIN/OBJECTS,
// NOT HARDCODED SWITCHES PER TILE KIND. RULE READERS INTERPRET THESE.

export type Effect =
  // BRIDGES CANNOT BE PLACED ON THIS CELL (E.G. WHIRLPOOL)
  | { type: "blocksBridge" }
  // OVERRIDES THE COST OF PLACING A BRIDGE ON THIS CELL
  | { type: "bridgeCost"; cost: number }
  // NAMED HOOK RESOLVED BY GAMEPLAY CODE (E.G. "lighthouseLight")
  | { type: "custom"; id: string; params?: Record<string, unknown> };

export type ResolvedEffects = {
  blocksBridge: boolean;
  /** NULL WHEN NO EFFECT SET A COST — CALLER FALLS BACK TO TERRAIN DEFAULT */
  bridgeCost: number | null;
  customs: Array<{ id: string; params?: Record<string, unknown> }>;
};

/** REDUCE A STACK OF EFFECTS (TERRAIN + OBJECT) INTO A SINGLE VERDICT */
export function resolveEffects(effects: Effect[]): ResolvedEffects {
  const resolved: ResolvedEffects = {
    blocksBridge: false,
    bridgeCost: null,
    customs: [],
  };

  for (const effect of effects) {
    switch (effect.type) {
      case "blocksBridge":
        resolved.blocksBridge = true;
        break;
      case "bridgeCost":
        // HIGHEST COST WINS SO MARSH (2) BEATS OCEAN (1)
        resolved.bridgeCost =
          resolved.bridgeCost === null
            ? effect.cost
            : Math.max(resolved.bridgeCost, effect.cost);
        break;
      case "custom":
        resolved.customs.push({ id: effect.id, params: effect.params });
        break;
    }
  }

  return resolved;
}
