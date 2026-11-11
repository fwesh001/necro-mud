/**
 * Player Persistence & Leaderboard System
 *
 * Saves and restores player state (stats, XP, titles, inventory, visited rooms)
 * across disconnects and server restarts to server/data/players.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Player } from '@necro-mud/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(SERVER_ROOT, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');

export interface PersistedPlayerState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xp: number;
  inventory: string[];
  visitedRooms: string[];
  bugsSquashed: number;
  title: string;
  lastSeen: number;
}

/** Compute developer title from accumulated XP */
export function computePlayerTitle(xp: number): string {
  if (xp >= 600) return 'Principal Arch-Mage';
  if (xp >= 300) return 'Staff System Sorcerer';
  if (xp >= 150) return 'Senior Code Necromancer';
  if (xp >= 50) return 'Junior Bug Hunter';
  return 'Intern Drifter';
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load all saved players from disk.
 */
export function loadPersistedPlayers(): Map<string, PersistedPlayerState> {
  ensureDataDir();
  const map = new Map<string, PersistedPlayerState>();

  if (!fs.existsSync(PLAYERS_FILE)) {
    return map;
  }

  try {
    const raw = fs.readFileSync(PLAYERS_FILE, 'utf-8');
    const records = JSON.parse(raw) as PersistedPlayerState[];
    if (Array.isArray(records)) {
      for (const rec of records) {
        if (rec.id || rec.name) {
          rec.title = computePlayerTitle(rec.xp);
          map.set(rec.name.toLowerCase(), rec);
        }
      }
    }
  } catch (err) {
    console.warn('[Persistence] Could not parse players.json, starting fresh:', err);
  }

  return map;
}

/**
 * Save all players to disk.
 */
export function saveAllPlayers(players: Iterable<Player>): void {
  ensureDataDir();
  const existing = loadPersistedPlayers();

  for (const player of players) {
    existing.set(player.name.toLowerCase(), {
      id: player.id,
      name: player.name,
      hp: player.hp,
      maxHp: player.maxHp,
      attack: player.attack,
      defense: player.defense,
      xp: player.xp,
      inventory: [...player.inventory],
      visitedRooms: [...player.visitedRooms],
      bugsSquashed: player.bugsSquashed ?? 0,
      title: computePlayerTitle(player.xp),
      lastSeen: Date.now(),
    });
  }

  const list = Array.from(existing.values());
  try {
    fs.writeFileSync(PLAYERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Persistence] Failed to write players.json:', err);
  }
}

/**
 * Save a single player record to disk.
 */
export function savePlayer(player: Player): void {
  saveAllPlayers([player]);
}

/**
 * Get sorted leaderboard (descending by XP, then bugs squashed).
 */
export function getLeaderboard(): PersistedPlayerState[] {
  const players = Array.from(loadPersistedPlayers().values());
  return players.sort((a, b) => b.xp - a.xp || b.bugsSquashed - a.bugsSquashed);
}

