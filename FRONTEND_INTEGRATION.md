# ☠ Necro-MUD — Frontend Integration & API Documentation

> **Target Audience:** Frontend Lead (**Zabdiel** / `@necro-mud/client`)  
> **Backend Version:** `0.1.0` (Wave 3+ complete)  
> **Server Protocols:** WebSocket (`ws://localhost:4000`), HTTP Health (`http://localhost:4000/api/health`), Telnet Bridge (`telnet://localhost:2323`)

---

## 1. Connection Architecture

```
+-------------------------------------------------------------+
|                Retro CRT Terminal Client                    |
|      (Next.js 15 + React 19 + XTerm.js + TacticalHud)       |
+-------------------------------------------------------------+
             |                                    ^
   CommandPacket (JSON or raw string)      ServerEventPacket (JSON)
             v                                    |
+-------------------------------------------------------------+
|                 Necro-MUD Backend Engine                    |
|       (Express 5 + ws + Live GitHub REST + AI DM Narrator)  |
+-------------------------------------------------------------+
```

### Endpoints
- **WebSocket URL:** `ws://localhost:4000` (or `process.env.NEXT_PUBLIC_WS_URL`)
- **HTTP Health Check:** `GET http://localhost:4000/api/health`
  ```json
  {
    "status": "alive",
    "name": "necro-mud",
    "version": "0.1.0",
    "players": 1,
    "rooms": 7,
    "uptime": 124.5
  }
  ```

---

## 2. Client → Server: `CommandPacket`

The client can send either a structured JSON `CommandPacket` or raw whitespace-delimited terminal text strings.

### Structured JSON Format
```typescript
interface CommandPacket {
  type: 'command';
  command: CommandType;
  args: string[];
  playerId: string;
  timestamp: number;
}
```

### Supported Commands

| Command | Arguments | Description | Example Payload |
|:---|:---|:---|:---|
| `HELP` | none | Render list of all commands | `{ command: "HELP", args: [] }` |
| `LOOK` | none | Re-render current room, exits, monsters, adventurers | `{ command: "LOOK", args: [] }` |
| `MAP` | none | Render discovered dungeon ASCII map | `{ command: "MAP", args: [] }` |
| `STATUS` | none | Render player stats, HP, XP, developer title, inventory | `{ command: "STATUS", args: [] }` |
| `MOVE` | `<direction>` | Move to an adjacent room (`north`, `south`, `east`, `west` or `n`, `s`, `e`, `w`) | `{ command: "MOVE", args: ["north"] }` |
| `ATTACK` | `<target>` | Attack a monster in the room (deterministic + AI DM narration) | `{ command: "ATTACK", args: ["monster-bug-42"] }` |
| `SCAN` | `<target>` | Inspect origin artifact, labels, complexity score & issue snippet | `{ command: "SCAN", args: ["monster-bug-42"] }` |
| `PATCH` | `<target>` | Attempt to patch a bug/CI defect directly (deals fix damage, awards loot) | `{ command: "PATCH", args: ["monster-bug-42"] }` |
| `CAST` | `<spell> [target]` | Cast commit scroll spell: `HOTFIX` (heal), `REFACTOR` (high-dmg), `ROLLBACK` (cleanse) | `{ command: "CAST", args: ["hotfix"] }` |
| `REPO` | `<owner/repo>` | Hot-swap the entire dungeon with a public GitHub repo | `{ command: "REPO", args: ["fwesh001/necro-mud"] }` |
| `TOP` | none | View Hall of Fame XP leaderboard & developer rankings | `{ command: "TOP", args: [] }` |
| `SAY` | `<words...>` | Send chat message to all adventurers in the current room | `{ command: "SAY", args: ["Need", "help", "here!"] }` |

*Note: Raw text commands (e.g. `MOVE north` or `REPO facebook/react`) sent over WebSocket are automatically parsed.*

---

## 3. Server → Client: `ServerEventPacket`

Every message sent from the server to connected clients follows the `ServerEventPacket` envelope:

```typescript
interface ServerEventPacket {
  type: 'event';
  event: ServerEventType;
  payload: Record<string, unknown>;
  playerId: string | null; // null indicates broadcast to room or global
  timestamp: number;
}
```

### Event Reference & Payloads

#### 1. `'welcome'`
Emitted immediately upon WebSocket connection handshake.
```json
{
  "type": "event",
  "event": "welcome",
  "payload": {
    "playerId": "player-1",
    "playerName": "Adventurer-0001",
    "banner": "\x1b[36m╔═════... [ANSI Art Banner] ...╚═════\x1b[0m",
    "message": "\x1b[32mWelcome, Adventurer-0001...\x1b[0m"
  },
  "playerId": "player-1",
  "timestamp": 1773489200000
}
```

#### 2. `'room-description'`
Emitted on room entry, `LOOK`, or after reality shifts.
```json
{
  "type": "event",
  "event": "room-description",
  "payload": {
    "ansi": "\r\n\x1b[36m╔═ The Source Code Hall ═╗... [CP437 Box]\x1b[0m\r\n"
  }
}
```

#### 3. `'combat-result'`
Emitted when an `ATTACK` or `PATCH` is executed against a monster.
```json
{
  "type": "event",
  "event": "combat-result",
  "payload": {
    "ansi": "\r\n\x1b[36m╔═ COMBAT ═╗...\x1b[0m\r\n",
    "attackerId": "player-1",
    "targetId": "monster-bug-42",
    "targetName": "Phantom Bug #42",
    "damageDealt": 18,
    "damageReceived": 6,
    "targetSlain": false,
    "attackerHp": 94,
    "attackerMaxHp": 100,
    "targetHp": 12,
    "targetMaxHp": 30,
    "narration": "You cleave through the spectral bytecode of Phantom Bug #42 for 18 damage!\r\n..."
  }
}
```

#### 4. `'scan-result'`
Emitted when `SCAN <monster>` is executed. Contains detailed CP437 double-line box with labels, issue bodies, and URLs.
```json
{
  "type": "event",
  "event": "scan-result",
  "payload": {
    "ansi": "\r\n\x1b[36m╔═ SCAN ANALYSIS ═╗...\x1b[0m\r\n"
  }
}
```

#### 5. `'repo-loaded'`
Global broadcast when a player executes `REPO <owner/repo>` and hot-swaps the active world.
```json
{
  "type": "event",
  "event": "repo-loaded",
  "payload": {
    "owner": "fwesh001",
    "repo": "necro-mud",
    "roomCount": 7,
    "monsterCount": 6,
    "ansi": "\r\n\x1b[32m════ REALITY SHIFTS! ════\x1b[0m\r\n..."
  },
  "playerId": null
}
```

#### 6. `'leaderboard-view'`
Emitted on `TOP` command showing XP rankings and developer titles.
```json
{
  "type": "event",
  "event": "leaderboard-view",
  "payload": {
    "ansi": "\r\n\x1b[36m╔═ HALL OF FAME (TOP HACKERS) ═╗...\x1b[0m\r\n",
    "records": [
      {
        "name": "Adventurer-0001",
        "xp": 340,
        "title": "Staff System Sorcerer",
        "bugsSquashed": 8
      }
    ]
  }
}
```

#### 7. `'narration'`
Emitted for AI Dungeon Master ambient commentary, death notices, or spellcasting feedback (`CAST hotfix`).
```json
{
  "type": "event",
  "event": "narration",
  "payload": {
    "ansi": "\r\n\x1b[35m★ [DM Narrator] The debugger pierces the heart of technical debt...\x1b[0m\r\n",
    "spellResult": {
      "success": true,
      "spellName": "HOTFIX",
      "hpHealed": 25
    }
  }
}
```

---

## 4. Audio Engine Integration Hooks (`sound-engine.ts`)

In `client/src/app/lib/sound-engine.ts`, map incoming server events to authentic procedural 8-bit WebAudio SFX:

```typescript
// Example frontend event router
function handleServerEvent(packet: ServerEventPacket) {
  switch (packet.event) {
    case 'combat-result':
      if (packet.payload.targetSlain) {
        soundEngine.playSfx('victory'); // or bug-squash
      } else if (Number(packet.payload.damageReceived) > 0) {
        soundEngine.playSfx('player-hurt');
      } else {
        soundEngine.playSfx('hit');
      }
      break;

    case 'repo-loaded':
      soundEngine.playDegaussThump();
      soundEngine.playModemHandshake();
      break;

    case 'player-joined':
    case 'player-moved':
      soundEngine.playSfx('keystroke');
      break;

    case 'narration':
      if (packet.payload.spellResult) {
        soundEngine.playSfx('spell-cast');
      }
      break;
  }
}
```

---

## 5. Tactical HUD Integration (`TacticalHud.tsx`)

The collapsible hardware deck can display live state by listening to:
1. **Health & Mana Bars:** Track `attackerHp` and `attackerMaxHp` from `combat-result`, or query via `STATUS`.
2. **Current Target Selector:** Target names from `room-description` monsters list.
3. **Active Repository Indicator:** Track `owner/repo` from `repo-loaded`.
4. **Macro Keycaps:** Hardware deck quick-buttons for `LOOK`, `STATUS`, `MAP`, `CAST hotfix`, `TOP`.

---

## 6. Strict Aesthetic Guarantees
- **16-Color VGA Palette:** Every ANSI escape sequence from the server strictly adheres to ANSI 0–15 colors.
- **CP437 Safe:** Borders and icons use pure CP437 characters (`╔═╗`, `║`, `☠`, `★`, `♥`, `♦`).
- **80-Column Limit:** All rendered lines are wrapped and padded to fit inside 80 terminal columns without overflow.

