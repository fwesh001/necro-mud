/**
 * Welcome Banner — ANSI Art
 *
 * Displayed when the server starts and when players connect.
 * Uses CP437 box-drawing characters and 16-color VGA palette only.
 */

import { FG, RESET, BOLD, DIM, AnsiColor, CP437 } from '@necro-mud/shared';

const INNER_WIDTH = 56;

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function frameLine(content: string): string {
  const C = FG[AnsiColor.BrightCyan];
  const visible = stripAnsi(content).length;
  const pad = Math.max(0, INNER_WIDTH - visible);
  return `${C}${CP437.DOUBLE_VERTICAL}${RESET}${content}${' '.repeat(pad)}${C}${CP437.DOUBLE_VERTICAL}${RESET}`;
}

export function getWelcomeBanner(): string {
  const G = FG[AnsiColor.BrightGreen];
  const R = FG[AnsiColor.BrightRed];
  const Y = FG[AnsiColor.BrightYellow];
  const C = FG[AnsiColor.BrightCyan];
  const M = FG[AnsiColor.BrightMagenta];
  const W = FG[AnsiColor.BrightWhite];
  const D = DIM;

  return [
    '',
    `${C}${CP437.DOUBLE_TOP_LEFT}${CP437.DOUBLE_HORIZONTAL.repeat(INNER_WIDTH)}${CP437.DOUBLE_TOP_RIGHT}${RESET}`,
    frameLine(`  ${G}${BOLD}███╗   ██╗███████╗ ██████╗██████╗  ██████╗ ${RESET}`),
    frameLine(`  ${G}████╗  ██║██╔════╝██╔════╝██╔══██╗██╔═══██╗${RESET}`),
    frameLine(`  ${G}██╔██╗ ██║█████╗  ██║     ██████╔╝██║   ██║${RESET}`),
    frameLine(`  ${G}██║╚██╗██║██╔══╝  ██║     ██╔══██╗██║   ██║${RESET}`),
    frameLine(`  ${G}██║ ╚████║███████╗╚██████╗██║  ██║╚██████╔╝${RESET}`),
    frameLine(`  ${G}╚═╝  ╚═══╝╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ${RESET}`),
    frameLine(`             ${Y}${BOLD}${CP437.DOUBLE_HORIZONTAL.repeat(3)} M ${CP437.DOT} U ${CP437.DOT} D ${CP437.DOUBLE_HORIZONTAL.repeat(3)}${RESET}`),
    frameLine(''),
    frameLine(`  ${R}${CP437.SKULL}${RESET} ${W}Your Repository Is Your Dungeon${RESET} ${R}${CP437.SKULL}${RESET}`),
    frameLine(''),
    frameLine(`  ${D}Kiroween 2026 Hackathon${RESET}`),
    frameLine(`  ${D}Resurrection + Costume Contest${RESET}`),
    frameLine(`  ${M}By Zabdiel & Samkiel${RESET}`),
    `${C}${CP437.DOUBLE_BOTTOM_LEFT}${CP437.DOUBLE_HORIZONTAL.repeat(INNER_WIDTH)}${CP437.DOUBLE_BOTTOM_RIGHT}${RESET}`,
    '',
  ].join('\r\n');
}
