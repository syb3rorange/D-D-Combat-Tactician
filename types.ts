
export type EntityType = 'player' | 'teammate' | 'enemy' | 'npc' | 'obstacle' | 'key';
export type EncounterStatus = 'active' | 'victory' | 'defeat' | 'short-rest' | 'long-rest';

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
  subtype?: 'wall' | 'lava' | 'water' | 'grass' | 'pit' | 'forest' | 'rock' | 'door' | 'chest' | 'trap' | 'pillar' | 'statue' | 'fountain' | 'stairs' | 'altar';
  contents?: string; // For chests
  isOpen?: boolean;  // For chests and doors
  isLocked?: boolean; // For interactive objects
  linkedEntityId?: string; // ID of the key that opens this, or the object this key opens
  isVisibleToPlayers?: boolean; // For hidden keys/traps
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
  showEnemyHpToPlayers?: boolean;
}
