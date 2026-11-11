---
inclusion: always
description: "Necro-MUD technology stack, dependencies, and architectural constraints"
---

# Necro-MUD — Technology Stack

## Overview
Necro-MUD is a TypeScript monorepo with three workspaces managed by **npm workspaces**.

## Frontend (`/client`)

| Technology            | Version  | Purpose                                               |
|:----------------------|:---------|:------------------------------------------------------|
| Next.js               | 15.x     | App Router, SSR-safe dynamic imports, static export   |
| TypeScript            | 5.7+     | Strict mode, full type safety                         |
| TailwindCSS           | 4.x      | Utility-first CSS for CRT bezel and layout            |
| @xterm/xterm          | 5.5+     | Authentic ANSI/CP437 terminal rendering               |
| @xterm/addon-fit      | 0.10+    | Auto-resize terminal to container                     |
| WebAudio API          | native   | 8-bit chiptune, modem dial-up SFX synthesis           |
| CSS Custom Properties | native   | CRT scanline overlay, phosphor glow, flicker effects  |

### Client Architecture
- `'use client'` components for all terminal/interactive elements
- XTerm.js loaded via `next/dynamic` with `ssr: false` to prevent `window is not defined` errors
- WebSocket client with exponential-backoff reconnection
- Pure CSS CRT effects (scanlines, phosphor glow, screen curvature) — no WebGL dependencies in scaffold

## Backend (`/server`)

| Technology  | Version | Purpose                                                |
|:------------|:--------|:-------------------------------------------------------|
| Node.js     | 20+     | Runtime (tested on v24)                                |
| TypeScript  | 5.7+    | Strict mode                                            |
| Express     | 5.x     | HTTP health check endpoints                            |
| ws          | 8.18+   | WebSocket server for multiplayer terminal sessions     |
| tsx         | 4.19+   | Development server with watch mode                     |

### Server Architecture
- Express + `ws` sharing a single `http.Server` on port 4000
- `WebSocketServer` handles simultaneous multiplayer sessions
- Stateful `DungeonState` class manages rooms, monsters, and players in memory
- Deterministic combat engine with narration hooks for future LLM Dungeon Master
- Mock GitHub repo-to-dungeon generator (schema ready for live Octokit integration)

### Future: GitHub Integration (Wave 3)
- GitHub REST API via Octokit
- `GITHUB_TOKEN` environment variable for authenticated access
- Repository tree → room graph generation
- Issue/PR → monster/ritual generation
- CI check status → trap/curse generation

## Shared (`/shared`)

| Export                   | Purpose                                      |
|:-------------------------|:---------------------------------------------|
| `Room`, `RoomExit`       | Dungeon room and navigation types            |
| `Monster`, `MonsterTier` | Enemy entity types                           |
| `Player`                 | Connected player types                       |
| `CommandPacket`          | Client → server command message              |
| `ServerEventPacket`      | Server → client event message                |
| `AnsiColor`, `FG`, `BG`  | 16-color VGA ANSI escape codes               |
| `CP437`                  | Box-drawing and special character constants   |
| `VGA_PALETTE`, `VGA_THEME`| Hex color palette and XTerm.js theme object  |

### Shared Constraints
- **Zero runtime dependencies** — types and constants only
- **ESM-only** (`"type": "module"`)
- **Composite TypeScript project** — builds to `dist/` with declarations

## Tooling

| Tool            | Purpose                                       |
|:----------------|:----------------------------------------------|
| npm workspaces  | Monorepo dependency management                |
| TypeScript      | Project references with `tsc -b`              |
| concurrently    | Run server + client dev servers in parallel    |
| tsconfig.base   | Shared compiler options                       |

## Constraints
1. **16-color VGA palette only** — no 256-color or truecolor ANSI
2. **CP437 box-drawing characters** — `═║╔╗╚╝─│┌┐└┘` etc.
3. **80×24 terminal grid** — all output must fit an 80-column display
4. **Zero-dependency bloat** — no lodash, moment, ramda, or equivalent utility belts
5. **ANSI escape sequences only** — no HTML rendering in terminal output

