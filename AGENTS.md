# AGENTS.md — Necro-MUD

## Project Context
See `.kiro/steering/` for full documentation:
- [`.kiro/steering/product.md`](.kiro/steering/product.md) — Vision, lore mechanics, GitHub-to-dungeon mapping
- [`.kiro/steering/tech.md`](.kiro/steering/tech.md) — Full tech stack and architectural constraints
- [`.kiro/steering/structure.md`](.kiro/steering/structure.md) — Monorepo layout, naming conventions, parallel workflow

## Strict Aesthetic Rules

### 1. ANSI Palette — 16 Colors Only
All terminal output MUST use the standard VGA 16-color palette (ANSI colors 0–15).
No 256-color mode. No truecolor (24-bit). No RGB escape sequences.

```
 0 Black        8 Bright Black (Gray)
 1 Red          9 Bright Red
 2 Green       10 Bright Green
 3 Yellow      11 Bright Yellow
 4 Blue        12 Bright Blue
 5 Magenta     13 Bright Magenta
 6 Cyan        14 Bright Cyan
 7 White       15 Bright White
```

### 2. CP437 Box-Drawing Characters
All borders, frames, and decorative elements MUST use CP437-compatible Unicode:
- Double-line: `═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬`
- Single-line: `─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼`
- Blocks: `█ ▓ ▒ ░`
- Symbols: `☠ † ◆ ♥ ♦ ♠ ♣ ★ ► ◄ ▲ ▼ · •`

### 3. 80×24 Terminal Grid
All rendered output MUST fit within an 80-column terminal width.
Vertical output should be mindful of the 24-line visible area.

### 4. Zero-Dependency Bloat
Do NOT add:
- lodash, underscore, ramda, or any general-purpose utility library
- moment, dayjs, or date-fns (use `Date` and `Intl`)
- axios (use native `fetch`)
- Any CSS framework beyond TailwindCSS
- Any React UI component library

### 5. ANSI Escape Sequences Only
Terminal output uses ANSI escape codes (`\x1b[...m`).
No HTML tags in terminal strings. No markdown in terminal strings.

### 6. Import Discipline
```
shared → (imports nothing)
server → imports from @necro-mud/shared ONLY
client → imports from @necro-mud/shared ONLY
server ✗→ client (NEVER)
client ✗→ server (NEVER)
```

### 7. File Naming
- Files: `kebab-case.ts`
- Types/Interfaces: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

### 8. Combat Narration Hooks
The combat engine in `server/src/engine/combat.ts` exposes a `CombatNarrationHook` type.
When implementing new combat features, always use this hook pattern rather than hardcoding
narration text, so the LLM Dungeon Master narrator can be layered in later.

