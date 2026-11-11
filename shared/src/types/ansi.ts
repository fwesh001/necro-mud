/**
 * ANSI Color & CP437 Box-Drawing Constants
 *
 * Necro-MUD enforces a strict 16-color VGA palette (colors 0–15).
 * All terminal output MUST use these colors only — no 256-color or truecolor.
 * Box-drawing uses CP437-compatible Unicode characters.
 */

/** Standard 16-color VGA/ANSI palette indices */
export enum AnsiColor {
  Black        = 0,
  Red          = 1,
  Green        = 2,
  Yellow       = 3,
  Blue         = 4,
  Magenta      = 5,
  Cyan         = 6,
  White        = 7,
  BrightBlack  = 8,
  BrightRed    = 9,
  BrightGreen  = 10,
  BrightYellow = 11,
  BrightBlue   = 12,
  BrightMagenta = 13,
  BrightCyan   = 14,
  BrightWhite  = 15,
}

/** ANSI SGR escape code helpers — foreground colors */
export const FG: Record<AnsiColor, string> = {
  [AnsiColor.Black]:         '\x1b[30m',
  [AnsiColor.Red]:           '\x1b[31m',
  [AnsiColor.Green]:         '\x1b[32m',
  [AnsiColor.Yellow]:        '\x1b[33m',
  [AnsiColor.Blue]:          '\x1b[34m',
  [AnsiColor.Magenta]:       '\x1b[35m',
  [AnsiColor.Cyan]:          '\x1b[36m',
  [AnsiColor.White]:         '\x1b[37m',
  [AnsiColor.BrightBlack]:   '\x1b[90m',
  [AnsiColor.BrightRed]:     '\x1b[91m',
  [AnsiColor.BrightGreen]:   '\x1b[92m',
  [AnsiColor.BrightYellow]:  '\x1b[93m',
  [AnsiColor.BrightBlue]:    '\x1b[94m',
  [AnsiColor.BrightMagenta]: '\x1b[95m',
  [AnsiColor.BrightCyan]:    '\x1b[96m',
  [AnsiColor.BrightWhite]:   '\x1b[97m',
};

/** ANSI SGR escape code helpers — background colors */
export const BG: Record<AnsiColor, string> = {
  [AnsiColor.Black]:         '\x1b[40m',
  [AnsiColor.Red]:           '\x1b[41m',
  [AnsiColor.Green]:         '\x1b[42m',
  [AnsiColor.Yellow]:        '\x1b[43m',
  [AnsiColor.Blue]:          '\x1b[44m',
  [AnsiColor.Magenta]:       '\x1b[45m',
  [AnsiColor.Cyan]:          '\x1b[46m',
  [AnsiColor.White]:         '\x1b[47m',
  [AnsiColor.BrightBlack]:   '\x1b[100m',
  [AnsiColor.BrightRed]:     '\x1b[101m',
  [AnsiColor.BrightGreen]:   '\x1b[102m',
  [AnsiColor.BrightYellow]:  '\x1b[103m',
  [AnsiColor.BrightBlue]:    '\x1b[104m',
  [AnsiColor.BrightMagenta]: '\x1b[105m',
  [AnsiColor.BrightCyan]:    '\x1b[106m',
  [AnsiColor.BrightWhite]:   '\x1b[107m',
};

/** ANSI reset code */
export const RESET = '\x1b[0m';

/** ANSI bold */
export const BOLD = '\x1b[1m';

/** ANSI dim */
export const DIM = '\x1b[2m';

/** CP437-compatible box-drawing and special characters */
export const CP437 = {
  // Double-line box drawing
  DOUBLE_HORIZONTAL:    '═',
  DOUBLE_VERTICAL:      '║',
  DOUBLE_TOP_LEFT:      '╔',
  DOUBLE_TOP_RIGHT:     '╗',
  DOUBLE_BOTTOM_LEFT:   '╚',
  DOUBLE_BOTTOM_RIGHT:  '╝',
  DOUBLE_T_LEFT:        '╠',
  DOUBLE_T_RIGHT:       '╣',
  DOUBLE_T_TOP:         '╦',
  DOUBLE_T_BOTTOM:      '╩',
  DOUBLE_CROSS:         '╬',

  // Single-line box drawing
  SINGLE_HORIZONTAL:    '─',
  SINGLE_VERTICAL:      '│',
  SINGLE_TOP_LEFT:      '┌',
  SINGLE_TOP_RIGHT:     '┐',
  SINGLE_BOTTOM_LEFT:   '└',
  SINGLE_BOTTOM_RIGHT:  '┘',
  SINGLE_T_LEFT:        '├',
  SINGLE_T_RIGHT:       '┤',
  SINGLE_T_TOP:         '┬',
  SINGLE_T_BOTTOM:      '┴',
  CROSS:                '┼',

  // Block elements
  BLOCK_FULL:           '█',
  BLOCK_DARK:           '▓',
  BLOCK_MEDIUM:         '▒',
  BLOCK_LIGHT:          '░',

  // Game symbols
  SKULL:                '☠',
  SWORD:                '†',
  SHIELD:               '◆',
  HEART:                '♥',
  DIAMOND:              '♦',
  SPADE:                '♠',
  CLUB:                 '♣',
  STAR:                 '★',
  ARROW_RIGHT:          '►',
  ARROW_LEFT:           '◄',
  ARROW_UP:             '▲',
  ARROW_DOWN:           '▼',
  DOT:                  '·',
  BULLET:               '•',
} as const;

