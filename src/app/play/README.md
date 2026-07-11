# `src/app/play` — play mode (stub)

**What:** route shell for loading saved levels and playing bridge puzzles.

**Why:** create + save shipped first; play reuses the same `Level` + `GameBoard` without procedural generation or PAR.

**Current state:** `page.tsx` is a placeholder with links to create and `simulateLevel.ts`.

---

## Target flow (Oliver)

```
1. Resolve level id (searchParam ?level= or dynamic segment)
2. fetch(`/levels/${id}.json`)
3. deserializeLevel(json)
4. Render <GameBoard level={level} … />
5. useLevelGame — bridge Set, phases, pointer input (incl. drag)
6. On submit → simulateLevel(level, bridges)
7. If result.connected → success UI
```

---

## Modules to wire

| Concern | Import from |
|---------|-------------|
| Level on disk | `@/lib/game/level/serialize` |
| Win check | `@/lib/game/simulateLevel` |
| Bridge rules | `@/lib/game/rules` |
| Board | `@/components/game/GameBoard` |
| Mission labels | `@/components/game/MissionMarkerOverlay` |

---

## Win rule (reminder)

All mission checkpoints `x`, `y`, `z` must be reachable from each other via walkable cells + bridges. **Order does not matter.**

`displayMissionPath` returns X → Y → Z for animation only.

---

## Not in scope for first play PR

- Procedural level generation (use `/create` or hand JSON)
- PAR / optimal solution display
- Animals / collection hooks
- `effectHandlers` gameplay (lighthouse, port)

See `docs/ideas.md` for full ticket list.
