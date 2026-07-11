export type DisplayPrefs = {
  /** WHITE CELL OUTLINE OPACITY — 0 HIDES THE GRID */
  cellGridOpacity: number;
  /** BLEND WATER DEPTH ACROSS NEIGHBOR CELLS — 0 = CHUNKY, 1 = FULL BILINEAR */
  waterDepthInterpolation: number;
};

export const DEFAULT_DISPLAY_PREFS: DisplayPrefs = {
  cellGridOpacity: 0.72,
  waterDepthInterpolation: 0.75,
};

const STORAGE_KEY = "bridge-isles-display-prefs";

function clamp01(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

export function normalizeDisplayPrefs(
  partial: Partial<DisplayPrefs> = {},
): DisplayPrefs {
  return {
    cellGridOpacity: clamp01(
      partial.cellGridOpacity ?? DEFAULT_DISPLAY_PREFS.cellGridOpacity,
      DEFAULT_DISPLAY_PREFS.cellGridOpacity,
    ),
    waterDepthInterpolation: clamp01(
      partial.waterDepthInterpolation ??
        DEFAULT_DISPLAY_PREFS.waterDepthInterpolation,
      DEFAULT_DISPLAY_PREFS.waterDepthInterpolation,
    ),
  };
}

export function loadDisplayPrefs(): DisplayPrefs {
  if (typeof window === "undefined") {
    return DEFAULT_DISPLAY_PREFS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_DISPLAY_PREFS;
    }

    return normalizeDisplayPrefs(JSON.parse(raw) as Partial<DisplayPrefs>);
  } catch {
    return DEFAULT_DISPLAY_PREFS;
  }
}

export function saveDisplayPrefs(prefs: Partial<DisplayPrefs>): void {
  if (typeof window === "undefined") {
    return;
  }

  const merged = normalizeDisplayPrefs({
    ...loadDisplayPrefs(),
    ...prefs,
  });
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}
