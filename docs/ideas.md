# Dove — First Features (Oliver)

Actionable workflow for the first helper-dev slice. Long-term brainstorm lives in [`expansion-ideas.md`](./expansion-ideas.md).

**Constraints for this slice**

- Do **not** edit the solution-finding / PAR search algorithm (`src/lib/game/simulation.ts`, `computeMinimumSolution`, `computeMinimumCost`, etc.). Call it; wrap it; validate with it.
- Assets are optional for animals — placeholders must work.
- PC-first sizing is OK even if PAR validation gets slower on huge grids.

---

## Overview (suggested order)

| # | Feature | Primary output |
|---|---------|----------------|
| 1 | **Drag to place bridges** | Pointer drag across water cells (not click-only) |
| 2 | Level JSON format + validator script | `public/levels/*.json`, `scripts/validateLevels.ts` |
| 3 | Load levels in app | `?level=id` or route, skip procedural gen |
| 4 | PC sizing | Bigger grids + larger board on desktop |
| 5 | Animal catalog (100) | `public/data/animals.json` |
| 6 | Animal spawn (no assets) | Runtime + optional `scripts/` helper |
| 7 | Animals collection page | `/animals` with placeholders + pagination |

---

## 1. Drag to place bridges

**First thing to implement.** Today bridges toggle one cell at a time on click (`CellView` → `onToggle` → `toggleBridge` in `useBridgeGame`). Add drag so players can paint a run of bridges in one gesture.

### Current behavior

- Each water cell is a `<button>` with `onClick` in `src/components/game/CellView.tsx`.
- `toggleBridge(row, col)` in `src/hooks/useBridgeGame.ts` flips bridge on/off per cell (respects `canPlaceBridge`).

### Desired behavior

- **Pointer down** on a bridgeable water cell starts a drag session.
- **Pointer move** over other cells while held applies the same action (place or remove) to each cell entered along the path.
- **Pointer up** ends the session.
- **Click without meaningful drag** should still work as today (single-cell toggle).

### Interaction rules (suggested)

- Only **bridgeable water** cells (`ocean`, `marsh`) receive drag paint — skip land tiles while dragging over them (do not toggle).
- **Lock mode on pointer down**: if the first cell had no bridge → drag **places**; if it had a bridge → drag **removes**. Do not alternate per cell mid-stroke.
- **No duplicate toggles** on the same cell during one drag (track visited cells in the stroke).
- Respect existing validation: `canPlaceBridge` / phase checks — silently skip illegal cells rather than erroring.
- **Touch**: use pointer events (`pointerdown` / `pointermove` / `pointerup`) so mouse and touch share one path; `setPointerCapture` on the board container helps when dragging fast.

### Where to implement

- Prefer a **board-level** handler on `GameBoard` (or a thin wrapper) that hit-tests grid coordinates from pointer position, rather than per-cell `mouseenter` on dozens of buttons.
- Keep `toggleBridge` / placement logic in `useBridgeGame`; drag layer only computes `(row, col)` sequence and calls place/remove API.
- Consider `user-select: none` and `touch-action: none` on the board while dragging to avoid scroll/zoom fights on trackpad/touch.

### Edge cases

- Drag off the board → end stroke, no further paints.
- Submit / success phase → disable drag like clicks.
- Marsh vs ocean cost unchanged — drag is just input, not rules.

### Done when

- [ ] Drag across a line of water places bridges on all cells in one gesture
- [ ] Drag across existing bridges removes them
- [ ] Single click still toggles one cell
- [ ] Land cells in the path do not break the stroke or toggle incorrectly

### Testing checklist (drag)

- [ ] Drag works with mouse and touch
- [ ] Fast drag does not skip cells (pointer capture)
- [ ] No double-toggle when click + tiny movement

---

## 2. Level files (`public/levels/`)

### Directory

```
public/
  levels/
    manifest.json      # optional index: id, name, file, tags
    level-001.json
    level-002.json
    ...
```

Commit level JSON to git like any other static asset. App loads via `fetch('/levels/level-001.json')`.

### Format (JSON)

Store **`PuzzleGrid`** shape from `src/lib/game/types.ts` — **not** full `Puzzle` with `parCost`. PAR is computed at validate/load time.

```json
{
  "id": "level-001",
  "name": "First crossing",
  "version": 1,
  "seed": "level-001",
  "rows": 12,
  "cols": 10,
  "start": { "row": 0, "col": 1 },
  "waypoint": { "row": 5, "col": 8 },
  "goal": { "row": 11, "col": 4 },
  "cells": [
    { "kind": "grass", "role": "start", "componentId": 0 },
    { "kind": "ocean", "role": "none", "componentId": -1 }
  ]
}
```

**Rules**

- `cells.length === rows * cols`, row-major (`index = row * cols + col`).
- `kind`: `grass` | `beach` | `cliff` | `ocean` | `marsh` | `whirlpool`.
- `role`: `none` | `start` | `waypoint` | `goal` — exactly one of each route role.
- `componentId`: land component index from labeling, or `-1` for water (see `toPuzzleCells` in `terrainFeatures.ts` for reference when authoring by hand).
- Optional metadata: `author`, `theme`, `notes` (ignored by loader).

### Validate solution exists (do not change PAR algo)

Add **`scripts/validateLevels.ts`** (standalone, like `scripts/benchmarkPar.ts`):

1. Glob/read every `public/levels/*.json` (skip `manifest.json`).
2. Parse + schema-check (rows/cols/cells/roles).
3. Build `PuzzleGrid`, then call existing API:

```ts
import { computeMinimumCost, buildParContext } from "../src/lib/game/par";

const parCost = computeMinimumCost(puzzleGrid, maxPar + 1, {
  maxStatesPerLayer: 48, // match generation.ts defaults unless bench says otherwise
});
```

4. **Fail** level if:
   - `parCost === null` (no solution within budget)
   - roles missing / duplicate
   - dimensions mismatch
5. Print per-level: `id`, `parCost`, bridge slot count, timing (optional).
6. npm script: `"validate:levels": "npx --yes tsx scripts/validateLevels.ts"`

Use this in CI or pre-commit before merging new levels.

### Loader (runtime)

New module e.g. `src/lib/game/levelLoader.ts`:

- `loadLevelFromUrl(path: string): Promise<Puzzle>`
- `fetch` JSON → validate shape → `computeMinimumCost` → return `{ ...grid, parCost }`
- If PAR fails at runtime, throw clear error (level should never ship without passing script).

Wire into game bootstrap:

- Today: `useBridgeGame` → `generatePuzzleAction` (server) with `GenerationConfig`.
- Add: `?level=level-001` on home page **or** `src/app/play/[levelId]/page.tsx`.
- When `level` param set: skip generation; `fetch('/levels/${id}.json')` + attach `parCost`.
- Reuse `emptyGameState(puzzle)` path already used for `initialPuzzle`.

**Reference files**

- Types: `src/lib/game/types.ts` (`PuzzleGrid`, `Puzzle`, `PuzzleCell`)
- PAR (read-only): `src/lib/game/par.ts` → `simulation.ts`
- Generation PAR call pattern: `src/lib/game/generation.ts` (~lines 167–195)
- Bench reference: `scripts/benchmarkPar.ts` (`buildPuzzleFromRawGrid` + `computeMinimumCost`)

### Authoring levels (later tooling)

Not required for v1 — hand-edit JSON or export from an internal editor. Optional follow-up: small script to convert noise-generated puzzle dump to level JSON.

---

## 3. PC-focused maximum size

### Grid limits

Current caps in `src/lib/game/generationConfig.ts`:

```ts
export const GRID_LIMITS = {
  rows: { min: 8, max: 22 },
  cols: { min: 6, max: 16 },
};
```

**Raise for PC** (tune after `npm run bench:par -- --mode sizes`):

- Suggested starting target: `rows` max **32–40**, `cols` max **24–28**.
- Procedural gen may get slow — that's acceptable; authored levels can be larger if validator passes.
- Update `clampGrid`, `GeneratorPanel` UI, and any preset docs.

### Board / cell sizing

Current mobile bias in `src/components/game/GameBoard.tsx`:

- `MAX_CELL = 44`, `MIN_CELL = 24`
- `heightBudget = min(viewportHeight * 0.58, 640)`
- `max-w-md` on board container

**PC changes**

- Increase `MAX_CELL` (e.g. **56–64**) on large breakpoints.
- Use more viewport height (e.g. `0.85` of window, higher cap than `640`).
- Widen layout: drop or relax `max-w-md` at `lg`/`xl`.
- Optional: fixed cell size on desktop when grid is small; scale down only when necessary.

### PAR performance note

Larger grids = slower validation. Mitigations **without** touching search algo:

- Run full PAR only in `validateLevels.ts` / server action at load time.
- Show loading state while level PAR computes (same as generation spinner).
- Use `benchmarkPar.ts` to document acceptable size/time before raising limits.

---

## 4. Animals — catalog (100 total)

### Data file

`public/data/animals.json`:

```json
{
  "version": 1,
  "animals": [
    {
      "id": "heron-01",
      "name": "Grey heron",
      "rarity": "common",
      "islandKinds": ["grass", "beach"],
      "theme": 0,
      "placeholder": { "hue": 210, "emoji": "🐦" }
    }
  ]
}
```

**Fields**

| Field | Notes |
|-------|--------|
| `id` | Stable key for save data |
| `name` | Display name |
| `rarity` | `common` \| `uncommon` \| `rare` \| `legendary` (or similar) |
| `islandKinds` | Which **land** tiles count as this animal's habitat (`grass`, `beach`, `cliff`) — island-based, not water |
| `theme` | 0–6 for future 7-world graphical sets |
| `placeholder` | Color/emoji/initials until sprite exists |
| `sprite` | Optional path `assets/sprites/animals/heron-01.png` — omit for now |

**100 animals** in catalog upfront. Distribution can be weighted by rarity; not all need to be spawnable in every puzzle.

### Island / tile rules

- Spawn only on **land** cells that are part of an island (`componentId >= 0`).
- Filter catalog by cell `kind` ∈ `animal.islandKinds`.
- One animal per island component per run (or per level) unless design says otherwise — start simple: **at most one spawn per land component**.
- No gameplay effect on PAR — collection only.

---

## 5. Animal spawn (randomized, not in level JSON)

Spawns are **derived from seed + puzzle**, not authored in level files.

### Runtime

`src/lib/game/animalSpawns.ts` (suggested):

```ts
type AnimalSpawn = {
  animalId: string;
  row: number;
  col: number;
  componentId: number;
};

function rollAnimalSpawns(puzzle: Puzzle, catalog: AnimalCatalog, seed: string): AnimalSpawn[]
```

- Deterministic RNG from `hashStringToSeed(\`${seed}-animals\`)` (see `src/lib/game/seed.ts`).
- For each land component: roll whether spawn appears (probability by rarity).
- Pick random eligible cell on that component matching `islandKinds`.
- Render: small placeholder on `CellView` or overlay (emoji/tinted circle) — **no sprite required**.

### Standalone script (optional)

`scripts/previewAnimalSpawns.ts`:

```
npx tsx scripts/previewAnimalSpawns.ts --seed daily --level level-001
```

Prints spawn table for debugging/content balance. Can share RNG logic with runtime module.

---

## 6. Animals collection page

### Route

`src/app/animals/page.tsx` (+ optional `animals/[page]/page.tsx` or query `?p=2`).

### UX (no assets)

- **100 entries** from catalog.
- **Pagination** — e.g. 10 per page → 10 pages (or 20 × 5).
- **Found vs locked**: read `localStorage` key e.g. `bridge-isles-animals-found` → `Set<string>` of `animalId`.
- Found: show placeholder card (emoji, name, rarity, island kinds).
- Locked: silhouette / "?" card — still show rarity tier if desired.
- On **successful puzzle submit**, if route touched a spawn tile, add `animalId` to found set.
- **Polaroid popup** (later polish): on submit, if new animal — modal with placeholder frame. v1 can be inline toast.

### Submit hook

In `useBridgeGame` submit flow: compare `courierPath` / `runPath` against `rollAnimalSpawns(...)` for current puzzle; merge into localStorage.

---

## 7. File checklist for Oliver

```
public/
  levels/
    manifest.json
    level-001.json
  data/
    animals.json

scripts/
  validateLevels.ts
  previewAnimalSpawns.ts   # optional

src/lib/game/
  levelLoader.ts
  animalCatalog.ts
  animalSpawns.ts

src/app/
  animals/page.tsx
  play/[levelId]/page.tsx   # or ?level= on page.tsx

src/components/game/
  GameBoard.tsx             # pointer drag hit-test + stroke
  CellView.tsx              # may simplify click-only or delegate to board

src/hooks/
  useBridgeGame.ts          # placeBridge / removeBridge or stroke API; level load branch
```

---

## 8. Testing checklist

- [ ] Drag-to-bridge (see §1) works on desktop and touch
- [ ] `npm run validate:levels` passes on all committed levels
- [ ] `?level=level-001` loads board without calling `generatePuzzleAction`
- [ ] PAR from file matches validator script for same JSON
- [ ] Large grid (new limits) renders on 1920×1080 without clipping
- [ ] Same seed → same animal spawns
- [ ] Animals only on allowed `islandKinds`
- [ ] `/animals` shows 100 slots; found state persists in localStorage
- [ ] Submit with path through spawn marks animal found

---

## 9. Out of scope for this slice

- Editing PAR / simulation search internals
- Sprite production (placeholders only)
- Merchant ships, pirates, caravans (see `expansion-ideas.md`)
- Multiplayer / shared merchand ships
- Underground cave levels

---

## Quick reference — existing entry points

| Concern | Location |
|---------|----------|
| Puzzle types | `src/lib/game/types.ts` |
| Procedural generation | `src/lib/game/generation.ts`, `generatePuzzleAction` |
| Game hook | `src/hooks/useBridgeGame.ts` |
| Board sizing | `src/components/game/GameBoard.tsx` |
| Grid limits | `src/lib/game/generationConfig.ts` → `GRID_LIMITS` |
| PAR benchmark | `npm run bench:par` → `scripts/benchmarkPar.ts` |
| Optimal path display | `computeMinimumSolution` in `useBridgeGame.ts` |
