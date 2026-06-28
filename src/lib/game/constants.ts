type CellDelta = { dr: number; dc: number };

/** MAX BRIDGES CONSIDERED WHEN COMPUTING PAR OFFLINE */
export const MAX_PAR_SEARCH_DEPTH = 16;

export const DIRECTIONS: readonly CellDelta[] = [
  { dr: -1, dc: 0 },
  { dr: 1, dc: 0 },
  { dr: 0, dc: -1 },
  { dr: 0, dc: 1 },
];
