/**
 * ServerEventPacket — Messages sent from server → client(s).
 * Each packet wraps a game event with a typed payload.
 */

/** All server event types */
export type ServerEventType =
  | 'welcome'           // Initial connection greeting + banner
  | 'room-description'  // Full room render (on LOOK or room entry)
  | 'combat-result'     // Outcome of an ATTACK round
  | 'player-joined'     // Another player entered the dungeon
  | 'player-left'       // A player disconnected
  | 'player-moved'      // A player moved into/out of a room
  | 'monster-spawned'   // A new monster appeared
  | 'monster-slain'     // A monster was killed
  | 'map-view'          // ASCII map of discovered rooms
  | 'status-view'       // Player stats display
  | 'help-text'         // Command help listing
  | 'scan-result'       // SCAN analysis of a monster's GitHub origin
  | 'narration'         // AI Dungeon Master flavour text (future LLM hook)
  | 'repo-loaded'       // A new GitHub repository has been converted into the dungeon
  | 'leaderboard-view'  // XP leaderboard and developer ranks display
  | 'chat'              // SAY message broadcast
  | 'error';            // Error message

export interface ServerEventPacket {
  /** Packet discriminator — always "event" for server→client */
  type: 'event';
  /** The event type */
  event: ServerEventType;
  /** Event-specific data (shape varies by event type) */
  payload: Record<string, unknown>;
  /** Target player ID, or null for broadcast to all players in scope */
  playerId: string | null;
  /** Unix timestamp (ms) when the event was emitted */
  timestamp: number;
}

// ── Strongly-typed payload helpers (for future use) ──────────────────

export interface CombatResultPayload {
  attackerId: string;
  targetId: string;
  targetName: string;
  damageDealt: number;
  damageReceived: number;
  targetSlain: boolean;
  attackerHp: number;
  attackerMaxHp: number;
  targetHp: number;
  targetMaxHp: number;
  narration: string;   // Hook point for LLM Dungeon Master
}

