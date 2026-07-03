"use client";

import { useState } from "react";

import { TileSwatch } from "@/components/create/TileSwatch";
import type { TileKind } from "@/lib/game/types";

type PaletteTile = {
  id: string;
  label: string;
  kind: TileKind;
};

const PALETTE_TILES: PaletteTile[] = [
  { id: "water", label: "Water", kind: "ocean" },
  { id: "marsh", label: "Marsh", kind: "marsh" },
  { id: "whirlpool", label: "Whirlpool", kind: "whirlpool" },
  { id: "sand", label: "Sand", kind: "beach" },
  { id: "grass", label: "Grass", kind: "grass" },
  { id: "cliff", label: "Cliff", kind: "cliff" },
];

const PLACEHOLDER_COUNT = 3;
const SWATCH_SIZE = 40;

// MATCHES THE IN-GAME CELL OUTLINE (drawWhiteGrid)
const CELL_OUTLINE = "rgb(255 255 255 / 0.72)";

export function TilePalette() {
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (id: string) => {
    setSelected((current) => (current === id ? null : id));
  };

  return (
    <div className="grid grid-cols-3 justify-items-center gap-x-3 gap-y-4">
      {PALETTE_TILES.map((tile) => {
        const isSelected = selected === tile.id;
        return (
          <div key={tile.id} className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => toggle(tile.id)}
              aria-pressed={isSelected}
              title={tile.label}
              className={[
                "relative block overflow-hidden border transition",
                isSelected
                  ? "border-sky-300 ring-2 ring-sky-300/70 ring-offset-2 ring-offset-[#0a1f33]"
                  : "border-white/70 hover:border-white",
              ].join(" ")}
              style={{
                borderColor: isSelected ? undefined : CELL_OUTLINE,
              }}
            >
              <TileSwatch kind={tile.kind} size={SWATCH_SIZE} />
            </button>
            <span className="text-[10px] font-medium tracking-wide text-white/70">
              {tile.label}
            </span>
          </div>
        );
      })}

      {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
        <div
          key={`placeholder-${index}`}
          aria-hidden
          className="flex flex-col items-center gap-1.5"
        >
          <div
            className="flex items-center justify-center border border-dashed border-white/20 bg-white/[0.02] text-white/25"
            style={{ width: SWATCH_SIZE, height: SWATCH_SIZE }}
          >
            <span className="text-base leading-none">+</span>
          </div>
          <span className="text-[10px] text-white/25">—</span>
        </div>
      ))}
    </div>
  );
}
