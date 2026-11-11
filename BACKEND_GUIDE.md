# ☠ Necro-MUD — Backend Developer Guide

Welcome to the Backend Track, **Samkiel**! This guide sets up your independent workflow for `@necro-mud/server` and `@necro-mud/shared` so you and **Zabdiel** (`@necro-mud/client`) can build in parallel with **zero merge conflicts**.

---

## 1. Quickstart Commands

```bash
# 1. Clone the repository
git clone https://github.com/fwesh001/necro-mud.git
cd necro-mud

# 2. Switch to your dedicated backend branch (create from main if first time: git checkout -b feat/server-github-ai)
git checkout feat/server-github-ai

# 3. Install all workspace dependencies
pnpm install

# 4. Build shared types (REQUIRED before running server)
pnpm run build:shared

# 5. Start the backend server in watch mode (HTTP :4000 & WS ws://localhost:4000)
pnpm run dev:server
```

### Useful Verification Commands
```bash
# Type-check shared + server
pnpm --filter @necro-mud/shared build && pnpm --filter @necro-mud/server build

# Run complete automated smoke test
pnpm run test:smoke

# Launch interactive CLI terminal crawler
pnpm run play

# Check live health endpoint (while server is running)
curl http://localhost:4000/api/health
```

---

## 2. Strict Folder Ownership Rules

| Track | Owner | Owned Paths | Branch |
|:------|:------|:------------|:-------|
| **Backend** | **Samkiel** | `server/`, `shared/`, backend items in `.kiro/specs/necro-mud-core/tasks.md` | `feat/server-github-ai` |
| **Frontend** | **Zabdiel** | `client/`, frontend items in `.kiro/specs/necro-mud-core/tasks.md` | `feat/client-crt-costume` |

### Non-Negotiable Guardrails
1. **Do NOT edit `/client`:** Zabdiel owns all frontend files on `feat/client-crt-costume`. Never modify anything under `client/` to guarantee zero merge conflicts.
2. **Do NOT add `.kiro/` to `.gitignore`:** The `.kiro/` directory (steering, specs, hooks) is mandatory for Kiroween 2026 hackathon judging and must stay committed.
3. **Respect import boundaries & `AGENTS.md`:**
   - `shared/` imports **nothing** (zero runtime dependencies).
   - `server/` imports from `@necro-mud/shared` only (never `client/`).
   - All terminal output MUST strictly use the **16-color VGA palette** (`AnsiColor` 0–15), **CP437** box-drawing characters, and fit inside an **80×24** terminal grid.
   - Never add bloated utility packages (`lodash`, `moment`, `axios`, etc.) — use native `fetch`, `Date`, `Intl`, and Node built-ins.
4. **Sync on `/shared` changes:** Whenever you add new `CommandType` values (e.g., `REPO`) or `ServerEventType` payloads in `shared/src/`, rebuild with `npm run build:shared` and ping Zabdiel before merging to `main`.

---

## 3. Wave 3 Backend Checklist

- [ ] **Task 3.1 — Live GitHub REST API Repo-to-Dungeon Parser (`server/src/engine/github-parser.ts`)**
  - Upgrade `generateDungeonFromRepo(config?: GitHubRepoConfig)` to fetch real repository trees, open issues (including issue numbers, labels, and bodies), and recent workflow/CI check runs via native `fetch` against `https://api.github.com` (using optional `process.env.GITHUB_TOKEN` when present).
  - Map directories/key files to interconnected `Room` nodes (with bidirectional exits), open issues/bugs to `Monster` entities, and failing checks to `ci-failure` wraiths/traps.
  - **Mandatory Resilience:** Automatically fall back cleanly to the built-in mock dungeon when offline, missing a repo, or hitting GitHub API rate limits (HTTP 403/429), logging a clear warning without crashing the server.

- [ ] **Task 3.2 — Dynamic `REPO <owner/repo>` Command (`server/src/commands/parser.ts` + `/shared`)**
  - Add `'REPO'` to `CommandType` in `shared/src/types/commands.ts` (and a `'repo-loaded'` event type or structured payload in `shared/src/types/events.ts` if helpful, keeping backwards compatibility).
  - Implement `REPO <owner/repo>` in `server/src/commands/parser.ts` so connected players can hot-load any public GitHub repository into the active `DungeonState` at runtime, resetting/relocating players safely to the new `entrance` and broadcasting the dungeon shift to everyone connected.
  - Include `REPO <owner/repo>` in `renderHelpText()`.

- [ ] **Task 3.3 — AI Dungeon Master Narration (`server/src/engine/ai-dm.ts` + `combat.ts`)**
  - Create `server/src/engine/ai-dm.ts` implementing an async/hooked Dungeon Master narrator using native `fetch` (e.g., OpenAI/Anthropic/Gemini via env key such as `OPENAI_API_KEY` or `LLM_API_KEY`) compatible with the `CombatNarrationHook` architecture in `server/src/engine/combat.ts`.
  - Provide an **instant deterministic gothic-BBS fallback** whenever no API key is configured or an LLM call fails/times out, so combat never stalls.
  - Emit dramatic `narration` events (`ServerEventPacket`) or combat flavor text within 80-column ANSI constraints.

- [ ] **Task 3.4 — Deepened `SCAN`, `PATCH`, and `CAST` Mechanics (`server/src/commands/parser.ts` + `server/src/ansi/renderer.ts`)**
  - **SCAN `<monster>`:** Render real GitHub issue bodies (truncated cleanly to 80-column CP437 boxes), labels, complexity scores, and `sourceRef` links.
  - **PATCH `<monster>`:** Implement interactive bug-patching / diagnostic mechanics (e.g., applying a fix attempt against `bug`/`issue`/`ci-failure` monsters, dealing bonus "refactor damage" or resolving low-HP issues with XP rewards).
  - **CAST `<spell>`:** Implement commit-scroll spellcasting (e.g., `CAST refactor`, `CAST revert`, `CAST hotfix` using items dropped or granted to players for healing, buffs, or AoE bug-squashing).

---

## 4. Copy-Paste Master Prompt

Copy and paste the prompt below directly into your AI coding agent (**Antigravity**, **Kiro**, or **Cursor**) after checking out `feat/server-github-ai`:

```markdown
You are acting as Backend Lead (Samkiel) on Necro-MUD on branch `feat/server-github-ai`.
First read `AGENTS.md`, `.kiro/steering/tech.md`, `.kiro/steering/structure.md`, `.kiro/specs/necro-mud-core/requirements.md`, and `.kiro/specs/necro-mud-core/design.md`.

STRICT RULES:
- Only edit files inside `server/`, `shared/`, and Wave 3 / Wave 3+ backend checkboxes in `.kiro/specs/necro-mud-core/tasks.md`.
- NEVER edit anything inside `client/` (owned by Zabdiel on `feat/client-crt-costume`).
- Do NOT add `.kiro/` to `.gitignore`.
- Follow `AGENTS.md` strictly: 16-color VGA palette only (`AnsiColor` 0–15), CP437 box-drawing characters, 80x24 terminal grid width (<= 80 visible chars per line), zero external bloat (no axios, lodash, moment — use native `fetch`).
- Keep `shared` zero-dependency and ESM-compatible (`import ... from './file.js'`).

IMPLEMENT WAVE 3 BACKEND END-TO-END:
1. Live GitHub REST Parser (`server/src/engine/github-parser.ts`):
   - Make `generateDungeonFromRepo(config?: GitHubRepoConfig)` fetch real repo tree, open issues, and workflow/CI runs from `https://api.github.com` using native `fetch` and optional `process.env.GITHUB_TOKEN`.
   - Build a connected room graph from top directories/high-complexity files, spawn `Monster` entities from open issues/bugs/complex files/failed CI runs (preserving real issue body snippets and complexity metrics on `Monster` / `Room`), and automatically fall back to the mock dungeon cleanly if offline, 404, or rate-limited.

2. Runtime `REPO <owner/repo>` Command (`shared/src/types/commands.ts`, `server/src/engine/dungeon.ts`, `server/src/commands/parser.ts`, `server/src/ansi/renderer.ts`):
   - Add `'REPO'` to `CommandType` in `shared` and rebuild `shared`.
   - Support `REPO <owner/repo>` in `parser.ts` to hot-swap the active dungeon rooms & monsters, relocate all connected players safely to `entrance`, send the new room description, and broadcast a notification. Add `REPO <owner/repo>` to `renderHelpText()`.

3. AI Dungeon Master (`server/src/engine/ai-dm.ts` + `server/src/engine/combat.ts`):
   - Create `server/src/engine/ai-dm.ts` wired cleanly into `CombatNarrationHook` in `combat.ts` (keeping deterministic fallback instant when no LLM API key env var is set or on request timeout/error).
   - Keep all narration ANSI-safe (VGA 16 colors, wrapped <= 76 cols inside CP437 boxes).

4. Deepened `SCAN`, `PATCH`, and `CAST` Mechanics (`server/src/commands/parser.ts`, `server/src/ansi/renderer.ts`, `shared/src/types/`):
   - `SCAN <monster>`: Render GitHub issue body excerpts, labels/origin, file complexity score, and `sourceRef` inside an 80-column CP437 box.
   - `PATCH <monster>`: Implement tactical patching against bug/issue/CI monsters (deals fix damage / cures traps / awards XP & commit scroll loot).
   - `CAST <spell>`: Implement commit-scroll spells (e.g., `HOTFIX` heal, `REFACTOR` high-damage strike, `ROLLBACK` defense shield).

5. Update `.kiro/specs/necro-mud-core/tasks.md` to check off completed Wave 3+ backend items.

VERIFICATION:
- Run `npm run build:shared && npm run build:server` and fix any TypeScript errors.
- Start the server (`node server/dist/index.js`) and run a Node WebSocket smoke test verifying `/api/health`, `HELP`, `LOOK`, `MAP`, `STATUS`, `MOVE`, `SCAN`, `PATCH`, `CAST`, `ATTACK`, and `REPO` (both valid repo or graceful mock fallback), asserting all rendered ANSI lines are <= 80 visible characters.
```

