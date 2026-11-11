/**
 * Deterministic Combat Engine
 *
 * Resolves ATTACK commands with a simple but extensible combat loop.
 * Exposes clean event hooks so an LLM Dungeon Master narrator
 * can be layered on top in Wave 3.
 */

import type { Player, Monster, CombatResultPayload } from '@necro-mud/shared';

/** Event hook type — called after each combat round for narration injection */
export type CombatNarrationHook = (result: CombatResultPayload) => string;

/** Default narration generator (deterministic, no LLM required) */
const defaultNarration: CombatNarrationHook = (result) => {
  const lines: string[] = [];

  if (result.damageDealt > 0) {
    lines.push(`You strike ${result.targetName} for ${result.damageDealt} damage!`);
  } else {
    lines.push(`Your attack glances off ${result.targetName}'s defenses!`);
  }

  if (result.damageReceived > 0) {
    lines.push(`${result.targetName} retaliates for ${result.damageReceived} damage!`);
  } else {
    lines.push(`${result.targetName}'s counterattack misses!`);
  }

  if (result.targetSlain) {
    lines.push(`☠ ${result.targetName} has been vanquished! The bug is squashed!`);
  }

  lines.push(`Your HP: ${result.attackerHp} | ${result.targetName} HP: ${result.targetHp}`);

  return lines.join('\r\n');
};

/** Simple seeded random for deterministic testing (uses Math.random in practice) */
function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Execute a single round of combat between a player and a monster.
 *
 * @param player - The attacking player (mutated in place)
 * @param monster - The target monster (mutated in place)
 * @param narrationHook - Optional hook for LLM-powered narration (defaults to deterministic)
 * @returns CombatResultPayload with all combat data + narration string
 */
export function executeCombatRound(
  player: Player,
  monster: Monster,
  narrationHook: CombatNarrationHook = defaultNarration,
): CombatResultPayload {
  // ── Player attacks monster ───────────────────────────────────────
  const playerRoll = rollDice(6);
  const rawDamage = player.attack + playerRoll - monster.defense;
  const damageDealt = Math.max(0, rawDamage);

  monster.hp = Math.max(0, monster.hp - damageDealt);
  const targetSlain = monster.hp <= 0;

  if (targetSlain) {
    monster.alive = false;
    player.xp += monster.xpReward;
  }

  // ── Monster counterattacks (if alive) ────────────────────────────
  let damageReceived = 0;
  if (!targetSlain) {
    const monsterRoll = rollDice(6);
    const rawCounter = monster.attack + monsterRoll - player.defense;
    damageReceived = Math.max(0, rawCounter);
    player.hp = Math.max(0, player.hp - damageReceived);
  }

  // ── Build result ─────────────────────────────────────────────────
  const result: CombatResultPayload = {
    attackerId: player.id,
    targetId: monster.id,
    targetName: monster.name,
    damageDealt,
    damageReceived,
    targetSlain,
    attackerHp: player.hp,
    attackerMaxHp: player.maxHp,
    targetHp: monster.hp,
    targetMaxHp: monster.maxHp,
    narration: '', // Filled by hook below
  };

  // ── Narration hook (default or LLM override) ────────────────────
  result.narration = narrationHook(result);

  return result;
}

