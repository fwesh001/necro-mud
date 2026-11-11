---
description: "Necro-MUD technical architecture, state machine, and protocol design"
---

# Necro-MUD Core — Technical Design

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (:3000)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  CRT MONITOR BEZEL                           │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              XTERM.JS TERMINAL                          │  │  │
│  │  │  ┌───────────────────────────────────────────────────┐  │  │  │
│  │  │  │  ╔══════════════════════════════════════╗         │  │  │  │
│  │  │  │  ║ The Repository Gates                 ║         │  │  │  │
│  │  │  │  ║ You stand before massive iron gates  ║         │  │  │  │
│  │  │  │  ║ wrought in the shape of { }...       ║         │  │  │  │
│  │  │  │  ╚══════════════════════════════════════╝         │  │  │  │
│  │  │  │  > MOVE north_                                    │  │  │  │
│  │  │  └───────────────────────────────────────────────────┘  │  │  │
│  │  │  Scanlines ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  Phosphor Glow ✦✦✦   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                            │ WebSocket                              │
└────────────────────────────┼────────────────────────────────────────┘
                             │ ws://localhost:4000
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVER (:4000)                                │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  EXPRESS      │    │  WEBSOCKET   │    │  DUNGEON STATE        │  │
│  │  /api/health  │    │  SERVER (ws) │───▶│  ENGINE               │  │
│  └──────────────┘    └──────┬───────┘    │                       │  │
│                              │            │  rooms: Map<id,Room>  │  │
│                              │            │  monsters: Map<id,M>  │  │
│                              ▼            │  players: Map<id,P>   │  │
│                     ┌────────────────┐    └───────────┬───────────┘  │
│                     │  COMMAND       │                │              │
│                     │  PARSER        │                │              │
│                     │                │                ▼              │
│                     │  HELP│LOOK│MAP │    ┌───────────────────────┐  │
│                     │  STATUS│ATTACK │    │  COMBAT ENGINE        │  │
│                     │  MOVE│SCAN│SAY │    │  (deterministic +     │  │
│                     └────────┬───────┘    │   LLM narration hook) │  │
│                              │            └───────────────────────┘  │
│                              ▼                                      │
│                     ┌────────────────┐    ┌───────────────────────┐  │
│                     │  ANSI          │    │  GITHUB REPO          │  │
│                     │  RENDERER      │    │  PARSER (mock→live)   │  │
│                     │  (CP437 boxes, │    │                       │  │
│                     │   HP bars,     │    │  repo tree → rooms    │  │
│                     │   combat text) │    │  issues → monsters    │  │
│                     └────────────────┘    │  CI fails → traps     │  │
│                                           └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## State Machine — Player Session

```
                    ┌─────────┐
         connect    │         │  disconnect
        ────────▶   │  IDLE   │  ──────────▶  [REMOVED]
                    │         │
                    └────┬────┘
                         │ (auto: welcome + room desc)
                         ▼
                    ┌──────────┐
              ┌────▶│EXPLORING │◀────────────────────┐
              │     └────┬─────┘                      │
              │          │                            │
              │     MOVE │  ATTACK                    │
              │          │    │                        │
              │          ▼    ▼                        │
              │     ┌──────────┐                      │
              │     │ COMBAT   │──── monster slain ────┘
              │     └────┬─────┘
              │          │
              │     player HP ≤ 0
              │          │
              │          ▼
              │     ┌──────────┐
              └─────│ RESPAWN  │  (entrance, 50% HP)
                    └──────────┘
```

## WebSocket Protocol

### Packet Envelope
All messages use a JSON envelope:

```typescript
// Client → Server
interface CommandPacket {
  type: 'command';           // discriminator
  command: CommandType;      // verb: HELP, LOOK, MOVE, ATTACK, etc.
  args: string[];            // positional arguments
  playerId: string;          // assigned on connect
  timestamp: number;         // Unix ms
}

// Server → Client
interface ServerEventPacket {
  type: 'event';             // discriminator
  event: ServerEventType;    // event name
  payload: Record<string, unknown>;  // event-specific data
  playerId: string | null;   // target player or null=broadcast
  timestamp: number;         // Unix ms
}
```

### Raw Text Fallback
The server also accepts raw text input (e.g. from a Telnet client). If a message is not valid JSON, it is parsed as a space-delimited command string:

```
MOVE north         → { command: "MOVE", args: ["north"] }
ATTACK Bug #42     → { command: "ATTACK", args: ["Bug", "#42"] }
SAY hello world    → { command: "SAY", args: ["hello", "world"] }
```

### Event Types & Payload Shapes

| Event              | Key Payload Fields                          | Scope      |
|:-------------------|:--------------------------------------------|:-----------|
| `welcome`          | `banner`, `playerId`, `playerName`          | Player     |
| `room-description` | `ansi` (rendered ANSI string)               | Player     |
| `combat-result`    | `damageDealt`, `damageReceived`, `targetSlain`, `narration` | Player |
| `player-joined`    | `playerName`, `roomId`                      | Room       |
| `player-left`      | `playerName`                                | Room       |
| `player-moved`     | `playerName`, `direction`, `action`         | Room       |
| `monster-slain`    | `monsterName`, `slainBy`, `xpReward`        | Room       |
| `map-view`         | `ansi`                                      | Player     |
| `status-view`      | `ansi`                                      | Player     |
| `help-text`        | `ansi`                                      | Player     |
| `scan-result`      | `ansi`                                      | Player     |
| `chat`             | `playerName`, `message`, `ansi`             | Room       |
| `narration`        | `ansi`                                      | Player     |
| `error`            | `message`                                   | Player     |

## Monster Generation Algorithm

```
Input:  GitHub file metadata (path, LoC, cyclomatic complexity, issue labels)

Complexity Score (0–100):
  = clamp(0, 100, (linesOfCode / 50) + (cyclomaticComplexity * 5) + (importCount * 2))

Tier Assignment:
  score < 30  → minion   (HP: 15–30,  ATK: 4–8,   DEF: 1–3)
  score < 70  → elite    (HP: 40–70,  ATK: 10–16,  DEF: 4–8)
  score >= 70 → boss     (HP: 80–150, ATK: 16–24,  DEF: 8–14)

Origin Mapping:
  GitHub Issue (label: bug)        → origin: 'bug'
  GitHub Issue (other labels)      → origin: 'issue'
  High-complexity file             → origin: 'complexity'
  Failed CI check run              → origin: 'ci-failure'

Name Generation:
  bug    → "Phantom Bug #<issue_number>"
  issue  → "Unresolved Specter #<issue_number>"
  complexity → "The <adjective> Golem" (adjective from file path)
  ci-failure → "<check_name> Wraith"
```

## ANSI Rendering Rules

1. All output framed in CP437 double-line boxes (`╔═╗║╚═╝`)
2. Title rendered in bright yellow bold, centered in top border
3. HP bars use block characters: `█` (filled) `░` (empty)
4. HP color: green (>60%), yellow (30–60%), red (<30%)
5. Room names: bright green bold
6. Monster names: red (minion), bright yellow (elite), bright magenta (boss)
7. Exit directions: bright white
8. Locked exits: red `[LOCKED]` suffix
9. Player names: cyan
10. Error messages: bright red

