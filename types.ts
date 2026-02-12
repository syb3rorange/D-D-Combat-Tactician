
export type EntityType = 'player' | 'teammate' | 'enemy' | 'npc';
export type EncounterStatus = 'active' | 'victory' | 'defeat';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  hp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  x: number;
  y: number;
  color: string;
  claimedBy?: string; // Name of the player who claimed this slot
  notes?: string;
}

export interface GridSettings {
  rows: number;
  cols: number;
  cellSize: number;
}

export interface SessionData {
  entities: Entity[];
  gridSettings: GridSettings;
  status: EncounterStatus;
  updatedAt: string;
}
