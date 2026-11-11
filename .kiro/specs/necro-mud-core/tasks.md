---
description: "Necro-MUD implementation task checklist by wave"
---

# Necro-MUD Core — Implementation Tasks

## Wave 1 — Core Scaffold & Shared Types
Foundation layer. Must complete before Wave 2 or Wave 3.

- [x] 1.1 Create root `package.json` with npm workspaces (`shared`, `server`, `client`)
- [x] 1.2 Create `tsconfig.base.json` with shared compiler options
- [x] 1.3 Create `.gitignore` (preserves `.kiro/` with `!.kiro/`)
- [x] 1.4 Create `shared/package.json` and `shared/tsconfig.json` (composite, ESM)
- [x] 1.5 Define `Room` and `RoomExit` interfaces (`shared/src/types/room.ts`)
- [x] 1.6 Define `Monster`, `MonsterOrigin`, `MonsterTier` interfaces (`shared/src/types/monster.ts`)
- [x] 1.7 Define `Player` interface (`shared/src/types/player.ts`)
- [x] 1.8 Define `CommandPacket` and `CommandType` (`shared/src/types/commands.ts`)
- [x] 1.9 Define `ServerEventPacket`, `ServerEventType`, `CombatResultPayload` (`shared/src/types/events.ts`)
- [x] 1.10 Define `AnsiColor` enum, `FG`/`BG` maps, `CP437` constants (`shared/src/types/ansi.ts`)
- [x] 1.11 Create `VGA_PALETTE` and `VGA_THEME` for XTerm.js (`shared/src/constants/ansi-palette.ts`)
- [x] 1.12 Create barrel export `shared/src/index.ts`
- [x] 1.13 Create `.kiro/steering/product.md` (vision, lore, mapping)
- [x] 1.14 Create `.kiro/steering/tech.md` (full tech stack)
- [x] 1.15 Create `.kiro/steering/structure.md` (monorepo layout, Zabdiel+Samkiel ownership)
- [x] 1.16 Create `.kiro/specs/necro-mud-core/requirements.md` (EARS notation)
- [x] 1.17 Create `.kiro/specs/necro-mud-core/design.md` (architecture, state machine, protocol)
- [x] 1.18 Create `.kiro/specs/necro-mud-core/tasks.md` (this file)
- [x] 1.19 Create `.kiro/hooks/lint-and-typecheck.json`
- [x] 1.20 Create `.kiro/hooks/sync-spec-types.json`
- [x] 1.21 Create `AGENTS.md` (agent rules, aesthetic constraints)

## Wave 2 — Retro CRT Client & ANSI Renderer
Frontend — owned primarily by **Zabdiel**.

- [x] 2.1 Create `client/package.json` with Next.js 15, React 19, XTerm.js, Tailwind 4
- [x] 2.2 Create `client/tsconfig.json` extending base config
- [x] 2.3 Create `client/next.config.ts` (transpile @necro-mud/shared)
- [x] 2.4 Create `client/tailwind.config.ts` (CRT color extensions)
- [x] 2.5 Create `client/postcss.config.mjs` (@tailwindcss/postcss)
- [x] 2.6 Create `client/src/app/globals.css` (Tailwind import, scanlines, phosphor glow, flicker)
- [x] 2.7 Create `client/src/app/layout.tsx` (root layout, dark theme, monospace font)
- [x] 2.8 Create `client/src/app/page.tsx` (compose CRT bezel + terminal, dynamic import ssr:false)
- [x] 2.9 Create `CrtBezel.tsx` component (CRT monitor frame, power LED, label)
- [x] 2.10 Create `Terminal.tsx` component (XTerm.js + WebSocket client + reconnection)
- [x] 2.11 Create `BootSequence.tsx` component (modem dial-up animation, AT commands)
- [x] 2.12 Build procedural WebAudio `RetroSoundEngine` (`client/src/app/lib/sound-engine.ts`) with modem handshake, mechanical keystrokes, degauss thump, 8-bit event SFX, and 60Hz CRT hum
- [x] 2.13 Upgrade `CrtBezel.tsx` & `globals.css` with 4 phosphor modes (`P1-GRN`, `P3-AMB`, `BLOOD`, `VGA-16`), 900ms degauss warp animation, cathode power collapse, and scanline/flicker intensity toggles
- [x] 2.14 Build collapsible `TacticalHud.tsx` hardware deck (live vitals LEDs, monster target selector, macro keycaps, and repo loader bar)

## Wave 3 — MUD Engine, GitHub Repo Parser & AI Dungeon Master
Backend — owned primarily by **Samkiel**.

- [x] 3.1 Create `server/package.json` with Express 5, ws, tsx
- [x] 3.2 Create `server/tsconfig.json` extending base config
- [x] 3.3 Create `server/src/index.ts` (Express + ws on port 4000)
- [x] 3.4 Create WebSocket connection handler (`server/src/ws/handler.ts`)
- [x] 3.5 Create `DungeonState` class (`server/src/engine/dungeon.ts`)
- [x] 3.6 Create deterministic combat engine with narration hooks (`server/src/engine/combat.ts`)
- [x] 3.7 Create mock GitHub repo-to-dungeon generator (`server/src/engine/github-parser.ts`)
- [x] 3.8 Create command parser and executors (`server/src/commands/parser.ts`)
- [x] 3.9 Create ANSI renderer with CP437 box drawing (`server/src/ansi/renderer.ts`)
- [x] 3.10 Create ASCII art welcome banner (`server/src/ansi/banner.ts`)
- [x] 3.11 Create `README.md` with overview, architecture, and quickstart

## Wave 3+ — Future Enhancements (Post-Scaffold)

- [ ] 3+.1 Live GitHub REST/Octokit integration (replace mock parser)
- [ ] 3+.2 LLM-powered AI Dungeon Master narrator (plug into CombatNarrationHook)
- [ ] 3+.3 PATCH command implementation (resolve issues via game actions)
- [ ] 3+.4 CAST command implementation (commit scrolls as spells)
- [ ] 3+.5 Raw Telnet bridge (`net.createServer` on port 2323)
- [x] 3+.6 WebAudio 8-bit chiptune and modem SFX synthesis
- [ ] 3+.7 Player persistence (save/load state)
- [ ] 3+.8 Leaderboard and XP ranking system

