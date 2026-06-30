# Dove — Expansion & Sequel Ideas

Design notes for future mechanics, content themes, and a possible sequel. Grouped by theme.

**First implementation slice (levels, PC sizing, animals):** see [`ideas.md`](./ideas.md).

---

## Naval & Maritime

### Pirate ship with path

- A pirate patrols a fixed route.
- **Guard tower** — optional placement, costs resources; scares the pirate off that lane so you can bridge through.
- Creates a “pay to clear” decision vs. routing around.

### Merchant vessel

- Spawns at random water locations.
- Acts like a **temporary island** — bridgeable once.
- After you cross it **once**, it sails away; you **cannot cross back**.
- Forces extra bridges elsewhere and one-way routing puzzles.

### Port & shipping lanes

- **Ports** — fixed points tied to land.
- **Shipping** moves from off-map / edge water → port → back.
- Their lane is sacred: blocking it without paying a cost (bridge toll? delay? penalty?) is restricted or expensive.

### Merchand ships (caravan legacy)

- Caravans you leave behind become **merchant vessels** instead of random spawns.
- Player spends caravan size to leave one behind.
- Can leave for **help or harm** — same look, so players can **obfuscate solutions** or **assist** others (async / shared puzzles?).

### Sequel: ship-first game

- Same core loop, but you’re a **ship** navigating waters rather than a land-dweller building bridges.
- Natural fit for ports, lanes, pirates, merchants as first-class mechanics.

---

## Islands & Land Features

### Tiki village

- Occupies an island.
- You **cannot trespass** without also collecting the **totem** on **another** island.
- Multi-objective routing: bridge → totem island → village island (order may matter).

### Caves

- Travel to a cave tile to start a **special underground level** at the end of the current run.
- Side content / bonus stage, not just cosmetic.

### Tunnels (cave-ish)

- **Portals between islands** — shortcut or alternate graph without full bridge spans.
- Different from caves: connect surface nodes rather than “descend” for a sub-level.

---

## Caravan & Ascension

### Caravan as moving “islands”

- **Caravans** are bridgeable nodes you **merge into yours** when reached.
- Caravan size grows as you bridge to more of them.

### Quicksand

- First **N** caravan members are **trapped** when crossing quicksand; you **lose** those people.
- **Level-based** N — escalation / ascension pressure.
- Net loop: grow caravan by finding more, shrink by quicksand — tension between breadth and survival.

### Upgrade caravan (meta progression)

- Examples: **cannons** so you don’t need guard-tower cost vs. pirates (effect scales with **caravan size**, not a separate resource).
- Other upgrades could mirror tower / port / merchant interactions.

---

## Collection & Flavor (Low Mechanical Weight)

### Animals

- Spawn on islands; **no gameplay effect**.
- Collectible on a **separate page** — rarities, “screenshot / photo” **Polaroid-style** popup after submit if you reached that island.
- Good hook for completionists without warping par.

---

## Structure & Presentation

### 7-themed worlds

- **Total levels divisible by 7**; each slot in the cycle gets a **distinct graphical set**.
- **Different obstacle pools** per theme (island-focused mechanics above; other biomes get their own).
- **Different animal sets** per theme.

---

## Cross-Cutting Design Threads

| Thread | Examples |
|--------|----------|
| **One-way / irreversible** | Merchant vessel, shipping lanes |
| **Pay to use space** | Guard tower, blocking shipping lane |
| **Multi-stop objectives** | Totem + tiki village |
| **Player-placed legacy** | Caravan → merchand ships (help/harm, hidden intent) |
| **Size as resource** | Caravan headcount, cannons, quicksand losses |
| **Graph surprises** | Tunnels, caves, underground finales |

---

## Open Design Questions

1. **Pirate** — patrol timing (turn-based vs. static lane) vs. tower duration (permanent vs. one crossing)?
2. **Merchant** — does “moves on” mean tile becomes water again, or empty unbridgeable sea?
3. **Shipping lane** — visual lane only, or enforced path in sim / par?
4. **Totem** — collect on visit vs. explicit pickup action; can totem island be skipped after village is unlocked?
5. **Caravan merchand ships** — multiplayer/async only, or seeded into daily puzzles for everyone?
6. **Quicksand** — per-level cap on losses vs. cumulative ascension run?
7. **Sequel** — same bridge-placement rules on “ship reaches dock” tiles, or route-drawing only?
