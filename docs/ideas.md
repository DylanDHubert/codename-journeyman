# Dove — Level-first architecture (Oliver)

Actionable workflow after the **campsite refactor**. Long-term brainstorm lives in [`expansion-ideas.md`](./expansion-ideas.md).

**What shipped in this slice**

- **`Level`** is the only map model (create, save, future play).
- Random terrain on `/create` → editor → save to `public/levels/` as **LevelFile v2**.
- Shared **`GameBoard`** + **`TerrainView`** rendering for create and (future) play.
- **Mission** checkpoints X / Y / Z auto-picked at create; serialized on the level.
- PAR solver, `Puzzle` types, and procedural `/play` gen are **removed**.

**Constraints**

- Do **not** reintroduce PAR / optimal-path search. Win = mission reachable (`simulateLevel.ts`).
- Assets optional for animals — placeholders must work when that slice returns.
- PC-first sizing is OK.

---

## Canonical model

```
Level
├── terrain[]     row-major TileKind (ocean, marsh, beach, grass, cliff)
├── objects[]     buildings (whirlpool, lighthouse, port) — see content/objects/
├── routes[]      player-drawn paths (pirate, merchant) — see content/routes/
└── mission       { x, y, z } land checkpoints
```

| Concern | Location |
|---------|----------|
| Types | `src/lib/game/level/types.ts`, `src/lib/game/types.ts` |
| Save/load | `src/lib/game/level/serialize.ts` |
| Create entry gen | `src/lib/game/level/generateLevel.ts` |
| Rules (bridge, cost, traverse) | `src/lib/game/rules.ts` |
| Play simulation (stub API) | `src/lib/game/simulateLevel.ts` |
| Board UI | `src/components/game/GameBoard.tsx` |
| Mission overlay | `src/components/game/MissionMarkerOverlay.tsx` |
| Effect stubs | `src/lib/game/objects/effectHandlers.ts` |

**Win rule (when play exists):** all three mission checkpoints must lie in one walkable connected component. **Order does not matter.** Display path X → Y → Z is UX only.

**Whirlpool:** not terrain. Noise gen places whirlpool **objects** on water cells (`gridToLevel.ts`).

---

## Overview (suggested order for Oliver)

| # | Feature | Primary output |
|---|---------|----------------|
| 1 | **Drag to place bridges** | Board-level pointer stroke on `GameBoard` |
| 2 | Level validator script | `scripts/validateLevels.ts`, CI hook |
| 3 | **Play mode** — load saved levels | `src/app/play/`, `useLevelGame` hook |
| 4 | PC sizing | Larger grids + board on desktop |
| 5 | Custom effect handlers | `effectHandlers.ts` (lighthouse, port) |
| 6 | Animal catalog (100) | `public/data/animals.json` — **deferred** |
| 7 | Animals collection page | `/animals` — **deferred** |

---

## 1. Drag to place bridges

**First gameplay input ticket.** Today the editor toggles bridges per cell on click (`CellView` → `onToggle`).

### Desired behavior

- **Pointer down** on bridgeable water starts a drag session.
- **Pointer move** paints place or remove along the path.
- **Pointer up** ends the session.
- **Click without drag** still toggles one cell.

### Rules

- Only bridgeable water (`ocean`, `marsh`) — skip land while dragging.
- **Lock mode on pointer down:** empty cell → place; bridged cell → remove.
- Track visited cells per stroke (no double-toggle).
- Respect `canPlaceBridgeAt` from `rules.ts` — skip illegal cells silently.
- Use pointer events + `setPointerCapture` on the board container.

### Where to implement

- Board-level hit-test on `GameBoard` (or wrapper).
- New hook e.g. `src/hooks/useLevelGame.ts` — holds `bridges: Set<string>`, calls `canPlaceBridgeAt` / `simulateLevel` on submit.
- `user-select: none`, `touch-action: none` while dragging.

### Done when

- [ ] Drag paints a run of bridges in one gesture
- [ ] Drag removes existing bridges
- [ ] Single click still works
- [ ] Land cells in path do not break the stroke

---

## 2. Level files (`public/levels/`)

### Directory

```
public/
  levels/
    manifest.json      # optional index
    my-level.json
```

### Format — LevelFile v2

See `src/lib/game/level/types.ts`. Terrain is a **single encoded string** (one char per cell).

```json
{
  "version": 2,
  "id": "harbor-crossing",
  "name": "Harbor crossing",
  "seed": "harbor-crossing",
  "grid": { "rows": 12, "cols": 10 },
  "terrain": "ooooggoooo...",
  "mission": {
    "x": [2, 1],
    "y": [5, 8],
    "z": [11, 4]
  },
  "objects": [
    { "defId": "whirlpool", "row": 3, "col": 5 }
  ],
  "routes": [
    {
      "id": "route-1",
      "defId": "pirate",
      "closed": true,
      "path": [[1, 2], [1, 3], [2, 3]]
    }
  ],
  "meta": { "author": "dylan", "createdAt": "2026-07-08T..." }
}
```

**Terrain codes:** `o` ocean, `m` marsh, `b` beach, `g` grass, `c` cliff.

**Rules**

- `terrain.length === rows * cols`.
- `mission.x`, `.y`, `.z` are `[row, col]` on **walkable land** (grass/beach/cliff per rules).
- `objects[].defId` must exist in `objectCatalog`.
- `routes[].defId` must exist in `routeCatalog`.
- At most one object per cell.

### Validator (not built yet)

Add **`scripts/validateLevels.ts`**:

1. Read every `public/levels/*.json` (skip `manifest.json`).
2. `deserializeLevel` + schema checks.
3. Optional: verify mission coords in bounds and on land.
4. Optional: verify object placement against `rules.ts` / catalog placement rules.
5. npm script: `"validate:levels": "npx --yes tsx scripts/validateLevels.ts"`

**No PAR check.** Levels are author-driven; solvability is a design concern, not an algorithmic gate.

### Loader (runtime — stub)

`src/app/play/page.tsx` is a stub. Implement:

```ts
import { deserializeLevel } from "@/lib/game/level/serialize";

const file = await fetch(`/levels/${id}.json`).then((r) => r.json());
const level = deserializeLevel(file);
// pass to GameBoard + useLevelGame
```

Wire `?level=id` or `/play/[levelId]`.

---

## 3. Play mode

**Stub:** `src/app/play/page.tsx` → see `src/app/play/README.md`.

Hook points:

| Step | Module |
|------|--------|
| Load JSON | `deserializeLevel` |
| Render | `GameBoard` with `level` prop |
| Bridge state | `useLevelGame` (to write) |
| Submit / win | `simulateLevel(level, bridges)` |
| Path preview | `displayMissionPath` (X→Y→Z display only) |

`SimulationResult.connected === true` → success phase.

---

## 4. PC-focused maximum size

Grid limits live in `src/lib/game/createConfig.ts` / `generationConfig.ts` (create flow).

Board sizing: `src/components/game/GameBoard.tsx` — raise `MAX_CELL`, viewport budget, relax `max-w-md` at `lg`.

No PAR benchmark anymore (`scripts/benchmarkPar.ts` removed with PAR). Tune grid size by feel and render perf.

---

## 5. Custom effects (stub)

JSON objects/routes declare `effects`. Declarative effects resolve in `objects/effects.ts`. **Custom** ids dispatch to `effectHandlers.ts`:

| Handler id | Status | Intended behavior |
|------------|--------|-------------------|
| `lighthouseLight` | stub | fog / vision (TBD) |
| `port` | stub | merchant anchor / trade (TBD) |

Register real handlers with `registerEffectHandler(id, fn)`.

---

## 6. Animals — deferred

Not in `Level`. Runtime spawn from seed + level (future `animalSpawns.ts`). Collection page `/animals` unchanged from original brainstorm — revisit after play ships.

---

## 7. File checklist

```
public/
  levels/                    # saved LevelFile v2 JSON

scripts/
  validateLevels.ts          # TO BUILD

src/lib/game/
  level/                     # README — types, serialize, generateLevel
  objects/                   # README — catalogs, effects, registry
  rules.ts                   # single rules engine
  simulateLevel.ts           # play win check (no PAR)

src/content/
  objects/*.json
  routes/*.json

src/hooks/
  useLevelGame.ts            # TO BUILD — bridges + submit

src/app/
  play/                      # stub → full loader
  create/view/               # editor + save

src/components/game/
  GameBoard.tsx
  MissionMarkerOverlay.tsx
  CellView.tsx
```

---

## 8. Testing checklist

- [ ] `/create` → random level → editor shows X/Y/Z markers
- [ ] Save produces valid LevelFile v2 under `public/levels/`
- [ ] `deserializeLevel(serializeLevel(level))` round-trips
- [ ] Drag-to-bridge (when built)
- [ ] `npm run validate:levels` passes on committed levels (when built)
- [ ] Play loads saved level without procedural gen
- [ ] `simulateLevel` marks win when all checkpoints reachable
- [ ] Large grid renders on desktop without clipping

---

## 9. Out of scope

- PAR / optimal bridge solver (removed)
- Procedural play generation (removed)
- Sprite production
- Animals slice (deferred)
- Multiplayer / shared merchant ships

---

## Quick reference — module READMEs

| Path | What it documents |
|------|-------------------|
| `src/lib/game/README.md` | Game module map |
| `src/lib/game/level/README.md` | Level types, serialize, generation |
| `src/lib/game/objects/README.md` | Catalogs, effects, registry |
| `src/content/README.md` | JSON content authoring |
| `src/lib/rendering/README.md` | TerrainView decoupling |
| `src/app/play/README.md` | Play mode stub + wiring guide |
