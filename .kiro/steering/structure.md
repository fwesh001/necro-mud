---
inclusion: always
description: "Necro-MUD monorepo layout, naming conventions, and two-developer parallel workflow"
---

# Necro-MUD — Project Structure & Conventions

## Monorepo Layout

```
necro-mud/
├── .kiro/                   # Kiro IDE specs, steering, hooks (DO NOT gitignore)
│   ├── steering/            # Product, tech, and structure docs
│   ├── specs/               # Feature specs (requirements → design → tasks)
│   └── hooks/               # Event-driven automation triggers
├── shared/                  # @necro-mud/shared — types & constants (ZERO deps)
│   ├── src/types/           # TypeScript interfaces and enums
│   └── src/constants/       # VGA palette, game constants
├── server/                  # @necro-mud/server — MUD engine + WebSocket
│   └── src/
│       ├── ws/              # WebSocket connection handlers
│       ├── engine/          # Dungeon state, combat, GitHub parser
│       ├── commands/        # Command parser and executors
│       └── ansi/            # ANSI renderer and ASCII art
├── client/                  # @necro-mud/client — Next.js CRT terminal
│   └── src/app/
│       └── components/      # CRT bezel, terminal, boot sequence
├── AGENTS.md                # AI agent instructions
├── README.md                # Project overview and quickstart
├── package.json             # Root workspace manifest
├── tsconfig.base.json       # Shared TypeScript config
└── .gitignore               # Preserves .kiro/
```

## Developer Ownership

### Two-Developer Parallel Workflow

| Developer   | Owns                           | Primary Directories              | Branch Prefix       |
|:------------|:-------------------------------|:---------------------------------|:--------------------|
| **Zabdiel** | Frontend, CRT aesthetics,      | `client/`                        | `feat/client-*`     |
|             | Xterm.js, Audio, Boot sequence |                                  |                     |
| **Samkiel** | MUD Engine, WebSocket state,   | `server/`, `shared/`             | `feat/server-*`     |
|             | GitHub Parser, Combat engine   |                                  | `feat/shared-*`     |

### Shared Ownership (Both)
- `.kiro/` — specs and steering documents
- `AGENTS.md`, `README.md` — project-level docs
- Root `package.json`, `tsconfig.base.json` — workspace config

### Conflict-Free Parallel Work Rules
1. **Zabdiel** works exclusively in `client/` — never modifies `server/src/`
2. **Samkiel** works in `server/` and `shared/` — never modifies `client/src/`
3. Changes to `shared/` types require a brief sync message to Zabdiel (since client imports shared)
4. Both developers may update `.kiro/specs/` and root docs
5. PRs should target `main` from feature branches, reviewed by the other developer

## Naming Conventions

| Artifact            | Convention         | Example                        |
|:--------------------|:-------------------|:-------------------------------|
| Files               | `kebab-case`       | `github-parser.ts`             |
| Directories         | `kebab-case`       | `src/engine/`                  |
| TypeScript types    | `PascalCase`       | `MonsterOrigin`, `RoomExit`    |
| TypeScript enums    | `PascalCase`       | `AnsiColor`                    |
| Functions           | `camelCase`        | `renderBox()`, `executeCombat()`|
| Constants           | `UPPER_SNAKE_CASE` | `CP437`, `VGA_PALETTE`         |
| CSS classes         | `kebab-case`       | `.crt-scanlines`               |
| npm packages        | `@necro-mud/scope` | `@necro-mud/shared`            |

## Import Rules

```
shared ──→ (imports nothing — leaf package)
server ──→ imports from @necro-mud/shared only
client ──→ imports from @necro-mud/shared only
server ✗──→ client  (NEVER)
client ✗──→ server  (NEVER)
```

## Branch Strategy

```
main ← feat/client-crt-bezel     (Zabdiel)
     ← feat/client-boot-sequence (Zabdiel)
     ← feat/client-crt-costume   (Zabdiel)
     ← feat/server-github-ai     (Samkiel)
     ← feat/shared-event-types   (Samkiel)
     ← fix/client-ssr-hydration  (Zabdiel)
     ← fix/server-ws-broadcast   (Samkiel)
```

## Build Order
Dependencies must be built in order:
1. `shared` (no dependencies)
2. `server` (depends on shared)
3. `client` (depends on shared)

The root `npm run build` script enforces this order.

