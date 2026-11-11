/**
 * ANSI Renderer
 *
 * Builds ANSI escape-code formatted text frames for the terminal.
 * All output is 80-column compatible and uses only the VGA 16-color palette.
 */

import type { Room, Monster, Player, CombatResultPayload } from '@necro-mud/shared';
import { CP437, FG, RESET, BOLD, DIM, AnsiColor } from '@necro-mud/shared';
import { computePlayerTitle } from '../engine/persistence.js';

const WIDTH = 78; // Total box width including borders (fits cleanly in 80-col grid)

/** Strip ANSI SGR escape sequences to measure visible character width */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Word-wrap text (plain or ANSI-formatted) to a maximum visible width */
function wrapText(text: string, maxWidth: number): string[] {
  const output: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const visibleLen = stripAnsi(rawLine).length;
    if (visibleLen <= maxWidth) {
      output.push(rawLine);
      continue;
    }

    // Split line into words and whitespace tokens
    const tokens = rawLine.split(/(\s+)/);
    let currentLine = '';
    let currentVisible = 0;

    for (const token of tokens) {
      if (!token) continue;
      const tokenVisible = stripAnsi(token).length;

      // If token itself is longer than maxWidth (e.g. huge URL), slice it
      if (tokenVisible > maxWidth) {
        if (currentLine.length > 0) {
          output.push(currentLine);
          currentLine = '';
          currentVisible = 0;
        }
        let remaining = token;
        while (stripAnsi(remaining).length > maxWidth) {
          output.push(remaining.slice(0, maxWidth));
          remaining = remaining.slice(maxWidth);
        }
        currentLine = remaining;
        currentVisible = stripAnsi(remaining).length;
        continue;
      }

      if (currentVisible + tokenVisible <= maxWidth) {
        currentLine += token;
        currentVisible += tokenVisible;
      } else {
        if (currentLine.trim().length > 0) {
          output.push(currentLine);
          currentLine = token.startsWith(' ') ? token.trimStart() : token;
          currentVisible = stripAnsi(currentLine).length;
        } else {
          currentLine += token;
          currentVisible += tokenVisible;
        }
      }
    }

    if (currentLine.length > 0) {
      output.push(currentLine);
    }
  }

  return output;
}

// ── Box Drawing ───────────────────────────────────────────────────

/**
 * Render a titled box with CP437 double-line borders, 80-column safe.
 */
export function renderBox(title: string, content: string, width: number = WIDTH): string {
  const innerWidth = width - 2; // space between left ║ and right ║
  const contentWidth = innerWidth - 2; // 1 space padding left & right

  const rawTitle = ` ${title} `;
  const truncatedTitle = rawTitle.length > innerWidth ? rawTitle.slice(0, innerWidth) : rawTitle;
  const titlePad = Math.max(0, innerWidth - truncatedTitle.length);
  const leftPad = Math.floor(titlePad / 2);
  const rightPad = titlePad - leftPad;

  const lines: string[] = [];

  // Top border with centered title
  lines.push(
    `${FG[AnsiColor.BrightCyan]}${CP437.DOUBLE_TOP_LEFT}` +
    CP437.DOUBLE_HORIZONTAL.repeat(leftPad) +
    `${FG[AnsiColor.BrightYellow]}${BOLD}${truncatedTitle}${RESET}${FG[AnsiColor.BrightCyan]}` +
    CP437.DOUBLE_HORIZONTAL.repeat(rightPad) +
    `${CP437.DOUBLE_TOP_RIGHT}${RESET}`
  );

  // Content lines padded with right border
  for (const line of wrapText(content, contentWidth)) {
    const visibleLen = stripAnsi(line).length;
    const padRight = Math.max(0, contentWidth - visibleLen);
    lines.push(
      `${FG[AnsiColor.BrightCyan]}${CP437.DOUBLE_VERTICAL}${RESET} ` +
      line +
      `${RESET}${' '.repeat(padRight)} ` +
      `${FG[AnsiColor.BrightCyan]}${CP437.DOUBLE_VERTICAL}${RESET}`
    );
  }

  // Bottom border
  lines.push(
    `${FG[AnsiColor.BrightCyan]}${CP437.DOUBLE_BOTTOM_LEFT}` +
    CP437.DOUBLE_HORIZONTAL.repeat(innerWidth) +
    `${CP437.DOUBLE_BOTTOM_RIGHT}${RESET}`
  );

  return lines.join('\r\n');
}

// ── Room Description ──────────────────────────────────────────────

/**
 * Render a full room description with exits, monsters, and other players.
 */
export function renderRoomDescription(
  room: Room,
  monsters: Monster[],
  otherPlayers: Player[],
): string {
  const sections: string[] = [];

  // Room name and description
  sections.push(`${BOLD}${FG[AnsiColor.BrightGreen]}${room.name}${RESET}`);
  for (const wrapped of wrapText(room.description, WIDTH - 4)) {
    sections.push(`${FG[AnsiColor.White]}${wrapped}${RESET}`);
  }

  if (room.filePath) {
    sections.push(`${DIM}${FG[AnsiColor.BrightBlack]}[${room.filePath}]${RESET}`);
  }

  sections.push('');

  // Exits
  const exitList = room.exits
    .map(e => {
      const lockIcon = e.locked ? ` ${FG[AnsiColor.Red]}[LOCKED]${RESET}` : '';
      return `  ${FG[AnsiColor.BrightCyan]}${CP437.ARROW_RIGHT}${RESET} ${FG[AnsiColor.BrightWhite]}${e.direction}${RESET}${lockIcon}`;
    })
    .join('\r\n');
  sections.push(`${FG[AnsiColor.Yellow]}Exits:${RESET}`);
  sections.push(exitList);

  // Monsters
  if (monsters.length > 0) {
    sections.push('');
    sections.push(`${FG[AnsiColor.BrightRed]}${CP437.SKULL} Monsters:${RESET}`);
    for (const m of monsters) {
      const tierColor = m.tier === 'boss' ? AnsiColor.BrightMagenta
        : m.tier === 'elite' ? AnsiColor.BrightYellow
        : AnsiColor.Red;
      const hpBar = renderHpBar(m.hp, m.maxHp, 10);
      sections.push(
        `  ${FG[tierColor]}${CP437.SWORD} ${m.name}${RESET} ` +
        `${DIM}[${m.tier.toUpperCase()}]${RESET} ` +
        hpBar
      );
    }
  }

  // Other players
  if (otherPlayers.length > 0) {
    sections.push('');
    sections.push(`${FG[AnsiColor.BrightGreen]}${CP437.STAR} Adventurers here:${RESET}`);
    for (const p of otherPlayers) {
      sections.push(`  ${FG[AnsiColor.Cyan]}${CP437.BULLET} ${p.name}${RESET}`);
    }
  }

  return '\r\n' + renderBox(room.name, sections.join('\r\n')) + '\r\n';
}

// ── Combat Result ─────────────────────────────────────────────────

export function renderCombatResult(result: CombatResultPayload): string {
  const lines: string[] = [];

  lines.push(`${BOLD}${FG[AnsiColor.BrightRed]}${CP437.SWORD} COMBAT ${CP437.SWORD}${RESET}`);
  lines.push('');

  if (result.damageDealt > 0) {
    lines.push(`${FG[AnsiColor.BrightGreen]}${CP437.SWORD} You strike ${result.targetName} for ${FG[AnsiColor.BrightWhite]}${result.damageDealt}${FG[AnsiColor.BrightGreen]} damage!${RESET}`);
  } else {
    lines.push(`${FG[AnsiColor.Yellow]}Your attack glances off ${result.targetName}'s defenses!${RESET}`);
  }

  if (result.damageReceived > 0) {
    lines.push(`${FG[AnsiColor.BrightRed]}${CP437.SKULL} ${result.targetName} retaliates for ${FG[AnsiColor.BrightWhite]}${result.damageReceived}${FG[AnsiColor.BrightRed]} damage!${RESET}`);
  } else if (!result.targetSlain) {
    lines.push(`${FG[AnsiColor.Green]}${result.targetName}'s counterattack misses!${RESET}`);
  }

  if (result.targetSlain) {
    lines.push('');
    lines.push(`${BOLD}${FG[AnsiColor.BrightYellow]}${CP437.SKULL} ${result.targetName} has been VANQUISHED! ${CP437.SKULL}${RESET}`);
  }

  lines.push('');
  lines.push(
    `${FG[AnsiColor.Green]}Your HP: ${RESET}` +
    renderHpBar(result.attackerHp, result.attackerMaxHp, 15) +
    `  ${FG[AnsiColor.Red]}${result.targetName}: ${RESET}` +
    renderHpBar(result.targetHp, result.targetMaxHp, 15)
  );

  return '\r\n' + renderBox('COMBAT', lines.join('\r\n')) + '\r\n';
}

// ── Status View ───────────────────────────────────────────────────

export function renderStatusView(player: Player): string {
  const lines: string[] = [];

  const title = player.title || computePlayerTitle(player.xp);
  lines.push(`${FG[AnsiColor.BrightCyan]}Name:${RESET}   ${player.name}  ${DIM}(${title})${RESET}`);
  lines.push(`${FG[AnsiColor.BrightGreen]}HP:${RESET}     ${renderHpBar(player.hp, player.maxHp, 20)} ${player.hp}/${player.maxHp}`);
  lines.push(`${FG[AnsiColor.BrightRed]}ATK:${RESET}    ${player.attack}`);
  lines.push(`${FG[AnsiColor.BrightBlue]}DEF:${RESET}    ${player.defense}`);
  lines.push(`${FG[AnsiColor.BrightYellow]}XP:${RESET}     ${player.xp}`);
  lines.push(`${FG[AnsiColor.Yellow]}Bugs:${RESET}   ${player.bugsSquashed ?? 0} squashed`);
  lines.push(`${FG[AnsiColor.BrightMagenta]}Room:${RESET}   ${player.currentRoomId}`);
  lines.push(`${FG[AnsiColor.White]}Items:${RESET}  ${player.inventory.length > 0 ? player.inventory.join(', ') : '(empty)'}`);

  return '\r\n' + renderBox('ADVENTURER STATUS', lines.join('\r\n')) + '\r\n';
}

// ── Map View ──────────────────────────────────────────────────────

export function renderMap(
  rooms: Room[],
  player: Player,
  aliveMonsterCounts?: Map<string, number>,
): string {
  const lines: string[] = [];

  lines.push(`${DIM}(${CP437.BLOCK_FULL} = you  ${CP437.BLOCK_MEDIUM} = visited  ${CP437.BLOCK_LIGHT} = undiscovered)${RESET}`);
  lines.push('');

  for (const room of rooms) {
    const isHere = player.currentRoomId === room.id;
    const visited = player.visitedRooms.includes(room.id);
    const monsterCount = aliveMonsterCounts
      ? (aliveMonsterCounts.get(room.id) ?? 0)
      : room.monsterIds.length;

    let icon: string;
    let nameColor: AnsiColor;

    if (isHere) {
      icon = `${FG[AnsiColor.BrightGreen]}${CP437.BLOCK_FULL}${RESET}`;
      nameColor = AnsiColor.BrightGreen;
    } else if (visited) {
      icon = `${FG[AnsiColor.White]}${CP437.BLOCK_MEDIUM}${RESET}`;
      nameColor = AnsiColor.White;
    } else {
      icon = `${FG[AnsiColor.BrightBlack]}${CP437.BLOCK_LIGHT}${RESET}`;
      nameColor = AnsiColor.BrightBlack;
    }

    const monsterIndicator = monsterCount > 0
      ? ` ${FG[AnsiColor.Red]}${CP437.SKULL}x${monsterCount}${RESET}`
      : '';

    const exits = room.exits.map(e => e.direction[0]!.toUpperCase()).join('');
    lines.push(
      `  ${icon} ${FG[nameColor]}${room.name}${RESET}` +
      ` ${DIM}[${exits}]${RESET}` +
      monsterIndicator
    );
  }

  return '\r\n' + renderBox('DUNGEON MAP', lines.join('\r\n')) + '\r\n';
}

// ── Help Text ─────────────────────────────────────────────────────

export function renderHelpText(): string {
  const commands = [
    ['HELP',              'Show this help message'],
    ['LOOK',              'Examine your surroundings'],
    ['MAP',               'View the dungeon map'],
    ['STATUS',            'Check your stats and inventory'],
    ['MOVE <dir>',        'Move (north/south/east/west or n/s/e/w)'],
    ['ATTACK <monster>',  'Attack a monster in the room'],
    ['SCAN <monster>',    'Deep inspection of GitHub origin & code snippet'],
    ['PATCH <monster>',   'Apply tactical bug-fixing patch to defect'],
    ['CAST <spell>',      'Cast commit scroll (HOTFIX/REFACTOR/ROLLBACK)'],
    ['REPO <owner/repo>', 'Hot-swap dungeon with a live GitHub repository'],
    ['TOP',               'View Hall of Fame XP leaderboard & rankings'],
    ['SAY <message>',     'Speak to other adventurers in the room'],
  ];

  const lines = commands.map(([cmd, desc]) =>
    `  ${FG[AnsiColor.BrightYellow]}${(cmd ?? '').padEnd(19)}${RESET} ${FG[AnsiColor.White]}${desc}${RESET}`
  );

  return '\r\n' + renderBox('COMMANDS', lines.join('\r\n')) + '\r\n';
}

// ── Leaderboard View ──────────────────────────────────────────────

export function renderLeaderboard(
  records: Array<{ name: string; xp: number; title: string; bugsSquashed?: number }>,
): string {
  const lines: string[] = [];

  lines.push(
    ` ${FG[AnsiColor.BrightYellow]}#  ${'HACKER'.padEnd(16)} ${'RANK / TITLE'.padEnd(24)} ${'XP'.padStart(6)} ${'BUGS'.padStart(6)}${RESET}`
  );
  lines.push(
    ` ${FG[AnsiColor.BrightBlack]}${CP437.SINGLE_HORIZONTAL.repeat(60)}${RESET}`
  );

  if (records.length === 0) {
    lines.push(`  ${FG[AnsiColor.White]}No adventurers recorded in the hall of fame yet.${RESET}`);
  } else {
    records.slice(0, 10).forEach((rec, idx) => {
      const rank = `${idx + 1}.`.padEnd(3);
      const name = rec.name.slice(0, 15).padEnd(16);
      const title = rec.title.slice(0, 23).padEnd(24);
      const xp = String(rec.xp).padStart(6);
      const bugs = String(rec.bugsSquashed ?? 0).padStart(6);

      const color =
        idx === 0
          ? AnsiColor.BrightYellow
          : idx === 1
          ? AnsiColor.BrightWhite
          : idx === 2
          ? AnsiColor.Yellow
          : AnsiColor.White;

      lines.push(
        ` ${FG[color]}${rank}${name}${title}${xp}${bugs}${RESET}`
      );
    });
  }

  return '\r\n' + renderBox('HALL OF FAME (TOP HACKERS)', lines.join('\r\n')) + '\r\n';
}

// ── Scan Result ───────────────────────────────────────────────────

export function renderScanResult(monster: Monster): string {
  const lines: string[] = [];

  const tierColor =
    monster.tier === 'boss'
      ? AnsiColor.BrightMagenta
      : monster.tier === 'elite'
      ? AnsiColor.BrightYellow
      : AnsiColor.Red;

  lines.push(`${FG[AnsiColor.BrightCyan]}Target:${RESET}   ${FG[tierColor]}${BOLD}${monster.name}${RESET}`);
  lines.push(`${FG[AnsiColor.BrightGreen]}Origin:${RESET}   ${monster.origin.toUpperCase()} ${DIM}[${monster.tier.toUpperCase()}]${RESET}`);
  lines.push(`${FG[AnsiColor.BrightYellow]}Vitals:${RESET}   HP ${monster.hp}/${monster.maxHp}  |  ATK ${monster.attack}  |  DEF ${monster.defense}`);

  if (monster.labels && monster.labels.length > 0) {
    lines.push(`${FG[AnsiColor.BrightMagenta]}Labels:${RESET}   ${monster.labels.join(', ')}`);
  }

  lines.push(`${FG[AnsiColor.White]}Source:${RESET}   ${monster.sourceRef}`);
  lines.push('');
  lines.push(`${FG[AnsiColor.White]}${monster.description}${RESET}`);

  if (monster.snippet) {
    lines.push('');
    lines.push(`${FG[AnsiColor.Yellow]}${CP437.DOUBLE_HORIZONTAL.repeat(4)} ARTIFACT BODY / SNIPPET ${CP437.DOUBLE_HORIZONTAL.repeat(4)}${RESET}`);
    lines.push(`${DIM}${FG[AnsiColor.BrightBlack]}${monster.snippet}${RESET}`);
  }

  return '\r\n' + renderBox('SCAN ANALYSIS', lines.join('\r\n')) + '\r\n';
}

// ── Patch Result ──────────────────────────────────────────────────

export function renderPatchResult(
  monster: Monster,
  damageDealt: number,
  solved: boolean,
  loot: string[],
  xpEarned: number,
): string {
  const lines: string[] = [];

  lines.push(`${BOLD}${FG[AnsiColor.BrightCyan]}${CP437.DIAMOND} PATCH COMPILATION ${CP437.DIAMOND}${RESET}`);
  lines.push('');

  if (damageDealt > 0) {
    lines.push(
      `${FG[AnsiColor.BrightGreen]}${CP437.STAR} Applied refactor patch to ${monster.name} dealing ${damageDealt} fix damage!${RESET}`
    );
  }

  if (solved) {
    lines.push('');
    lines.push(
      `${BOLD}${FG[AnsiColor.BrightYellow]}${CP437.STAR} DEFECT PERMANENTLY RESOLVED! (+${xpEarned} XP) ${CP437.STAR}${RESET}`
    );
    if (loot.length > 0) {
      lines.push(`${FG[AnsiColor.BrightMagenta]}Loot dropped: ${loot.join(', ')}${RESET}`);
    }
  } else {
    lines.push('');
    lines.push(
      `${FG[AnsiColor.Red]}${monster.name} remaining HP: ${monster.hp}/${monster.maxHp}${RESET}`
    );
  }

  return '\r\n' + renderBox('PATCH SYSTEM', lines.join('\r\n')) + '\r\n';
}

// ── Spell Result ──────────────────────────────────────────────────

export function renderSpellResult(
  spellName: string,
  message: string,
  hpHealed?: number,
  damageDealt?: number,
): string {
  const lines: string[] = [];

  lines.push(`${BOLD}${FG[AnsiColor.BrightMagenta]}${CP437.STAR} COMMIT SCROLL INVOCATION ${CP437.STAR}${RESET}`);
  lines.push('');
  lines.push(`${FG[AnsiColor.White]}${message}${RESET}`);

  if (hpHealed && hpHealed > 0) {
    lines.push('');
    lines.push(`${FG[AnsiColor.BrightGreen]}${CP437.HEART} Restored ${hpHealed} hit points.${RESET}`);
  }

  if (damageDealt && damageDealt > 0) {
    lines.push('');
    lines.push(`${FG[AnsiColor.BrightRed]}${CP437.SWORD} Dealt ${damageDealt} architectural purge damage.${RESET}`);
  }

  return '\r\n' + renderBox(`CAST ${spellName}`, lines.join('\r\n')) + '\r\n';
}

// ── Helpers ───────────────────────────────────────────────────────

function renderHpBar(current: number, max: number, width: number): string {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, Math.min(1, current / safeMax));
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  const color = ratio > 0.6 ? AnsiColor.BrightGreen
    : ratio > 0.3 ? AnsiColor.BrightYellow
    : AnsiColor.BrightRed;

  return (
    `${FG[AnsiColor.BrightBlack]}[${RESET}` +
    `${FG[color]}${CP437.BLOCK_FULL.repeat(filled)}${RESET}` +
    `${FG[AnsiColor.BrightBlack]}${CP437.BLOCK_LIGHT.repeat(empty)}${RESET}` +
    `${FG[AnsiColor.BrightBlack]}]${RESET}`
  );
}
