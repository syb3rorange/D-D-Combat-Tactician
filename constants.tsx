
export const COLORS = {
  player: '#22c55e',   // green-500
  teammate: '#3b82f6', // blue-500
  enemy: '#ef4444',    // red-500
  npc: '#eab308',      // yellow-500
  grid: '#334155',     // slate-700
  wall: '#475569',     // slate-600
  lava: '#f97316',     // orange-500
  water: '#0ea5e9',    // sky-500
  grass: '#15803d',    // green-700
  pit: '#020617',      // slate-950
  forest: '#064e3b',   // emerald-900
  rock: '#3f3f46'      // zinc-700
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
