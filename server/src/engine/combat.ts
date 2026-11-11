/**
 * Deterministic Combat Engine
 *
 * Resolves ATTACK commands with a simple but extensible combat loop.
 * Exposes clean event hooks so an LLM Dungeon Master narrator
 * can be layered on top in Wave 3.
 */

import type { Player, Monster, CombatResultPayload } from '@necro-mud/shared';
import { getDeterministicGothicNarration } from './ai-dm.js';

/** Event hook type — called after each combat round for narration injection */
export type CombatNarrationHook = (result: CombatResultPayload) => string;

/** Default narration generator using the Gothic AI-DM engine */
const defaultNarration: CombatNarrationHook = (result) => {
  return getDeterministicGothicNarration(result);
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

export interface PatchResult {
  success: boolean;
  message: string;
  damageDealt: number;
  solved: boolean;
  xpEarned: number;
  loot: string[];
}

/**
 * Attempt to apply an interactive bug fix / patch to an entity.
 */
export function executePatch(player: Player, monster: Monster): PatchResult {
  if (monster.origin === 'complexity') {
    return {
      success: false,
      message: 'Architectural complexity cannot be patched inline! Slay it in combat or cast REFACTOR.',
      damageDealt: 0,
      solved: false,
      xpEarned: 0,
      loot: [],
    };
  }

  const baseFix = rollDice(8) + 16;
  const damageDealt = Math.min(monster.hp, baseFix);
  monster.hp = Math.max(0, monster.hp - damageDealt);
  const solved = monster.hp <= 0;

  let xpEarned = 0;
  const loot: string[] = [];

  if (solved) {
    monster.alive = false;
    xpEarned = monster.xpReward + 5;
    player.xp += xpEarned;

    const drop =
      monster.origin === 'bug'
        ? 'scroll-hotfix'
        : monster.origin === 'ci-failure'
        ? 'scroll-rollback'
        : 'scroll-refactor';
    loot.push(drop);
    if (!player.inventory.includes(drop)) {
      player.inventory.push(drop);
    }
  }

  return {
    success: true,
    message: solved
      ? `Patch applied successfully! The defect is permanently resolved.`
      : `Patch applied, mitigating the bug for ${damageDealt} fix damage.`,
    damageDealt,
    solved,
    xpEarned,
    loot,
  };
}

export interface SpellResult {
  success: boolean;
  spellName: string;
  message: string;
  hpHealed?: number;
  damageDealt?: number;
  targetSlain?: boolean;
}

/**
 * Cast a commit scroll spell (HOTFIX, REFACTOR, ROLLBACK).
 */
export function executeSpell(
  player: Player,
  rawSpell: string,
  target?: Monster,
): SpellResult {
  const spell = rawSpell.trim().toLowerCase();

  switch (spell) {
    case 'hotfix': {
      const scrollIndex = player.inventory.indexOf('scroll-hotfix');
      const hasScroll = scrollIndex !== -1;
      if (hasScroll) {
        player.inventory.splice(scrollIndex, 1);
      }
      const healAmount = hasScroll ? 45 : 25;
      const prevHp = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      const actualHealed = player.hp - prevHp;
      return {
        success: true,
        spellName: 'HOTFIX',
        message: hasScroll
          ? `You invoke a commit scroll: HOTFIX! Critical patch deployed. Restored ${actualHealed} HP.`
          : `You quickly deploy a dirty HOTFIX. Restored ${actualHealed} HP.`,
        hpHealed: actualHealed,
      };
    }

    case 'refactor': {
      if (!target) {
        return {
          success: false,
          spellName: 'REFACTOR',
          message: 'Refactor what? Usage: CAST refactor <monster>',
        };
      }
      const scrollIndex = player.inventory.indexOf('scroll-refactor');
      const hasScroll = scrollIndex !== -1;
      if (hasScroll) {
        player.inventory.splice(scrollIndex, 1);
      }
      const damage = hasScroll ? 45 : 30;
      target.hp = Math.max(0, target.hp - damage);
      const targetSlain = target.hp <= 0;
      if (targetSlain) {
        target.alive = false;
        player.xp += target.xpReward;
      }
      return {
        success: true,
        spellName: 'REFACTOR',
        message: hasScroll
          ? `You unleash a master REFACTOR scroll! Tangled logic unravels for ${damage} architectural damage!`
          : `You execute a clean REFACTOR, dealing ${damage} damage to ${target.name}.`,
        damageDealt: damage,
        targetSlain,
      };
    }

    case 'rollback': {
      const scrollIndex = player.inventory.indexOf('scroll-rollback');
      const hasScroll = scrollIndex !== -1;
      if (hasScroll) {
        player.inventory.splice(scrollIndex, 1);
      }
      const heal = hasScroll ? 25 : 15;
      player.hp = Math.min(player.maxHp, player.hp + heal);
      return {
        success: true,
        spellName: 'ROLLBACK',
        message: hasScroll
          ? `You invoke ROLLBACK! State restored to last clean commit (+${heal} HP and shielding).`
          : `You perform a quick git checkout. State restored (+${heal} HP).`,
        hpHealed: heal,
      };
    }

    default:
      return {
        success: false,
        spellName: rawSpell.toUpperCase(),
        message: `Unknown spell "${rawSpell}". Available spells: HOTFIX, REFACTOR, ROLLBACK.`,
      };
  }
}

