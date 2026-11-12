/**
 * AI Dungeon Master Narration Engine
 *
 * Implements ambient gothic-BBS combat and event narration.
 * Uses native fetch with a strict 2000ms timeout for LLM APIs (Gemini / OpenAI),
 * with an instant deterministic gothic fallback table if keys are absent or requests fail.
 *
 * All output strictly complies with:
 *   - 16-color VGA palette
 *   - CP437 box & accent symbols
 *   - 80-column line width limit (wrapped to <= 76 visible chars)
 */

import type { CombatResultPayload } from '@necro-mud/shared';
import { AnsiColor, CP437, FG, RESET, BOLD } from '@necro-mud/shared';

export interface AiDmConfig {
  apiKey?: string;
  provider?: 'gemini' | 'openai' | 'groq' | 'xai' | 'grok' | 'generic';
  model?: string;
  timeoutMs?: number;
}

const GOTHIC_STRIKES = [
  'cleaves through the spectral bytecode of',
  'drives an arcane debugger probe deep into',
  'purges the corrupted memory space of',
  'unleashes a torrential burst of compiler wrath upon',
  'delivers a punishing terminal interrupt to',
  'shatters the unstable abstraction layer guarding',
];

const GOTHIC_GLANCES = [
  'glances harmlessly off the hardened armor of',
  'is caught in an unhandled exception barrier cast by',
  'dissipates into the null void surrounding',
  'fails to pierce the recursive defense perimeter of',
];

const GOTHIC_COUNTERS = [
  'retaliates with a searing cascade of core dumps',
  'hurls a jagged shard of unhandled rejection debris',
  'strikes back with an agonizing memory leak',
  'lashes out with corrupted stack frames',
  'counterattacks with a venomous null-pointer tendril',
];

const GOTHIC_MISSES = [
  'counterattack dissolves into a harmless syntax warning.',
  'strike misses entirely, swallowed by a race condition.',
  'flails wildly into the darkness, failing to connect.',
  'counterattack is caught and discarded by the garbage collector.',
];

const GOTHIC_FINISHERS = [
  'The bug is squashed, its corrupted bytecode dissipating into the terminal abyss!',
  'A deathly silence falls over the terminal as the entity is permanently deallocated.',
  'The stack trace collapses! The monster dissolves into harmless zero-byte remnants.',
  'Vanquished! The repository directory breathes a sigh of relief as purity is restored.',
];

/** Select a pseudo-random item from an array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Word-wrap text to fit inside terminal boxes (<= 74 chars) */
function wrapLines(text: string, maxLen: number = 74): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!word) continue;
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= maxLen) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Deterministic Gothic BBS combat narration.
 * Formats rich atmospheric text strictly within VGA 16 colors and 80-col constraints.
 */
export function getDeterministicGothicNarration(result: CombatResultPayload): string {
  const lines: string[] = [];
  const playerColor = FG[AnsiColor.BrightGreen];
  const monsterColor = FG[AnsiColor.BrightRed];
  const hitColor = FG[AnsiColor.BrightWhite];
  const accent = FG[AnsiColor.Yellow];

  if (result.damageDealt > 0) {
    const verb = pick(GOTHIC_STRIKES);
    const text = `You ${verb} ${result.targetName} for ${result.damageDealt} damage!`;
    lines.push(`${playerColor}${CP437.SWORD}${RESET} ${wrapLines(text).join('\r\n  ')}`);
  } else {
    const verb = pick(GOTHIC_GLANCES);
    const text = `Your attack ${verb} ${result.targetName}!`;
    lines.push(`${accent}${CP437.BULLET}${RESET} ${wrapLines(text).join('\r\n  ')}`);
  }

  if (result.damageReceived > 0) {
    const counter = pick(GOTHIC_COUNTERS);
    const text = `${result.targetName} ${counter} for ${result.damageReceived} damage!`;
    lines.push(`${monsterColor}${CP437.SKULL}${RESET} ${wrapLines(text).join('\r\n  ')}`);
  } else if (!result.targetSlain) {
    const miss = pick(GOTHIC_MISSES);
    const text = `${result.targetName}'s ${miss}`;
    lines.push(`${FG[AnsiColor.Green]}${CP437.BULLET}${RESET} ${wrapLines(text).join('\r\n  ')}`);
  }

  if (result.targetSlain) {
    const finisher = pick(GOTHIC_FINISHERS);
    lines.push('');
    lines.push(
      `${BOLD}${FG[AnsiColor.BrightYellow]}${CP437.SKULL} ${finisher} ${CP437.SKULL}${RESET}`
    );
  }

  lines.push('');
  lines.push(
    `${FG[AnsiColor.BrightBlack]}vitals: ` +
    `${FG[AnsiColor.Green]}Player ${result.attackerHp}/${result.attackerMaxHp} HP${FG[AnsiColor.BrightBlack]} | ` +
    `${FG[AnsiColor.Red]}${result.targetName} ${result.targetHp}/${result.targetMaxHp} HP${RESET}`
  );

  return lines.join('\r\n');
}

interface ResolvedAiEndpoint {
  apiKey: string;
  kind: 'gemini' | 'openai-compatible';
  endpoint: string;
  model: string;
}

/**
 * Resolve configured AI DM credentials and target chat completions endpoint.
 * Supports Gemini (`AIza...`), Groq (`gsk_...`), xAI Grok (`xai-...`), and OpenAI.
 */
function resolveAiEndpoint(config?: AiDmConfig): ResolvedAiEndpoint | null {
  const apiKey = (
    config?.apiKey ??
    process.env.LLM_API_KEY ??
    process.env.GROQ_API_KEY ??
    process.env.XAI_API_KEY ??
    process.env.GROK_API_KEY ??
    process.env.kiro_llm_api ??
    process.env.OPENAI_API_KEY ??
    process.env.GEMINI_API_KEY
  )?.trim();

  if (!apiKey) return null;

  if (
    config?.provider === 'gemini' ||
    (!config?.provider && apiKey.startsWith('AIza')) ||
    Boolean(process.env.GEMINI_API_KEY && !process.env.LLM_API_KEY && !process.env.GROQ_API_KEY && !process.env.XAI_API_KEY && !process.env.GROK_API_KEY && !process.env.kiro_llm_api)
  ) {
    return {
      apiKey,
      kind: 'gemini',
      endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${config?.model ?? 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
      model: config?.model ?? 'gemini-1.5-flash',
    };
  }

  if (config?.provider === 'groq' || apiKey.startsWith('gsk_')) {
    return {
      apiKey,
      kind: 'openai-compatible',
      endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      model: config?.model ?? process.env.LLM_MODEL ?? 'llama-3.3-70b-versatile',
    };
  }

  if (config?.provider === 'xai' || config?.provider === 'grok' || apiKey.startsWith('xai-')) {
    return {
      apiKey,
      kind: 'openai-compatible',
      endpoint: 'https://api.x.ai/v1/chat/completions',
      model: config?.model ?? process.env.LLM_MODEL ?? 'grok-2-latest',
    };
  }

  return {
    apiKey,
    kind: 'openai-compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: config?.model ?? process.env.LLM_MODEL ?? 'gpt-4o-mini',
  };
}

/** Check whether any supported LLM API key is configured in the environment */
export function hasAiDmKey(): boolean {
  return resolveAiEndpoint() !== null;
}

/**
 * Attempt to query an LLM provider (Groq / xAI Grok / Gemini / OpenAI) with strict timeout.
 * Returns null if unconfigured, times out, or encounters any network error.
 */
export async function generateAiNarration(
  result: CombatResultPayload,
  config?: AiDmConfig,
): Promise<string | null> {
  const resolved = resolveAiEndpoint(config);
  if (!resolved) return null;

  const timeoutMs = config?.timeoutMs ?? 3500;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const prompt = [
    'You are a 1980s Gothic BBS MUD Dungeon Master narrating combat in a haunted GitHub repository.',
    'Write 1 to 2 short sentences describing this combat round with dark computing/hacker atmosphere.',
    'Max 55 words total. Do NOT use markdown. Do NOT use emojis. Fit within 75 chars per line.',
    `Attacker HP: ${result.attackerHp}/${result.attackerMaxHp}`,
    `Monster: ${result.targetName} (${result.targetHp}/${result.targetMaxHp} HP remaining)`,
    `Damage dealt to monster: ${result.damageDealt}`,
    `Damage dealt to player: ${result.damageReceived}`,
    `Monster slain: ${result.targetSlain}`,
  ].join('\n');

  try {
    if (resolved.kind === 'gemini') {
      const res = await fetch(resolved.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 80, temperature: 0.7 },
        }),
        signal: controller.signal,
      });

      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === 'string' && text.trim()
        ? wrapLines(text.trim(), 60).join('\r\n  ')
        : null;
    }

    const res = await fetch(resolved.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resolved.apiKey}`,
      },
      body: JSON.stringify({
        model: resolved.model,
        messages: [
          {
            role: 'system',
            content:
              'You are a 1980s Gothic BBS MUD Dungeon Master. 1-2 punchy sentences, dark computing flavor, max 50 words. Plain text only.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 90,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim()
      ? wrapLines(text.trim(), 60).join('\r\n  ')
      : null;
  } catch {
    // Timeout or network error — fail safe
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Creates the standard CombatNarrationHook for combat engine.
 * Fast, synchronous, deterministic by default.
 */
export function createCombatNarrationHook(): (result: CombatResultPayload) => string {
  return (result: CombatResultPayload) => {
    return getDeterministicGothicNarration(result);
  };
}

