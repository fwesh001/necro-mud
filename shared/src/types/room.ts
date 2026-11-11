/**
 * Room — A navigable location in the dungeon.
 * Each room maps to a file or directory in the target GitHub repository.
 */

export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

export interface RoomExit {
  /** Cardinal / vertical direction of travel */
  direction: Direction;
  /** ID of the room this exit leads to */
  targetRoomId: string;
  /** Whether the exit is locked (requires a key / PR merge to open) */
  locked: boolean;
  /** Optional flavour text shown when the player looks at this exit */
  description?: string;
}

export interface Room {
  /** Unique room identifier (slug, e.g. "src-hall") */
  id: string;
  /** Display name rendered in ANSI (e.g. "The Source Code Hall") */
  name: string;
  /** Multi-line ANSI-formatted room description */
  description: string;
  /** GitHub file/directory path this room was generated from (null for hand-crafted rooms) */
  filePath: string | null;
  /** Available exits */
  exits: RoomExit[];
  /** IDs of monsters currently in this room */
  monsterIds: string[];
  /** IDs of players currently in this room */
  playerIds: string[];
  /** File/directory complexity score 0–100 (derived from LoC, cyclomatic complexity, etc.) */
  complexity: number;
  /** Whether this room has been visited by any player (for MAP rendering) */
  discovered: boolean;
}

