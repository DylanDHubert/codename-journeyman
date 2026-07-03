"use client";

import type { ReactNode } from "react";

import { ObjectSwatch } from "@/components/create/ObjectSwatch";
import { TileSwatch } from "@/components/create/TileSwatch";
import {
  OBJECT_DEFINITION_LIST,
  ROUTE_DEFINITION_LIST,
  TERRAIN_DEFINITIONS,
} from "@/lib/game/objects/registry";
import type { TileKind } from "@/lib/game/types";

// EDITOR TOOL — MIRRORS THE THREE AUTHORED LAYERS PLUS AN ERASER
export type EditorTool =
  | { type: "terrain"; kind: TileKind }
  | { type: "object"; defId: string }
  | { type: "route"; defId: string }
  | { type: "erase" }
  | null;

const SWATCH_SIZE = 40;
const CELL_OUTLINE = "rgb(255 255 255 / 0.72)";

// TERRAIN ORDER FOR THE PALETTE (WHIRLPOOL IS A BUILDING NOW)
const TERRAIN_ORDER: TileKind[] = ["ocean", "marsh", "beach", "grass", "cliff"];

type EditorPaletteProps = {
  tool: EditorTool;
  onSelect: (tool: EditorTool) => void;
};

function sameTool(a: EditorTool, b: EditorTool): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === "terrain" && b.type === "terrain") {
    return a.kind === b.kind;
  }
  if (a.type === "object" && b.type === "object") {
    return a.defId === b.defId;
  }
  if (a.type === "route" && b.type === "route") {
    return a.defId === b.defId;
  }
  return a.type === b.type;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-sky-200/50">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SwatchButton({
  selected,
  label,
  title,
  onClick,
  children,
}: {
  selected: boolean;
  label: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        title={title}
        className={[
          "relative block overflow-hidden border transition",
          selected
            ? "border-sky-300 ring-2 ring-sky-300/70 ring-offset-2 ring-offset-[#0a1f33]"
            : "border-white/70 hover:border-white",
        ].join(" ")}
        style={{ borderColor: selected ? undefined : CELL_OUTLINE }}
      >
        {children}
      </button>
      <span className="text-[10px] font-medium tracking-wide text-white/70">
        {label}
      </span>
    </div>
  );
}

export function EditorPalette({ tool, onSelect }: EditorPaletteProps) {
  const pick = (next: NonNullable<EditorTool>) => {
    onSelect(sameTool(tool, next) ? null : next);
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="Terrain">
        <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-4">
          {TERRAIN_ORDER.map((kind) => {
            const definition = TERRAIN_DEFINITIONS[kind as keyof typeof TERRAIN_DEFINITIONS];
            const next: EditorTool = { type: "terrain", kind };
            return (
              <SwatchButton
                key={kind}
                selected={sameTool(tool, next)}
                label={definition?.label ?? kind}
                title={definition?.label ?? kind}
                onClick={() => pick(next)}
              >
                <TileSwatch kind={kind} size={SWATCH_SIZE} />
              </SwatchButton>
            );
          })}
        </div>
      </Section>

      <Section title="Buildings">
        <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-4">
          {OBJECT_DEFINITION_LIST.map((definition) => {
            const next: EditorTool = { type: "object", defId: definition.id };
            return (
              <SwatchButton
                key={definition.id}
                selected={sameTool(tool, next)}
                label={definition.label}
                title={definition.label}
                onClick={() => pick(next)}
              >
                <ObjectSwatch defId={definition.id} size={SWATCH_SIZE} />
              </SwatchButton>
            );
          })}
        </div>
      </Section>

      <Section title="Routes">
        <div className="flex flex-col gap-2">
          {ROUTE_DEFINITION_LIST.map((definition) => {
            const next: EditorTool = { type: "route", defId: definition.id };
            const selected = sameTool(tool, next);
            return (
              <button
                key={definition.id}
                type="button"
                onClick={() => pick(next)}
                aria-pressed={selected}
                className={[
                  "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition",
                  selected
                    ? "border-sky-300 bg-sky-400/10 text-white"
                    : "border-white/15 text-white/70 hover:border-white/40",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className="h-3 w-6 rounded-full"
                  style={{ backgroundColor: definition.color }}
                />
                <span className="flex-1">{definition.label}</span>
                <span className="text-[10px] text-white/40">
                  {definition.closedByDefault ? "loop" : "lane"}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <button
        type="button"
        onClick={() => pick({ type: "erase" })}
        aria-pressed={tool?.type === "erase"}
        className={[
          "rounded-md border px-2.5 py-1.5 text-xs transition",
          tool?.type === "erase"
            ? "border-rose-300 bg-rose-400/10 text-white"
            : "border-white/15 text-white/70 hover:border-white/40",
        ].join(" ")}
      >
        Erase building
      </button>
    </div>
  );
}
