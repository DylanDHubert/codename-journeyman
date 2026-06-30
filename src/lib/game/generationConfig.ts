export type NoiseConfig = {
  /** HIGHER = LESS LAND */
  landThreshold: number;
  /** RADIAL FALLOFF MULTIPLIER — PUSHES EDGES TOWARD WATER */
  falloffStrength: number;
  /** FALLOFF DIVISOR RELATIVE TO max(rows, cols) */
  falloffRadius: number;
  octave1Scale: number;
  octave2Scale: number;
  octave2Weight: number;
  octave3Scale: number;
  octave3Weight: number;
};

export type GridConfig = {
  rows: number;
  cols: number;
};

export type MapSizeMode = "standard" | "large";

export type GenerationConfig = {
  grid: GridConfig;
  noise: NoiseConfig;
  minPar: number;
  maxPar: number;
  maxAttempts: number;
  /** STANDARD = 22×14 PORTRAIT; LARGE = 44×28 GENERATED THEN ROTATED FOR DESKTOP */
  mapSize: MapSizeMode;
};

export const GRID_LIMITS = {
  rows: { min: 8, max: 22 },
  cols: { min: 6, max: 16 },
} as const;

export const LARGE_GRID_LIMITS = {
  rows: { min: 28, max: 44 },
  cols: { min: 28, max: 44 },
} as const;

/** PORTRAIT-FRIENDLY DEFAULT — TALLER THAN WIDE */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  mapSize: "standard",
  grid: { rows: 22, cols: 14 },
  noise: {
    landThreshold: 0.35,
    falloffStrength: 0.05,
    falloffRadius: 1,
    octave1Scale: 0.17,
    octave2Scale: 0.16,
    octave2Weight: 0.7,
    octave3Scale: 0.32,
    octave3Weight: 0.3,
  },
  minPar: 5,
  maxPar: 15,
  maxAttempts: 32,
};

/** GENERATED AT STANDARD RESOLUTION, SCALED 2× TO 44×28, THEN ROTATED FOR DESKTOP */
export const LARGE_GENERATION_CONFIG: GenerationConfig = {
  mapSize: "large",
  grid: { rows: 22, cols: 14 },
  noise: {
    landThreshold: 0.4,
    falloffStrength: 0.04,
    falloffRadius: 1,
    octave1Scale: 0.23,
    octave2Scale: 0.21,
    octave2Weight: 0.6,
    octave3Scale: 0.46,
    octave3Weight: 0.52,
  },
  minPar: 5,
  maxPar: 20,
  maxAttempts: 128,
};

export const GENERATION_PRESETS: Record<string, GenerationConfig> = {
  mobile: DEFAULT_GENERATION_CONFIG,
  classic: {
    ...DEFAULT_GENERATION_CONFIG,
    grid: { rows: 10, cols: 10 },
    maxPar: 10,
  },
  wide: {
    ...DEFAULT_GENERATION_CONFIG,
    grid: { rows: 10, cols: 14 },
    maxPar: 12,
  },
  large: {
    ...DEFAULT_GENERATION_CONFIG,
    grid: { rows: 20, cols: 9 },
    noise: { ...DEFAULT_GENERATION_CONFIG.noise, landThreshold: 0.06 },
    maxPar: 14,
    maxAttempts: 40,
  },
  sparse: {
    ...DEFAULT_GENERATION_CONFIG,
    grid: { rows: 16, cols: 8 },
    noise: { ...DEFAULT_GENERATION_CONFIG.noise, landThreshold: 0.14 },
  },
  dense: {
    ...DEFAULT_GENERATION_CONFIG,
    grid: { rows: 16, cols: 8 },
    noise: { ...DEFAULT_GENERATION_CONFIG.noise, landThreshold: 0.02 },
  },
};

const STORAGE_KEY = "bridge-isles-gen-config";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isLargeMapConfig(config: GenerationConfig): boolean {
  return config.mapSize === "large";
}

export function mapLabel(config: GenerationConfig): string {
  if (isLargeMapConfig(config)) {
    return "28×44 landscape";
  }

  return `${config.grid.rows}×${config.grid.cols}`;
}

export function clampGrid(
  rows: number,
  cols: number,
  mapSize: MapSizeMode = "standard",
): GridConfig {
  const limits = mapSize === "large" ? LARGE_GRID_LIMITS : GRID_LIMITS;
  return {
    rows: clamp(rows, limits.rows.min, limits.rows.max),
    cols: clamp(cols, limits.cols.min, limits.cols.max),
  };
}

export type GenerationConfigInput = {
  grid?: Partial<GridConfig>;
  noise?: Partial<NoiseConfig>;
  minPar?: number;
  maxPar?: number;
  maxAttempts?: number;
  mapSize?: MapSizeMode;
};

export function normalizeConfig(
  partial: GenerationConfigInput = {},
): GenerationConfig {
  const mapSize = partial.mapSize ?? DEFAULT_GENERATION_CONFIG.mapSize;
  const base =
    mapSize === "large" ? LARGE_GENERATION_CONFIG : DEFAULT_GENERATION_CONFIG;

  return {
    mapSize,
    grid: clampGrid(
      partial.grid?.rows ?? base.grid.rows,
      partial.grid?.cols ?? base.grid.cols,
      mapSize,
    ),
    noise: {
      landThreshold: partial.noise?.landThreshold ?? base.noise.landThreshold,
      falloffStrength: partial.noise?.falloffStrength ?? base.noise.falloffStrength,
      falloffRadius: partial.noise?.falloffRadius ?? base.noise.falloffRadius,
      octave1Scale: partial.noise?.octave1Scale ?? base.noise.octave1Scale,
      octave2Scale: partial.noise?.octave2Scale ?? base.noise.octave2Scale,
      octave2Weight: partial.noise?.octave2Weight ?? base.noise.octave2Weight,
      octave3Scale: partial.noise?.octave3Scale ?? base.noise.octave3Scale,
      octave3Weight: partial.noise?.octave3Weight ?? base.noise.octave3Weight,
    },
    minPar: partial.minPar ?? base.minPar,
    maxPar: partial.maxPar ?? base.maxPar,
    maxAttempts: partial.maxAttempts ?? base.maxAttempts,
  };
}

export function loadGenerationConfig(): GenerationConfig {
  if (typeof window === "undefined") {
    return DEFAULT_GENERATION_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_GENERATION_CONFIG;
    }

    return normalizeConfig({
      ...(JSON.parse(raw) as Partial<GenerationConfig>),
      mapSize: "standard",
    });
  } catch {
    return DEFAULT_GENERATION_CONFIG;
  }
}

export function saveGenerationConfig(config: GenerationConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  const { mapSize: _mapSize, ...persisted } = normalizeConfig(config);
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...persisted, mapSize: "standard" }),
  );
}

export function configKey(config: GenerationConfig): string {
  return JSON.stringify(normalizeConfig(config));
}

export function configEquals(
  a: GenerationConfig,
  b: GenerationConfig,
): boolean {
  return configKey(a) === configKey(b);
}

export function configFromSearchParams(
  params: Record<string, string | undefined>,
): GenerationConfig | null {
  const hasGrid =
    params.rows !== undefined || params.cols !== undefined;
  const hasNoise =
    params.threshold !== undefined ||
    params.falloff !== undefined ||
    params.falloffRadius !== undefined;

  if (!hasGrid && !hasNoise) {
    return null;
  }

  const parsed: GenerationConfigInput = {};

  if (params.rows) {
    parsed.grid = { ...parsed.grid, rows: Number(params.rows) };
  }
  if (params.cols) {
    parsed.grid = { ...parsed.grid, cols: Number(params.cols) };
  }
  if (params.threshold) {
    parsed.noise = {
      ...parsed.noise,
      landThreshold: Number(params.threshold),
    };
  }
  if (params.falloff) {
    parsed.noise = {
      ...parsed.noise,
      falloffStrength: Number(params.falloff),
    };
  }
  if (params.falloffRadius) {
    parsed.noise = {
      ...parsed.noise,
      falloffRadius: Number(params.falloffRadius),
    };
  }

  return normalizeConfig(parsed);
}
