/**
 * Client Telemetry, ANSI & 80-Column Formatting Helpers
 *
 * Pure parsing and clamping functions shared between the HUD/Modals
 * and the property-based fuzz testing suite.
 */

export interface HudMonster {
  name: string;
  tier: string;
}

export interface ScanDetails {
  target: string;
  origin: string;
  tier: string;
  hp: string;
  atk: string;
  def: string;
  labels: string[];
  source: string;
  description: string;
  snippet: string | null;
}

export interface ParsedStatus {
  title?: string;
  hp?: number;
  maxHp?: number;
  xp?: number;
  bugsSquashed?: number;
  inventory?: string[];
  roomId?: string;
}

const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

/**
 * Remove ANSI CSI/SGR escape sequences from a terminal string.
 */
export function stripAnsi(input: string): string {
  return input.replace(ANSI_ESCAPE_REGEX, '');
}

/**
 * Wrap arbitrary text (plain or containing ANSI SGR sequences) so that
 * every emitted line has visible character width <= maxCols (default 80).
 */
export function wrapTerminalText(text: string, maxCols: number = 80): string[] {
  const limit = Math.max(1, Math.floor(maxCols));
  const output: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    if (stripAnsi(rawLine).length <= limit) {
      output.push(rawLine);
      continue;
    }

    // Tokenize keeping ANSI escape sequences intact as zero-width atoms
    const tokens = rawLine.split(/(\x1b\[[0-9;?]*[ -/]*[@-~]|\s+)/);
    let currentLine = '';
    let currentVisible = 0;

    for (const token of tokens) {
      if (!token) continue;

      if (ANSI_ESCAPE_REGEX.test(token)) {
        ANSI_ESCAPE_REGEX.lastIndex = 0;
        currentLine += token;
        continue;
      }

      const tokenVisible = token.length;

      // Slice oversized single tokens (e.g. URLs) cleanly across lines
      if (tokenVisible > limit) {
        if (currentVisible > 0) {
          output.push(currentLine);
          currentLine = '';
          currentVisible = 0;
        }
        let rest = token;
        while (rest.length > limit) {
          output.push(rest.slice(0, limit));
          rest = rest.slice(limit);
        }
        currentLine = rest;
        currentVisible = rest.length;
        continue;
      }

      if (currentVisible + tokenVisible <= limit) {
        currentLine += token;
        currentVisible += tokenVisible;
      } else {
        if (currentVisible > 0) {
          output.push(currentLine);
          const trimmed = token.replace(/^\s+/, '');
          currentLine = trimmed;
          currentVisible = trimmed.length;
        } else {
          currentLine += token;
          currentVisible += tokenVisible;
        }
      }
    }

    if (currentLine.length > 0 || output.length === 0) {
      output.push(currentLine);
    }
  }

  return output;
}

/**
 * Clamp HP ratio strictly into [0, 1], handling negative, NaN, or overflow values.
 */
export function clampHpRatio(hp: number, maxHp: number): number {
  const safeMax = Number.isFinite(maxHp) && maxHp > 0 ? maxHp : 1;
  const safeHp = Number.isFinite(hp) ? hp : 0;
  return Math.max(0, Math.min(1, safeHp / safeMax));
}

/**
 * Compute integer HP percentage [0..100] and lit LED segments [0..totalSegments].
 */
export function computeHpSegments(
  hp: number,
  maxHp: number,
  totalSegments: number = 12,
): { pct: number; filled: number; total: number } {
  const total = Math.max(1, Math.floor(Number.isFinite(totalSegments) ? totalSegments : 12));
  const ratio = clampHpRatio(hp, maxHp);
  const pct = Math.round(ratio * 100);
  const filled = Math.max(0, Math.min(total, Math.round(ratio * total)));
  return { pct, filled, total };
}

/**
 * Parse room name, filepath, and living monsters from ANSI room-description output.
 */
export function parseRoomDescription(ansi: string): {
  roomName?: string;
  roomPath: string | null;
  monsters: HudMonster[];
} {
  const clean = stripAnsi(ansi);
  const lines = clean.split(/\r?\n/);

  let roomName: string | undefined;
  let roomPath: string | null = null;
  const monsters: HudMonster[] = [];

  for (const line of lines) {
    const trimmed = line.replace(/[╔╗╚╝═║]/g, '').trim();
    if (!trimmed) continue;

    if (!roomName) {
      roomName = trimmed;
      continue;
    }

    const pathMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (pathMatch && !['LOCKED', 'MINION', 'ELITE', 'BOSS'].includes(pathMatch[1] ?? '')) {
      roomPath = pathMatch[1] ?? null;
      continue;
    }

    const monsterMatch = trimmed.match(/^†\s+(.+?)\s+\[(MINION|ELITE|BOSS)\]/i);
    if (monsterMatch) {
      monsters.push({
        name: monsterMatch[1]!.trim(),
        tier: monsterMatch[2]!.toLowerCase(),
      });
    }
  }

  return { roomName, roomPath, monsters };
}

/**
 * Parse adventurer stats, rank title, XP, bugs squashed, and inventory from STATUS ANSI output.
 */
export function parseStatusView(ansi: string): ParsedStatus {
  const clean = stripAnsi(ansi);
  const parsed: ParsedStatus = {};

  const nameTitleMatch = clean.match(/Name:\s+.+?\s+\(([^)]+)\)/);
  if (nameTitleMatch) {
    parsed.title = nameTitleMatch[1]!.trim();
  }

  const hpMatch = clean.match(/HP:\s+\S+\s+(\d+)\/(\d+)/);
  if (hpMatch) {
    parsed.hp = Number(hpMatch[1]);
    parsed.maxHp = Number(hpMatch[2]);
  }

  const xpMatch = clean.match(/XP:\s+(\d+)/);
  if (xpMatch) {
    parsed.xp = Number(xpMatch[1]);
  }

  const bugsMatch = clean.match(/Bugs:\s+(\d+)\s+squashed/i);
  if (bugsMatch) {
    parsed.bugsSquashed = Number(bugsMatch[1]);
  }

  const roomMatch = clean.match(/Room:\s+([^\s║]+)/);
  if (roomMatch) {
    parsed.roomId = roomMatch[1]!.trim();
  }

  const itemsMatch = clean.match(/Items:\s+(.+?)(?:║|$)/m);
  if (itemsMatch) {
    const rawItems = itemsMatch[1]!.trim();
    if (rawItems === '(empty)') {
      parsed.inventory = [];
    } else {
      parsed.inventory = rawItems
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }
  }

  return parsed;
}

/**
 * Parse a SCAN ANALYSIS CP437 box into structured diagnostic details for PatchModal.
 */
export function parseScanResult(ansi: string): ScanDetails | null {
  const clean = stripAnsi(ansi);
  const lines = clean
    .split(/\r?\n/)
    .map(l => l.replace(/[╔╗╚╝═║]/g, '').trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return null;

  let target = '';
  let origin = '';
  let tier = '';
  let hp = '?/?';
  let atk = '?';
  let def = '?';
  let labels: string[] = [];
  let source = '';
  const descLines: string[] = [];
  const snippetLines: string[] = [];
  let inSnippet = false;
  let pastHeader = false;

  for (const line of lines) {
    if (line === 'SCAN ANALYSIS') continue;

    if (line.includes('ARTIFACT BODY / SNIPPET')) {
      inSnippet = true;
      continue;
    }

    if (inSnippet) {
      snippetLines.push(line);
      continue;
    }

    const targetMatch = line.match(/^Target:\s+(.+)$/);
    if (targetMatch) {
      target = targetMatch[1]!.trim();
      continue;
    }

    const originMatch = line.match(/^Origin:\s+(\S+)\s+\[([^\]]+)\]/);
    if (originMatch) {
      origin = originMatch[1]!.trim().toLowerCase();
      tier = originMatch[2]!.trim().toLowerCase();
      continue;
    }

    const vitalsMatch = line.match(/^Vitals:\s+HP\s+(\S+)\s+\|\s+ATK\s+(\S+)\s+\|\s+DEF\s+(\S+)/);
    if (vitalsMatch) {
      hp = vitalsMatch[1]!;
      atk = vitalsMatch[2]!;
      def = vitalsMatch[3]!;
      continue;
    }

    const labelsMatch = line.match(/^Labels:\s+(.+)$/);
    if (labelsMatch) {
      labels = labelsMatch[1]!.split(',').map(s => s.trim()).filter(Boolean);
      continue;
    }

    const sourceMatch = line.match(/^Source:\s+(.+)$/);
    if (sourceMatch) {
      source = sourceMatch[1]!.trim();
      pastHeader = true;
      continue;
    }

    if (pastHeader) {
      descLines.push(line);
    }
  }

  if (!target) return null;

  return {
    target,
    origin: origin || 'issue',
    tier: tier || 'minion',
    hp,
    atk,
    def,
    labels,
    source,
    description: descLines.join(' '),
    snippet: snippetLines.length > 0 ? snippetLines.join('\n') : null,
  };
}

/**
 * Extract patched monster name from PATCH result ANSI output.
 */
export function parsePatchTargetName(ansi: string): string | null {
  const clean = stripAnsi(ansi);
  const match = clean.match(/Applied refactor patch to (.+?) dealing \d+ fix damage!/);
  return match ? match[1]!.trim() : null;
}

