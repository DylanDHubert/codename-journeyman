"use client";

import { useEffect, useRef } from "react";
import { createNoise2D } from "simplex-noise";

import { hashStringToSeed, mulberry32 } from "@/lib/game/seed";
import {
  modulateWaterColorRgb,
  WATER_DRIFT,
  WATER_SUBCELLS,
} from "@/lib/rendering/waterNoise";

const SHALLOW_WATER = { r: 72, g: 176, b: 210 };
const DEEP_WATER = { r: 12, g: 48, b: 92 };
const FRAME_MS = 420;
const AMBIENT_SEED = "journeyman-home-ocean";

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function oceanRgbAt(x: number, y: number, width: number, height: number) {
  const depthNoise =
    (Math.sin((x / width) * Math.PI * 1.4) + Math.sin((y / height) * Math.PI * 1.1)) *
      0.12 +
    0.55;
  return mixRgb(SHALLOW_WATER, DEEP_WATER, Math.min(1, Math.max(0, depthNoise)));
}

function normalizeNoise(value: number): number {
  return (value + 1) * 0.5;
}

function thresholdNoise(value: number, levels: number): number {
  if (levels <= 1) {
    return value;
  }

  const band = Math.min(levels - 1, Math.floor(value * levels));
  return band / (levels - 1);
}

function sampleWaterNoise(
  noise2D: (x: number, y: number) => number,
  phase: number,
  row: number,
  col: number,
  subRow: number,
  subCol: number,
): number {
  const driftX = phase * WATER_DRIFT.x;
  const driftY = phase * WATER_DRIFT.y;
  const x = (col + (subCol + 0.5) / WATER_SUBCELLS) * 0.35 + driftX;
  const y = (row + (subRow + 0.5) / WATER_SUBCELLS) * 0.35 + driftY;

  const coarse = thresholdNoise(normalizeNoise(noise2D(x, y)), 4);
  const fine = thresholdNoise(normalizeNoise(noise2D(x * 2.6, y * 2.6)), 3);
  return coarse * 0.62 + fine * 0.38;
}

export function OceanBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const noise2D = createNoise2D(
      mulberry32(hashStringToSeed(`${AMBIENT_SEED}-water-noise`)),
    );

    let frame = 0;
    let raf = 0;
    let lastTick = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (time: number) => {
      raf = window.requestAnimationFrame(paint);

      if (time - lastTick < FRAME_MS) {
        return;
      }

      lastTick = time;
      frame += 1;

      const { width, height } = canvas.getBoundingClientRect();
      const cellSize = 8;
      const subSize = Math.max(1, Math.floor(cellSize / WATER_SUBCELLS));

      for (let y = 0; y < height; y += subSize) {
        for (let x = 0; x < width; x += subSize) {
          const row = Math.floor(y / cellSize);
          const col = Math.floor(x / cellSize);
          const subRow = Math.floor((y % cellSize) / subSize);
          const subCol = Math.floor((x % cellSize) / subSize);

          const base = oceanRgbAt(x, y, width, height);
          const noise = sampleWaterNoise(noise2D, frame, row, col, subRow, subCol);
          const { r, g, b } = modulateWaterColorRgb(base, noise, "ocean");

          ctx.fillStyle = `rgb(${r} ${g} ${b})`;
          ctx.fillRect(x, y, subSize, subSize);
        }
      }
    };

    resize();
    raf = window.requestAnimationFrame(paint);
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full opacity-90"
    />
  );
}
