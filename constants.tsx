
export const COLORS = {
  player: '#22c55e',   // green-500
  teammate: '#3b82f6', // blue-500
  enemy: '#ef4444',    // red-500
  npc: '#eab308',      // yellow-500
  key: '#facc15',      // yellow-400
  grid: '#334155',     // slate-700
  wall: '#475569',     // slate-600
  lava: '#f97316',     // orange-500
  water: '#0ea5e9',    // sky-500
  grass: '#15803d',    // green-700
  pit: '#020617',      // slate-950
  forest: '#064e3b',   // emerald-900
  rock: '#3f3f46',      // zinc-700
  door: '#78350f',     // amber-900 (wood)
  chest: '#d97706',    // amber-600 (gold/treasure)
  trap: '#991b1b',     // red-800
  pillar: '#52525b',   // zinc-600
  statue: '#94a3b8',   // slate-400
  fountain: '#22d3ee', // cyan-400
  stairs: '#e2e8f0',   // slate-200
  altar: '#4c1d95'     // violet-950
};

export const INITIAL_GRID_SETTINGS = {
  rows: 15,
  cols: 15,
  cellSize: 50
};

export const ENTITY_DEFAULTS = {
  maxHp: 20,
  ac: 10,
  initiative: 10
};
