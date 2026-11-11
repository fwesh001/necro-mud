/**
 * @necro-mud/shared — Barrel export
 *
 * All shared types, enums, and constants used by both
 * the server MUD engine and the client CRT terminal.
 */

// ── Types ────────────────────────────────────────────────────────────
export type { Room, RoomExit, Direction } from './types/room.js';
export type { Monster, MonsterOrigin, MonsterTier } from './types/monster.js';
export type { Player } from './types/player.js';
export type { CommandPacket, CommandType } from './types/commands.js';
export type {
  ServerEventPacket,
  ServerEventType,
  CombatResultPayload,
} from './types/events.js';

// ── Enums & Constants ────────────────────────────────────────────────
export { AnsiColor, FG, BG, RESET, BOLD, DIM, CP437 } from './types/ansi.js';
export { VGA_PALETTE, VGA_THEME } from './constants/ansi-palette.js';

