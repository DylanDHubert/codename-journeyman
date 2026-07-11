# `src/content` — game data (JSON)

**What:** authoring files for placeable **objects** and drawable **routes**.

**Why:** designers (and Oliver) edit JSON without touching TypeScript for every new building or ship lane. Catalog loaders import these explicitly at build time.

---

## Layout

```
src/content/
  objects/
    whirlpool.json
    lighthouse.json
    port.json
  routes/
    pirate.json
    merchant.json
```

Runtime **levels** live separately in `public/levels/` (LevelFile v2) — this folder is **definitions**, not saved maps.

---

## Object JSON shape

See `src/lib/game/objects/definitionTypes.ts` → `ObjectDefinition`.

```json
{
  "id": "whirlpool",
  "label": "Whirlpool",
  "category": "building",
  "placement": {
    "allowedTerrain": ["ocean", "marsh"]
  },
  "effects": [{ "type": "blocksBridge" }],
  "render": "whirlpool",
  "previewTerrain": "ocean"
}
```

| Field | Notes |
|-------|--------|
| `id` | Stable key; referenced by `LevelObject.defId` |
| `placement.allowedTerrain` | `TileKind` values only |
| `placement.requiresAdjacentTerrain` | optional neighbor rule (e.g. port on coast) |
| `effects` | declarative and/or `{ "type": "custom", "id": "…" }` |
| `render` | key into UI/canvas renderers |
| `previewTerrain` | palette swatch background |

**After adding a file:** import it in `src/lib/game/objects/objectCatalog.ts`.

---

## Route JSON shape

See `RouteDefinition` in the same types file.

```json
{
  "id": "pirate",
  "label": "Pirate route",
  "closedByDefault": true,
  "allowedTerrain": ["ocean", "marsh"],
  "color": "#c45c26",
  "speed": 0.4,
  "effects": []
}
```

**After adding a file:** import it in `src/lib/game/objects/routeCatalog.ts`.

---

## What is NOT here

| Data | Location |
|------|----------|
| Terrain kinds | `registry.ts` (`TERRAIN_DEFINITIONS`) — small fixed set |
| Saved maps | `public/levels/*.json` |
| Animals catalog | future `public/data/animals.json` (deferred) |

---

## Stubs

- New object/route types work for **editor + render** once cataloged.
- **Gameplay** for `custom` effects still needs handlers in `effectHandlers.ts`.
- **Validator** (future) should verify `defId` exists and placement matches rules.
