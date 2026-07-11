"use client";

import { useMemo, useState } from "react";

import { EditorPalette, type EditorTool } from "@/components/create/EditorPalette";
import { GameBoard } from "@/components/game/GameBoard";
import type { DraftRoute } from "@/components/game/RouteCanvasOverlay";
import { saveLevelAction } from "@/app/actions/saveLevel";
import { serializeLevel } from "@/lib/game/level/serialize";
import type { Level } from "@/lib/game/level/types";
import {
  objectDefinition,
  routeDefinition,
} from "@/lib/game/objects/registry";
import {
  canPlaceObjectAt,
  canRouteEnter,
} from "@/lib/game/rules";
import type { TileKind } from "@/lib/game/types";

type DraftPuzzleViewProps = {
  level: Level;
};

const PANEL_FRAME =
  "overflow-hidden rounded-xl border border-white/15 bg-black/15 shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.04)]";

function toolHint(tool: EditorTool): string {
  if (!tool) {
    return "Select a tool to start editing.";
  }
  switch (tool.type) {
    case "terrain":
      return "Click the map to paint terrain.";
    case "object":
      return "Click a valid tile to place the building.";
    case "route":
      return "Click adjacent water tiles to draw the route.";
    case "erase":
      return "Click a building to remove it.";
  }
}

function newRouteId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `route-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function DraftPuzzleView({ level: initialLevel }: DraftPuzzleViewProps) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const [tool, setTool] = useState<EditorTool>(null);
  const [draftRoute, setDraftRoute] = useState<DraftRoute | null>(null);
  const [name, setName] = useState(() => initialLevel.name);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const emptyBridges = useMemo(() => new Set<string>(), []);
  const emptyPath = useMemo(() => new Set<string>(), []);

  // SELECTING A ROUTE TOOL STARTS/KEEPS A DRAFT ROUTE; OTHER TOOLS CLEAR IT
  const handleSelectTool = (next: EditorTool) => {
    setTool(next);
    if (next?.type === "route") {
      setDraftRoute((current) =>
        current && current.defId === next.defId
          ? current
          : {
              defId: next.defId,
              path: [],
              closed: routeDefinition(next.defId)?.closedByDefault ?? false,
            },
      );
    } else {
      setDraftRoute(null);
    }
  };

  const paintTerrain = (row: number, col: number, kind: TileKind) => {
    setLevel((prev) => {
      const index = row * prev.cols + col;
      if (prev.terrain[index] === kind) {
        return prev;
      }
      const terrain = prev.terrain.slice();
      terrain[index] = kind;
      const next: Level = { ...prev, terrain };
      // PRUNE BUILDINGS THAT NO LONGER SATISFY THEIR PLACEMENT RULES
      const objects = next.objects.filter((object) => {
        const definition = objectDefinition(object.defId);
        return definition
          ? canPlaceObjectAt(next, definition, object.at.row, object.at.col)
          : false;
      });
      return { ...next, objects };
    });
  };

  const placeObject = (row: number, col: number, defId: string) => {
    const definition = objectDefinition(defId);
    if (!definition) {
      return;
    }
    if (!canPlaceObjectAt(level, definition, row, col)) {
      setStatus(`${definition.label} can't be placed there.`);
      return;
    }
    setStatus(null);
    setLevel((prev) => {
      const objects = prev.objects.filter(
        (object) => !(object.at.row === row && object.at.col === col),
      );
      objects.push({ defId, at: { row, col } });
      return { ...prev, objects };
    });
  };

  const eraseObject = (row: number, col: number) => {
    setLevel((prev) => {
      const objects = prev.objects.filter(
        (object) => !(object.at.row === row && object.at.col === col),
      );
      return objects.length === prev.objects.length ? prev : { ...prev, objects };
    });
  };

  const addRoutePoint = (row: number, col: number) => {
    if (!draftRoute) {
      return;
    }
    const definition = routeDefinition(draftRoute.defId);
    const allowed = definition?.allowedTerrain ?? [];
    if (!canRouteEnter(level, allowed, { row, col })) {
      setStatus("Routes can only cross water.");
      return;
    }
    const last = draftRoute.path[draftRoute.path.length - 1];
    if (last && last.row === row && last.col === col) {
      return;
    }
    if (last && Math.abs(last.row - row) + Math.abs(last.col - col) !== 1) {
      setStatus("Add the next step to an adjacent water tile.");
      return;
    }
    setStatus(null);
    setDraftRoute({ ...draftRoute, path: [...draftRoute.path, { row, col }] });
  };

  const handleCellClick = (row: number, col: number) => {
    if (!tool) {
      return;
    }
    switch (tool.type) {
      case "terrain":
        paintTerrain(row, col, tool.kind);
        break;
      case "object":
        placeObject(row, col, tool.defId);
        break;
      case "erase":
        eraseObject(row, col);
        break;
      case "route":
        addRoutePoint(row, col);
        break;
    }
  };

  const finishRoute = () => {
    if (!draftRoute || draftRoute.path.length < 2) {
      setStatus("Draw at least two points before finishing.");
      return;
    }
    setLevel((prev) => ({
      ...prev,
      routes: [
        ...prev.routes,
        {
          id: newRouteId(),
          defId: draftRoute.defId,
          closed: draftRoute.closed,
          path: draftRoute.path,
        },
      ],
    }));
    const definition = routeDefinition(draftRoute.defId);
    setDraftRoute({
      defId: draftRoute.defId,
      path: [],
      closed: definition?.closedByDefault ?? false,
    });
    setStatus("Route added.");
  };

  const undoRoutePoint = () => {
    setDraftRoute((current) =>
      current ? { ...current, path: current.path.slice(0, -1) } : current,
    );
  };

  const toggleRouteClosed = () => {
    setDraftRoute((current) =>
      current ? { ...current, closed: !current.closed } : current,
    );
  };

  const clearDraftRoute = () => {
    setDraftRoute((current) => (current ? { ...current, path: [] } : current));
  };

  const deleteRoute = (id: string) => {
    setLevel((prev) => ({
      ...prev,
      routes: prev.routes.filter((route) => route.id !== id),
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    const toSave: Level = { ...level, name: name.trim() || level.id };
    try {
      const result = await saveLevelAction(serializeLevel(toSave));
      setStatus(result.ok ? `Saved to ${result.path}` : `Save failed: ${result.error}`);
    } catch (error) {
      setStatus(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isRouteTool = tool?.type === "route";

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      <section className="flex min-h-0 min-w-0 flex-[3] flex-col gap-3 p-4">
        <div className={`flex min-h-0 flex-[3] p-3 ${PANEL_FRAME}`}>
          <div className="flex min-h-0 flex-1 items-start justify-center">
            <GameBoard
              level={level}
              bridges={emptyBridges}
              pathKeys={emptyPath}
              interactive={false}
              editable={tool !== null}
              onCellClick={handleCellClick}
              draftRoute={draftRoute}
              sizing="contain"
            />
          </div>
        </div>

        <div className={`flex min-h-0 flex-1 flex-col gap-3 p-3 ${PANEL_FRAME}`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-sky-100/60">{toolHint(tool)}</p>
            {status ? (
              <p className="truncate text-[11px] text-amber-200/80">{status}</p>
            ) : null}
          </div>

          {isRouteTool && draftRoute ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-sky-100/50">
                {draftRoute.path.length} point{draftRoute.path.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={toggleRouteClosed}
                className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:border-white/40"
              >
                {draftRoute.closed ? "Loop: on" : "Loop: off"}
              </button>
              <button
                type="button"
                onClick={undoRoutePoint}
                className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:border-white/40"
              >
                Undo point
              </button>
              <button
                type="button"
                onClick={clearDraftRoute}
                className="rounded-md border border-white/15 px-2 py-1 text-[11px] text-white/70 hover:border-white/40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={finishRoute}
                className="rounded-md border border-emerald-300/60 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-100 hover:border-emerald-200"
              >
                Finish route
              </button>
            </div>
          ) : null}

          <div className="mt-auto flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Level name"
              className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-sky-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md border border-sky-300/60 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-100 hover:border-sky-200 disabled:opacity-50"
            >
              {isSaving ? "Saving…" : "Save level"}
            </button>
          </div>
        </div>
      </section>

      <aside className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto border-l border-white/10 bg-black/10 p-4">
        <EditorPalette tool={tool} onSelect={handleSelectTool} />

        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200/50">
            Placed routes
          </p>
          {level.routes.length === 0 ? (
            <p className="mt-2 text-[11px] text-sky-100/40">No routes yet.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1.5">
              {level.routes.map((route) => {
                const definition = routeDefinition(route.defId);
                return (
                  <li
                    key={route.id}
                    className="flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1.5 text-[11px] text-white/70"
                  >
                    <span
                      aria-hidden
                      className="h-2.5 w-4 rounded-full"
                      style={{ backgroundColor: definition?.color ?? "white" }}
                    />
                    <span className="flex-1 truncate">
                      {definition?.label ?? route.defId}
                      <span className="text-white/35">
                        {" "}
                        · {route.path.length} pts{route.closed ? " · loop" : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteRoute(route.id)}
                      className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-rose-200/80 hover:border-rose-300/60"
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
