/**
 * Standard VGA 16-Color Palette
 * Maps AnsiColor enum values → hex RGB strings.
 * Used by the client CRT renderer for accurate phosphor emulation.
 */

import { AnsiColor } from '../types/ansi.js';

/** Hex RGB values for the standard VGA 16-color palette */
export const VGA_PALETTE: Record<AnsiColor, string> = {
  [AnsiColor.Black]:         '#000000',
  [AnsiColor.Red]:           '#AA0000',
  [AnsiColor.Green]:         '#00AA00',
  [AnsiColor.Yellow]:        '#AA5500',
  [AnsiColor.Blue]:          '#0000AA',
  [AnsiColor.Magenta]:       '#AA00AA',
  [AnsiColor.Cyan]:          '#00AAAA',
  [AnsiColor.White]:         '#AAAAAA',
  [AnsiColor.BrightBlack]:   '#555555',
  [AnsiColor.BrightRed]:     '#FF5555',
  [AnsiColor.BrightGreen]:   '#55FF55',
  [AnsiColor.BrightYellow]:  '#FFFF55',
  [AnsiColor.BrightBlue]:    '#5555FF',
  [AnsiColor.BrightMagenta]: '#FF55FF',
  [AnsiColor.BrightCyan]:    '#55FFFF',
  [AnsiColor.BrightWhite]:   '#FFFFFF',
};

/**
 * XTerm.js ITheme object using the VGA palette.
 * Pass this directly to `new Terminal({ theme: VGA_THEME })`.
 */
export const VGA_THEME = {
  background:    VGA_PALETTE[AnsiColor.Black],
  foreground:    VGA_PALETTE[AnsiColor.White],
  cursor:        VGA_PALETTE[AnsiColor.BrightGreen],
  cursorAccent:  VGA_PALETTE[AnsiColor.Black],
  selectionBackground: 'rgba(85, 255, 85, 0.3)',

  black:         VGA_PALETTE[AnsiColor.Black],
  red:           VGA_PALETTE[AnsiColor.Red],
  green:         VGA_PALETTE[AnsiColor.Green],
  yellow:        VGA_PALETTE[AnsiColor.Yellow],
  blue:          VGA_PALETTE[AnsiColor.Blue],
  magenta:       VGA_PALETTE[AnsiColor.Magenta],
  cyan:          VGA_PALETTE[AnsiColor.Cyan],
  white:         VGA_PALETTE[AnsiColor.White],

  brightBlack:   VGA_PALETTE[AnsiColor.BrightBlack],
  brightRed:     VGA_PALETTE[AnsiColor.BrightRed],
  brightGreen:   VGA_PALETTE[AnsiColor.BrightGreen],
  brightYellow:  VGA_PALETTE[AnsiColor.BrightYellow],
  brightBlue:    VGA_PALETTE[AnsiColor.BrightBlue],
  brightMagenta: VGA_PALETTE[AnsiColor.BrightMagenta],
  brightCyan:    VGA_PALETTE[AnsiColor.BrightCyan],
  brightWhite:   VGA_PALETTE[AnsiColor.BrightWhite],
} as const;

