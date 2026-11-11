/**
 * Monster — An enemy entity spawned from GitHub artifacts.
 * Issues become undead, complex files become boss creatures,
 * and failing CI checks become cursed traps.
 */

/** The GitHub artifact type that spawned this monster */
export type MonsterOrigin = 'issue' | 'bug' | 'complexity' | 'ci-failure';

/** Difficulty tier derived from the source artifact severity */
export type MonsterTier = 'minion' | 'elite' | 'boss';

export interface Monster {
  /** Unique monster identifier */
  id: string;
  /** Display name (e.g. "Phantom Bug #42", "The Spaghetti Golem") */
  name: string;
  /** What GitHub artifact spawned this monster */
  origin: MonsterOrigin;
  /** Difficulty tier */
  tier: MonsterTier;
  /** Current hit points */
  hp: number;
  /** Maximum hit points */
  maxHp: number;
  /** Attack power */
  attack: number;
  /** Defense rating */
  defense: number;
  /** ANSI-formatted description shown on LOOK */
  description: string;
  /** Reference to the originating GitHub artifact (issue URL, file path, check run URL) */
  sourceRef: string;
  /** Room this monster is currently in */
  roomId: string;
  /** Whether this monster is still alive */
  alive: boolean;
  /** XP reward for slaying */
  xpReward: number;
  /** Optional loot dropped on death (item IDs) */
  loot: string[];
}

