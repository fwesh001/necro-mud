---
description: "Necro-MUD core feature requirements in EARS notation"
---

# Necro-MUD Core — Requirements

## Overview
This document specifies the functional requirements for the Necro-MUD core system using EARS (Easy Approach to Requirements Syntax) notation.

---

## REQ-001: Player Connection
WHEN a player connects via WebSocket to port 4000
THE SYSTEM SHALL assign a unique player ID (format: `player-NNNN`),
create a Player entity with default stats (HP:100, ATK:12, DEF:8),
place the player in the dungeon entrance room (`entrance`),
and transmit the ANSI welcome banner followed by the entrance room description.

## REQ-002: Room Description (LOOK)
WHEN a player sends the `LOOK` command
THE SYSTEM SHALL render the current room's ANSI description including:
- Room name (bright green, bold)
- Multi-line flavour text
- GitHub file path reference (if applicable)
- List of available exits with direction and lock status
- List of living monsters with name, tier, and HP bar
- List of other players present in the room

## REQ-003: Room Navigation (MOVE)
WHEN a player sends the `MOVE <direction>` command
AND the current room has an unlocked exit in that direction
THE SYSTEM SHALL move the player to the target room,
mark the target room as visited in the player's map,
transmit the new room's description to the player,
AND broadcast departure/arrival notifications to players in both rooms.

## REQ-004: Locked Exit
WHEN a player sends the `MOVE <direction>` command
AND the exit in that direction is locked
THE SYSTEM SHALL deny movement and display a flavour message
indicating a Pull Request or other action is needed to unseal the passage.

## REQ-005: Combat (ATTACK)
WHEN a player sends the `ATTACK <target>` command
AND a living monster matching the target name exists in the current room
THE SYSTEM SHALL execute a deterministic combat round:
1. Player attack roll: `player.attack + roll(1–6) - monster.defense` (minimum 0)
2. Apply damage to monster HP
3. If monster survives, monster counterattack: `monster.attack + roll(1–6) - player.defense` (minimum 0)
4. Apply counterattack damage to player HP
5. Transmit combat result with ANSI narration to the player
6. If monster HP ≤ 0, mark monster as slain, award XP, and broadcast kill to room

## REQ-006: Player Death & Respawn
WHEN a player's HP reaches 0 during combat
THE SYSTEM SHALL display a death narration,
respawn the player at the entrance room with 50% max HP,
AND preserve their XP and inventory.

## REQ-007: Monster Analysis (SCAN)
WHEN a player sends the `SCAN <target>` command
AND a living monster matching the target exists in the current room
THE SYSTEM SHALL render a detailed scan report including:
- Monster name, tier, and origin type
- Current HP / Max HP, ATK, DEF
- GitHub source reference (issue URL, file path, or CI run URL)
- Monster description

## REQ-008: Player Status (STATUS)
WHEN a player sends the `STATUS` command
THE SYSTEM SHALL render a status panel displaying:
- Player name, HP bar, ATK, DEF, XP
- Current room identifier
- Inventory contents

## REQ-009: Dungeon Map (MAP)
WHEN a player sends the `MAP` command
THE SYSTEM SHALL render an ASCII map of all rooms,
indicating which rooms the player has visited,
highlighting the player's current location,
AND showing monster counts per room.

## REQ-010: Help Text (HELP)
WHEN a player sends the `HELP` command
THE SYSTEM SHALL render a formatted table of all available commands
with their syntax and descriptions.

## REQ-011: Multiplayer Chat (SAY)
WHEN a player sends the `SAY <message>` command
THE SYSTEM SHALL broadcast the message to all players in the same room,
prefixed with the speaker's name in cyan.

## REQ-012: Player Disconnect
WHEN a player's WebSocket connection closes
THE SYSTEM SHALL remove the player from the dungeon state,
remove them from their current room's player list,
AND broadcast a departure notification to players in that room.

## REQ-013: ANSI Rendering Constraints
FOR ALL terminal output rendered by the system
THE SYSTEM SHALL use only the 16-color VGA ANSI palette (colors 0–15),
use CP437-compatible box-drawing characters for borders and decorations,
AND ensure all output fits within an 80-column terminal width.

## REQ-014: CRT Web Client
WHEN a user navigates to `http://localhost:3000` in a browser
THE SYSTEM SHALL display a retro CRT monitor bezel with:
- Modem dial-up boot sequence animation
- Scanline overlay effect
- Phosphor green glow
- XTerm.js terminal connected to `ws://localhost:4000`

## REQ-015: Repository-to-Dungeon Generation
WHEN the server starts
THE SYSTEM SHALL generate a dungeon from the configured repository data:
- Directories → navigable rooms with exits
- High-complexity files → boss/elite monsters
- Open issues → minion/elite monsters
- The dungeon entrance maps to the repository root

## REQ-016: Combat Narration Hooks
THE SYSTEM SHALL expose a `CombatNarrationHook` function type
that accepts a `CombatResultPayload` and returns a narration string,
enabling an LLM-powered Dungeon Master narrator to be layered
over the deterministic combat engine without modifying core logic.

