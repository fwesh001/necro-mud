# ☠ Necro-MUD

> **Your Repository Is Your Dungeon**

A multiplayer ANSI-art terminal dungeon accessible via a retro CRT web interface and WebSockets. Necro-MUD turns a live GitHub repository into a playable dungeon where high-complexity files, failing CI checks, and open issues manifest as literal monsters that developers can slay together.

**Kiroween 2026 Hackathon** — Resurrection + Costume Contest

---

## ⚔ Architecture

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│     CLIENT (:3000)          │     │      SERVER (:4000)          │
│                             │     │                              │
│  Next.js 15 + Tailwind 4    │ WS  │  Express 5 + ws              │
│  XTerm.js (ANSI terminal)   │◄───►│  Dungeon State Engine        │
│  CRT Bezel + Scanlines      │     │  Combat Engine               │
│  Boot Sequence Animation    │     │  GitHub Repo Parser (mock)   │
│                             │     │  ANSI Frame Renderer         │
└─────────────────────────────┘     └──────────────────────────────┘
                 │                                  │
                 └──────────┐       ┌───────────────┘
                            ▼       ▼
                   ┌─────────────────────┐
                   │   SHARED TYPES      │
                   │   @necro-mud/shared  │
                   │                     │
                   │   Room, Monster,    │
                   │   Player, Packets,  │
                   │   ANSI, CP437       │
                   └─────────────────────┘
```

## 🎮 Features

- **Authentic CRT Experience** — Phosphor glow, scanline overlay, screen curvature, modem dial-up boot sequence
- **Multiplayer MUD** — Multiple players explore and fight together via WebSockets
- **GitHub-Driven Dungeon** — Repository files become rooms, issues become monsters, CI failures become traps
- **Classic MUD Commands** — `LOOK`, `ATTACK`, `SCAN`, `MAP`, `STATUS`, `MOVE`, `SAY`
- **16-Color VGA Palette** — Strict retro authenticity with CP437 box-drawing characters
- **Deterministic Combat** — With hook points for an AI Dungeon Master narrator

## 🚀 Quickstart

### Prerequisites
- **Node.js** ≥ 20.0.0
- **npm** ≥ 10.0.0

### Install & Run

```bash
# Clone the repository
git clone https://github.com/fwesh001/necro-mud.git
cd necro-mud

# Install all workspace dependencies
npm install

# Build the shared types (required first)
npm run build:shared

# Start both server and client in development mode
npm run dev
```

### Access

| Service   | URL                        |
|:----------|:---------------------------|
| Client    | http://localhost:3000       |
| Server    | http://localhost:4000       |
| WebSocket | ws://localhost:4000         |
| Health    | http://localhost:4000/api/health |

### Individual Commands

```bash
# Build everything
npm run build

# Run server only
npm run dev:server

# Run client only
npm run dev:client

# Type-check entire project
npm run typecheck
```

## 🗂 Project Structure

```
necro-mud/
├── .kiro/                   # Kiro IDE specs, steering, hooks
│   ├── steering/            # Product vision, tech stack, structure
│   ├── specs/               # Feature specifications (EARS notation)
│   └── hooks/               # Automation triggers
├── shared/                  # @necro-mud/shared — TypeScript types & constants
├── server/                  # @necro-mud/server — MUD engine + WebSocket
├── client/                  # @necro-mud/client — Next.js CRT terminal
├── AGENTS.md                # AI agent instructions
└── README.md                # This file
```

## 🎲 MUD Commands

| Command              | Description                              |
|:---------------------|:-----------------------------------------|
| `HELP`               | Show available commands                  |
| `LOOK`               | Examine your surroundings                |
| `MAP`                | View the dungeon map                     |
| `STATUS`             | Check your stats                         |
| `MOVE <direction>`   | Travel north/south/east/west/up/down     |
| `ATTACK <monster>`   | Attack a monster in the room             |
| `SCAN <monster>`     | Analyse a monster's GitHub origin        |
| `SAY <message>`      | Chat with other adventurers              |

## 🧟 GitHub → Dungeon Mapping

| GitHub Artifact       | Dungeon Metaphor       |
|:----------------------|:-----------------------|
| Repository            | The Dungeon            |
| Files / Directories   | Rooms & Corridors      |
| High-complexity files | Boss Monsters          |
| Open Issues / Bugs    | Monsters & Undead      |
| Failing CI checks     | Cursed Traps           |
| Commits               | Spell Scrolls          |
| Pull Requests         | Resurrection Rituals   |

## 👥 Team

| Developer   | Role                                        |
|:------------|:--------------------------------------------|
| **Zabdiel** | Frontend, CRT aesthetics, Xterm.js, Audio   |
| **Eke**     | MUD Engine, WebSocket state, GitHub Parser   |

## 📜 License

MIT — see [LICENSE](LICENSE)

