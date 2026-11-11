/**
 * Player — A connected adventurer / developer exploring the dungeon.
 */

export interface Player {
  /** Unique player identifier (assigned on WebSocket connect) */
  id: string;
  /** Display name (defaults to "Adventurer-XXXX") */
  name: string;
  /** Current hit points */
  hp: number;
  /** Maximum hit points */
  maxHp: number;
  /** Attack power */
  attack: number;
  /** Defense rating */
  defense: number;
  /** Experience points accumulated */
  xp: number;
  /** Current room ID */
  currentRoomId: string;
  /** Item IDs in inventory */
  inventory: string[];
  /** Set of room IDs the player has visited (for personal MAP) */
  visitedRooms: string[];
  /** Unix timestamp (ms) when the player connected */
  connectedAt: number;
}

