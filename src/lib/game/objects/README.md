# `src/lib/game/objects` — content-driven entities

**What:** definitions for terrain behavior, placeable objects, routes, and effect resolution.

**Why:** gameplay rules stay data-driven. New buildings/ships add JSON under `src/content/` plus optional handler stubs — not scattered `switch` statements.

---

## Files

| File | Role |
|------|------|
| `definitionTypes.ts` | `TerrainDefinition`, `ObjectDefinition`, `RouteDefinition` |
| `registry.ts` | Terrain defs in code; re-exports object/route catalogs |
| `objectCatalog.ts` | Eager load of `src/content/objects/*.json` |
| `routeCatalog.ts` | Eager load of `src/content/routes/*.json` |
| `effects.ts` | Resolve declarative effects (`bridgeCost`, `blocksBridge`, …) |
| `effectHandlers.ts` | **Stubs** for custom effect ids (`lighthouseLight`, `port`) |
| `rules.ts` | Re-export of `../rules.ts` (placement helpers for editor) |

---

## Layers on a `Level`

```
terrain[]  → TERRAIN_DEFINITIONS (registry.ts) — costs, land, bridgeable
objects[]  → OBJECT_DEFINITIONS (JSON) — placement + effects per building
routes[]   → ROUTE_DEFINITIONS (JSON) — color, speed, closed default
```

**Whirlpool** is an **object** (`blocksBridge`), not a `TileKind`. Gen and editor place `defId: "whirlpool"` on water.

---

## Effects

JSON lists `effects: [{ type: "bridgeCost", cost: 2 }, …]`.

- **Declarative** types are handled in `effects.ts` and consumed by `rules.ts`.
- **Custom** effects use `{ type: "custom", id: "lighthouseLight" }` → `runCustomEffect` in `effectHandlers.ts`.

### Stub handlers (Oliver)

| id | File | Status |
|----|------|--------|
| `lighthouseLight` | `effectHandlers.ts` | no-op stub |
| `port` | `effectHandlers.ts` | no-op stub |

Implement with `registerEffectHandler(id, fn)` or edit `HANDLERS` directly.

`missionMarkerAt` in the same file drives X/Y/Z overlay labels (not an object effect).

---

## Adding content

1. Add `src/content/objects/my-thing.json` matching `ObjectDefinition`.
2. Import it in `objectCatalog.ts` (explicit import list).
3. If new `render` key, wire renderer in components (e.g. object swatch / canvas).
4. If new `custom` effect id, add handler in `effectHandlers.ts`.

Same pattern for routes in `src/content/routes/` + `routeCatalog.ts`.

---

## Related

- Authoring guide: `src/content/README.md`
- Level shape: `../level/types.ts`
- Unified gameplay rules: `../rules.ts`
