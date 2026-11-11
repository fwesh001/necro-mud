---
inclusion: always
description: "Necro-MUD product vision, lore mechanics, and GitHub-to-dungeon mapping"
---

# Necro-MUD — Product Vision

## Identity
**Necro-MUD** resurrects the 1980s Bulletin Board System (BBS) and Multi-User Dungeon (MUD) era for modern developers. It is a multiplayer ANSI-art terminal dungeon accessible via a retro CRT web interface AND raw WebSockets.

## Hackathon Categories
- **Resurrection:** Reviving the BBS/MUD era with modern web technology
- **Costume Contest:** The entire UI is "costumed" as a 1990s CRT monitor with phosphor glow, scanlines, and modem dial-up boot sequences

## Target Audience
Developers who want a gamified, atmospheric view of their GitHub repositories. Instead of staring at issue trackers and CI dashboards, they explore their codebase as a dungeon and slay bugs as literal monsters — together.

## Core Concept
A live GitHub repository is transformed into a playable dungeon. Two or more developers connect simultaneously and cooperate to diagnose and slay the monsters lurking in their code.

## GitHub → Dungeon Mapping (Lore Mechanics)

| GitHub Artifact       | Dungeon Metaphor             | Game Effect                                      |
|:----------------------|:-----------------------------|:-------------------------------------------------|
| Repository            | The Dungeon                  | The entire playable world                        |
| Files / Directories   | Rooms & Corridors            | Navigable locations with descriptions            |
| High-complexity files | Boss Monsters                | Powerful enemies with high HP/ATK                |
| Open Issues / Bugs    | Monsters & Undead            | Enemies that must be "slain" (resolved)          |
| Failing CI checks     | Cursed Traps                 | Environmental hazards dealing passive damage     |
| Commits               | Spell Scrolls                | Usable items that heal or deal damage            |
| Pull Requests         | Resurrection Rituals         | Multi-player rituals to unlock sealed passages   |
| Contributors          | Adventurers / Necromancers   | Playable characters with stats                   |
| Code Reviews          | Enchantments                 | Buffs applied to player equipment                |
| Merge Conflicts       | Boss Room Seals              | Must be resolved before the boss can be fought   |

## Player Commands

| Command    | Description                                              |
|:-----------|:---------------------------------------------------------|
| `HELP`     | Display available commands                               |
| `LOOK`     | Examine the current room, exits, monsters, and players   |
| `MAP`      | Display the discovered dungeon map                       |
| `STATUS`   | Show player stats (HP, ATK, DEF, XP, inventory)         |
| `MOVE`     | Travel to an adjacent room via an exit direction         |
| `ATTACK`   | Engage a monster in combat                               |
| `SCAN`     | Analyse a monster's GitHub origin (issue URL, file path) |
| `PATCH`    | Attempt to "fix" a bug-monster (future)                  |
| `CAST`     | Use a commit scroll as a spell (future)                  |
| `SAY`      | Speak to other adventurers in the same room              |

## Design Principles
1. **Authenticity:** Every pixel must feel like a 1990s BBS terminal — 16-color VGA palette, CP437 box-drawing, 80×24 grid
2. **Multiplayer-first:** Two or more developers explore and fight together in real time
3. **Repository-driven:** The dungeon is generated from real GitHub data, not static maps
4. **Hackable:** Clean TypeScript interfaces make it easy to extend with new commands, monsters, and lore
5. **Zero bloat:** No lodash, no moment, no heavyweight utility libraries — just the standard library and purpose-built code

