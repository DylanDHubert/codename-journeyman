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

export type GenerationConfig = {
  grid: GridConfig;
  noise: NoiseConfig;
  minPar: number;
  maxPar: number;
  maxAttempts: number;
};

export const GRID_LIMITS = {
  rows: { min: 8, max: 22 },
  cols: { min: 6, max: 16 },
} as const;

/** PORTRAIT-FRIENDLY DEFAULT — TALLER THAN WIDE */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  grid: { rows: 16, cols: 8 },
  noise: {
    landThreshold: 0.35,
    falloffStrength: 0,
    falloffRadius: 0.47,
    octave1Scale: 0.15,
    octave2Scale: 0.16,
    octave2Weight: 0.6,
    octave3Scale: 0.32,
    octave3Weight: 0.55,
  },
  minPar: 5,
  maxPar: 18,
  maxAttempts: 24,
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

export function clampGrid(rows: number, cols: number): GridConfig {
  return {
    rows: clamp(rows, GRID_LIMITS.rows.min, GRID_LIMITS.rows.max),
    cols: clamp(cols, GRID_LIMITS.cols.min, GRID_LIMITS.cols.max),
  };
}

export type GenerationConfigInput = {
  grid?: Partial<GridConfig>;
  noise?: Partial<NoiseConfig>;
  minPar?: number;
  maxPar?: number;
  maxAttempts?: number;
};

export function normalizeConfig(
  partial: GenerationConfigInput = {},
): GenerationConfig {
  const base = DEFAULT_GENERATION_CONFIG;

  return {
    grid: clampGrid(
      partial.grid?.rows ?? base.grid.rows,
      partial.grid?.cols ?? base.grid.cols,
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

    return normalizeConfig(JSON.parse(raw) as Partial<GenerationConfig>);
  } catch {
    return DEFAULT_GENERATION_CONFIG;
  }
}

export function saveGenerationConfig(config: GenerationConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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
