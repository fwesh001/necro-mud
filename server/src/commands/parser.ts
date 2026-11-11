/**
 * Command Parser & Executor
 *
 * Dispatches player commands to the appropriate game logic
 * and sends ANSI-formatted responses back over WebSocket.
 */

import type { WebSocket, WebSocketServer } from 'ws';
import type { CommandPacket } from '@necro-mud/shared';
import { AnsiColor, CP437, FG, RESET } from '@necro-mud/shared';
import { DungeonState } from '../engine/dungeon.js';
import {
  executeCombatRound,
  executePatch,
  executeSpell,
} from '../engine/combat.js';
import { generateDungeonFromRepo } from '../engine/github-parser.js';
import { generateAiNarration } from '../engine/ai-dm.js';
import {
  renderRoomDescription,
  renderCombatResult,
  renderStatusView,
  renderMap,
  renderHelpText,
  renderScanResult,
  renderPatchResult,
  renderSpellResult,
} from '../ansi/renderer.js';
import { sendEvent, broadcastToRoom, broadcastGlobal } from '../ws/handler.js';

const DIRECTION_ALIASES: Record<string, string> = {
  n: 'north',
  s: 'south',
  e: 'east',
  w: 'west',
  u: 'up',
  d: 'down',
};

/**
 * Parse and execute a command packet from a player.
 */
export function parseAndExecute(
  packet: CommandPacket,
  ws: WebSocket,
  wss: WebSocketServer,
  dungeon: DungeonState,
): void {
  const player = dungeon.getPlayer(packet.playerId);
  if (!player) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: 'Player session not found. Reconnect.' },
      playerId: packet.playerId,
      timestamp: Date.now(),
    });
    return;
  }

  switch (packet.command) {
    case 'HELP':
      handleHelp(ws, packet.playerId);
      break;

    case 'LOOK':
      handleLook(ws, dungeon, packet.playerId);
      break;

    case 'MAP':
      handleMap(ws, dungeon, packet.playerId);
      break;

    case 'STATUS':
      handleStatus(ws, dungeon, packet.playerId);
      break;

    case 'ATTACK':
      handleAttack(ws, wss, dungeon, packet.playerId, packet.args);
      break;

    case 'MOVE':
      handleMove(ws, wss, dungeon, packet.playerId, packet.args);
      break;

    case 'SCAN':
      handleScan(ws, dungeon, packet.playerId, packet.args);
      break;

    case 'PATCH':
      handlePatch(ws, wss, dungeon, packet.playerId, packet.args);
      break;

    case 'CAST':
      handleCast(ws, wss, dungeon, packet.playerId, packet.args);
      break;

    case 'REPO':
      handleRepo(ws, wss, dungeon, packet.playerId, packet.args);
      break;

    case 'SAY':
      handleSay(wss, dungeon, packet.playerId, packet.args);
      break;

    default:
      sendEvent(ws, {
        type: 'event',
        event: 'error',
        payload: {
          message: `Unknown command: ${packet.command}. Type HELP for available commands.`,
        },
        playerId: packet.playerId,
        timestamp: Date.now(),
      });
  }
}

// ── Command Handlers ──────────────────────────────────────────────

function handleHelp(ws: WebSocket, playerId: string): void {
  sendEvent(ws, {
    type: 'event',
    event: 'help-text',
    payload: { ansi: renderHelpText() },
    playerId,
    timestamp: Date.now(),
  });
}

function handleLook(ws: WebSocket, dungeon: DungeonState, playerId: string): void {
  const player = dungeon.getPlayer(playerId)!;
  const room = dungeon.getRoom(player.currentRoomId);
  if (!room) return;

  const monsters = dungeon.getRoomMonsters(room.id);
  const otherPlayers = dungeon.getRoomPlayers(room.id).filter(p => p.id !== playerId);

  sendEvent(ws, {
    type: 'event',
    event: 'room-description',
    payload: { ansi: renderRoomDescription(room, monsters, otherPlayers) },
    playerId,
    timestamp: Date.now(),
  });
}

function handleMap(ws: WebSocket, dungeon: DungeonState, playerId: string): void {
  const player = dungeon.getPlayer(playerId)!;
  const rooms = dungeon.getAllRooms();

  const aliveCounts = new Map<string, number>();
  for (const room of rooms) {
    aliveCounts.set(room.id, dungeon.getRoomMonsters(room.id).length);
  }

  sendEvent(ws, {
    type: 'event',
    event: 'map-view',
    payload: { ansi: renderMap(rooms, player, aliveCounts) },
    playerId,
    timestamp: Date.now(),
  });
}

function handleStatus(ws: WebSocket, dungeon: DungeonState, playerId: string): void {
  const player = dungeon.getPlayer(playerId)!;

  sendEvent(ws, {
    type: 'event',
    event: 'status-view',
    payload: { ansi: renderStatusView(player) },
    playerId,
    timestamp: Date.now(),
  });
}

function handleAttack(
  ws: WebSocket,
  wss: WebSocketServer,
  dungeon: DungeonState,
  playerId: string,
  args: string[],
): void {
  const player = dungeon.getPlayer(playerId)!;

  if (args.length === 0) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: 'Attack what? Usage: ATTACK <monster name>' },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const targetQuery = args.join(' ');
  const monster = dungeon.findMonsterInRoom(player.currentRoomId, targetQuery);

  if (!monster) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: `No monster matching "${targetQuery}" found in this room.` },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const result = executeCombatRound(player, monster);

  // Send combat result to attacker
  sendEvent(ws, {
    type: 'event',
    event: 'combat-result',
    payload: {
      ansi: renderCombatResult(result),
      ...result,
    },
    playerId,
    timestamp: Date.now(),
  });

  // Optional background AI DM narration
  if (
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.LLM_API_KEY
  ) {
    generateAiNarration(result).then((aiText) => {
      if (aiText) {
        broadcastToRoom(
          wss,
          dungeon,
          player.currentRoomId,
          {
            type: 'event',
            event: 'narration',
            payload: {
              ansi: `\r\n${FG[AnsiColor.Magenta]}${CP437.STAR} [DM Narrator] ${aiText}${RESET}\r\n`,
            },
            playerId: null,
            timestamp: Date.now(),
          },
        );
      }
    }).catch(() => {});
  }

  // Broadcast kill to other players in the room
  if (result.targetSlain) {
    broadcastToRoom(wss, dungeon, player.currentRoomId, {
      type: 'event',
      event: 'monster-slain',
      payload: {
        monsterName: monster.name,
        slainBy: player.name,
        xpReward: monster.xpReward,
        ansi: `${FG[AnsiColor.BrightYellow]}${CP437.SKULL} ${player.name} vanquished ${monster.name}!${RESET}\r\n`,
      },
      playerId: null,
      timestamp: Date.now(),
    }, playerId);
  }

  // Check player death
  if (player.hp <= 0) {
    sendEvent(ws, {
      type: 'event',
      event: 'narration',
      payload: {
        ansi: `\r\n${FG[AnsiColor.BrightRed]}${CP437.SKULL} You have fallen in battle! Your consciousness fades...${RESET}\r\n${FG[AnsiColor.Yellow]}You awaken at the Repository Gates, weakened but alive.${RESET}\r\n`,
      },
      playerId,
      timestamp: Date.now(),
    });

    // Respawn at entrance with half HP
    player.hp = Math.floor(player.maxHp / 2);
    dungeon.teleportPlayer(playerId, 'entrance');
    handleLook(ws, dungeon, playerId);
  }
}

function handleMove(
  ws: WebSocket,
  wss: WebSocketServer,
  dungeon: DungeonState,
  playerId: string,
  args: string[],
): void {
  const player = dungeon.getPlayer(playerId)!;

  if (args.length === 0) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: 'Move where? Usage: MOVE <north|south|east|west|up|down>' },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const rawDir = args[0]!.toLowerCase();
  const direction = DIRECTION_ALIASES[rawDir] ?? rawDir;
  const previousRoomId = player.currentRoomId;
  const result = dungeon.movePlayer(playerId, direction);

  if (!result.success) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: result.message },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  // Broadcast departure from old room
  broadcastToRoom(wss, dungeon, previousRoomId, {
    type: 'event',
    event: 'player-moved',
    payload: {
      playerName: player.name,
      direction,
      action: 'left',
      ansi: `${FG[AnsiColor.BrightBlack]}${CP437.ARROW_RIGHT} ${player.name} headed ${direction}.${RESET}\r\n`,
    },
    playerId: null,
    timestamp: Date.now(),
  }, playerId);

  // Send room description to moving player
  const newRoom = result.room!;
  const monsters = dungeon.getRoomMonsters(newRoom.id);
  const otherPlayers = dungeon.getRoomPlayers(newRoom.id).filter(p => p.id !== playerId);

  sendEvent(ws, {
    type: 'event',
    event: 'room-description',
    payload: { ansi: renderRoomDescription(newRoom, monsters, otherPlayers) },
    playerId,
    timestamp: Date.now(),
  });

  // Broadcast arrival in new room
  broadcastToRoom(wss, dungeon, newRoom.id, {
    type: 'event',
    event: 'player-moved',
    payload: {
      playerName: player.name,
      direction,
      action: 'arrived',
      ansi: `${FG[AnsiColor.Cyan]}${CP437.ARROW_RIGHT} ${player.name} entered the room.${RESET}\r\n`,
    },
    playerId: null,
    timestamp: Date.now(),
  }, playerId);
}

function handleScan(
  ws: WebSocket,
  dungeon: DungeonState,
  playerId: string,
  args: string[],
): void {
  const player = dungeon.getPlayer(playerId)!;

  if (args.length === 0) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: 'Scan what? Usage: SCAN <monster name>' },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const targetQuery = args.join(' ');
  const monster = dungeon.findMonsterInRoom(player.currentRoomId, targetQuery);

  if (!monster) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: `No monster matching "${targetQuery}" found in this room.` },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  sendEvent(ws, {
    type: 'event',
    event: 'scan-result',
    payload: { ansi: renderScanResult(monster) },
    playerId,
    timestamp: Date.now(),
  });
}

function handlePatch(
  ws: WebSocket,
  wss: WebSocketServer,
  dungeon: DungeonState,
  playerId: string,
  args: string[],
): void {
  const player = dungeon.getPlayer(playerId)!;

  if (args.length === 0) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: 'Patch what? Usage: PATCH <monster name>' },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const targetQuery = args.join(' ');
  const monster = dungeon.findMonsterInRoom(player.currentRoomId, targetQuery);

  if (!monster) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: `No monster matching "${targetQuery}" found in this room.` },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const result = executePatch(player, monster);

  if (!result.success) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: result.message },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  sendEvent(ws, {
    type: 'event',
    event: 'combat-result',
    payload: {
      ansi: renderPatchResult(
        monster,
        result.damageDealt,
        result.solved,
        result.loot,
        result.xpEarned,
      ),
      patchResult: result,
    },
    playerId,
    timestamp: Date.now(),
  });

  if (result.solved) {
    broadcastToRoom(
      wss,
      dungeon,
      player.currentRoomId,
      {
        type: 'event',
        event: 'monster-slain',
        payload: {
          monsterName: monster.name,
          slainBy: player.name,
          xpReward: result.xpEarned,
          ansi: `${FG[AnsiColor.BrightYellow]}${CP437.STAR} ${player.name} resolved and patched defect ${monster.name}!${RESET}\r\n`,
        },
        playerId: null,
        timestamp: Date.now(),
      },
      playerId,
    );
  }
}

function handleCast(
  ws: WebSocket,
  wss: WebSocketServer,
  dungeon: DungeonState,
  playerId: string,
  args: string[],
): void {
  const player = dungeon.getPlayer(playerId)!;

  if (args.length === 0) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: 'Cast what? Usage: CAST <hotfix|refactor|rollback> [monster]' },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const spellName = args[0]!.toLowerCase();
  const targetQuery = args.slice(1).join(' ');
  const targetMonster = targetQuery
    ? dungeon.findMonsterInRoom(player.currentRoomId, targetQuery)
    : dungeon.getRoomMonsters(player.currentRoomId)[0];

  const result = executeSpell(player, spellName, targetMonster);

  if (!result.success) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: result.message },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  sendEvent(ws, {
    type: 'event',
    event: 'narration',
    payload: {
      ansi: renderSpellResult(
        result.spellName,
        result.message,
        result.hpHealed,
        result.damageDealt,
      ),
      spellResult: result,
    },
    playerId,
    timestamp: Date.now(),
  });

  if (result.targetSlain && targetMonster) {
    broadcastToRoom(
      wss,
      dungeon,
      player.currentRoomId,
      {
        type: 'event',
        event: 'monster-slain',
        payload: {
          monsterName: targetMonster.name,
          slainBy: player.name,
          xpReward: targetMonster.xpReward,
          ansi: `${FG[AnsiColor.BrightYellow]}${CP437.STAR} ${player.name} refactored ${targetMonster.name} out of existence!${RESET}\r\n`,
        },
        playerId: null,
        timestamp: Date.now(),
      },
      playerId,
    );
  }
}

async function handleRepo(
  ws: WebSocket,
  wss: WebSocketServer,
  dungeon: DungeonState,
  playerId: string,
  args: string[],
): Promise<void> {
  const player = dungeon.getPlayer(playerId)!;

  if (args.length === 0) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: { message: 'Load which repository? Usage: REPO <owner/repo>' },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const repoTarget = args[0]!.trim();
  const parts = repoTarget.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    sendEvent(ws, {
      type: 'event',
      event: 'error',
      payload: {
        message: 'Invalid repository format. Please use "owner/repo" (e.g. "fwesh001/necro-mud").',
      },
      playerId,
      timestamp: Date.now(),
    });
    return;
  }

  const [owner, repo] = parts as [string, string];

  sendEvent(ws, {
    type: 'event',
    event: 'narration',
    payload: {
      ansi: `\r\n${FG[AnsiColor.BrightYellow]}${CP437.SPADE} Commencing GitHub ritual for ${owner}/${repo}...\r\n${CP437.ARROW_RIGHT} Parsing repository tree and issues...${RESET}\r\n`,
    },
    playerId,
    timestamp: Date.now(),
  });

  const { rooms, monsters } = await generateDungeonFromRepo({
    owner,
    repo,
    token: process.env.GITHUB_TOKEN,
  });

  dungeon.loadDungeon(rooms, monsters);

  broadcastGlobal(wss, {
    type: 'event',
    event: 'repo-loaded',
    payload: {
      owner,
      repo,
      roomCount: rooms.length,
      monsterCount: monsters.length,
      ansi: `\r\n${FG[AnsiColor.BrightGreen]}${CP437.DOUBLE_HORIZONTAL.repeat(4)} REALITY SHIFTS! ${CP437.DOUBLE_HORIZONTAL.repeat(4)}${RESET}\r\n${FG[AnsiColor.BrightYellow]}${player.name} transformed the dungeon into:\r\n  ${owner}/${repo}!${RESET}\r\n${FG[AnsiColor.Cyan]}${rooms.length} rooms generated, ${monsters.length} monsters materialized.${RESET}\r\n`,
    },
    playerId: null,
    timestamp: Date.now(),
  });

  const entrance = dungeon.getRoom('entrance');
  if (entrance) {
    const entranceMonsters = dungeon.getRoomMonsters('entrance');
    const otherPlayers = dungeon.getRoomPlayers('entrance').filter(p => p.id !== playerId);
    sendEvent(ws, {
      type: 'event',
      event: 'room-description',
      payload: { ansi: renderRoomDescription(entrance, entranceMonsters, otherPlayers) },
      playerId,
      timestamp: Date.now(),
    });
  }
}

function handleSay(
  wss: WebSocketServer,
  dungeon: DungeonState,
  playerId: string,
  args: string[],
): void {
  const player = dungeon.getPlayer(playerId)!;
  const message = args.join(' ');

  if (!message) return;

  broadcastToRoom(wss, dungeon, player.currentRoomId, {
    type: 'event',
    event: 'chat',
    payload: {
      ansi: `${FG[AnsiColor.Cyan]}${player.name}${RESET} says: "${message}"\r\n`,
      playerName: player.name,
      message,
    },
    playerId: null,
    timestamp: Date.now(),
  });
}
