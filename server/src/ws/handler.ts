/**
 * WebSocket Connection Handler
 *
 * Manages the lifecycle of a single player's WebSocket session:
 * connect → authenticate → command loop → disconnect.
 */

import type { IncomingMessage } from 'node:http';
import type { WebSocket, WebSocketServer } from 'ws';
import type { CommandPacket, ServerEventPacket } from '@necro-mud/shared';
import { AnsiColor, CP437, FG, RESET } from '@necro-mud/shared';
import { DungeonState } from '../engine/dungeon.js';
import { parseAndExecute } from '../commands/parser.js';
import { renderRoomDescription } from '../ansi/renderer.js';
import { getWelcomeBanner } from '../ansi/banner.js';

let nextPlayerId = 1;

/** Active WebSocket connections indexed by player ID for room-scoped broadcasts */
const playerSockets = new Map<string, WebSocket>();

/**
 * Handle a new WebSocket connection.
 * Waits briefly if initial live repo boot sync is still completing, creates a Player,
 * places them in the entrance, and starts the command loop.
 */
export async function handleConnection(
  ws: WebSocket,
  req: IncomingMessage,
  dungeon: DungeonState,
  wss: WebSocketServer,
  initialSyncPromise?: Promise<void>,
): Promise<void> {
  const queuedMessages: Buffer[] = [];
  let ready = false;

  const earlyBufferHandler = (data: Buffer) => {
    if (!ready) {
      queuedMessages.push(data);
    }
  };
  ws.on('message', earlyBufferHandler);

  if (initialSyncPromise) {
    await Promise.race([
      initialSyncPromise.catch(() => undefined),
      new Promise<void>(resolve => setTimeout(resolve, 2500)),
    ]);
  }

  if (ws.readyState !== ws.OPEN) {
    return;
  }

  const playerId = `player-${nextPlayerId++}`;
  const playerName = `Adventurer-${playerId.split('-')[1]!.padStart(4, '0')}`;
  const ip = req.socket.remoteAddress ?? 'unknown';

  console.log(`[WS] ${playerName} connected from ${ip}`);
  playerSockets.set(playerId, ws);

  // Create player and place in entrance
  const player = dungeon.addPlayer({
    id: playerId,
    name: playerName,
    hp: 100,
    maxHp: 100,
    attack: 12,
    defense: 8,
    xp: 0,
    currentRoomId: 'entrance',
    inventory: [],
    visitedRooms: ['entrance'],
    connectedAt: Date.now(),
  });

  // Send welcome event with active dungeon metadata
  sendEvent(ws, {
    type: 'event',
    event: 'welcome',
    payload: {
      playerId: player.id,
      playerName: player.name,
      mountedRepo: dungeon.getMountedRepo(),
      roomCount: dungeon.getRoomCount(),
      monsterCount: dungeon.getMonsterCount(),
      isLive: dungeon.isLiveRepo(),
      banner: getWelcomeBanner(),
      message: `${FG[AnsiColor.BrightGreen]}Welcome, ${player.name}. Your repository awaits...${RESET}\r\nType ${FG[AnsiColor.BrightYellow]}HELP${RESET} for a list of commands.\r\n`,
    },
    playerId: player.id,
    timestamp: Date.now(),
  });

  // Send initial room description
  const entranceRoom = dungeon.getRoom('entrance');
  if (entranceRoom) {
    const roomAnsi = renderRoomDescription(
      entranceRoom,
      dungeon.getRoomMonsters(entranceRoom.id),
      dungeon.getRoomPlayers(entranceRoom.id).filter(p => p.id !== playerId),
    );
    sendEvent(ws, {
      type: 'event',
      event: 'room-description',
      payload: { ansi: roomAnsi },
      playerId: player.id,
      timestamp: Date.now(),
    });
  }

  // Broadcast player join to others in the room
  broadcastToRoom(wss, dungeon, player.currentRoomId, {
    type: 'event',
    event: 'player-joined',
    payload: {
      playerName: player.name,
      roomId: player.currentRoomId,
      ansi: `${FG[AnsiColor.Cyan]}${CP437.STAR} ${player.name} materialized at the entrance.${RESET}\r\n`,
    },
    playerId: null,
    timestamp: Date.now(),
  }, playerId);

  const handleIncomingMessage = (data: Buffer | string) => {
    try {
      const raw = data.toString();
      let packet: CommandPacket;

      // Support both raw text commands and JSON packets
      try {
        const parsed = JSON.parse(raw) as Partial<CommandPacket>;
        if (parsed && parsed.type === 'command' && typeof parsed.command === 'string') {
          packet = {
            type: 'command',
            command: parsed.command.toUpperCase() as CommandPacket['command'],
            args: Array.isArray(parsed.args) ? parsed.args.map(String) : [],
            playerId,
            timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
          };
        } else {
          throw new Error('Not a command packet');
        }
      } catch {
        // Raw text input: parse as a simple command string
        const parts = raw.trim().split(/\s+/);
        const command = (parts[0] ?? '').toUpperCase();
        packet = {
          type: 'command',
          command: command as CommandPacket['command'],
          args: parts.slice(1),
          playerId,
          timestamp: Date.now(),
        };
      }

      if (!packet.command) return;

      parseAndExecute(packet, ws, wss, dungeon);
    } catch (err) {
      sendEvent(ws, {
        type: 'event',
        event: 'error',
        payload: { message: 'Failed to process command.' },
        playerId,
        timestamp: Date.now(),
      });
      console.error(`[WS] Error processing message from ${playerName}:`, err);
    }
  };

  // ── Command Loop ─────────────────────────────────────────────────
  ws.off('message', earlyBufferHandler);
  ready = true;
  ws.on('message', handleIncomingMessage);

  for (const buffered of queuedMessages) {
    handleIncomingMessage(buffered);
  }

  // ── Disconnect ───────────────────────────────────────────────────
  ws.on('close', () => {
    console.log(`[WS] ${playerName} disconnected`);
    playerSockets.delete(playerId);
    const roomId = dungeon.getPlayer(playerId)?.currentRoomId;
    dungeon.removePlayer(playerId);

    if (roomId) {
      broadcastToRoom(wss, dungeon, roomId, {
        type: 'event',
        event: 'player-left',
        payload: {
          playerName,
          ansi: `${FG[AnsiColor.BrightBlack]}${CP437.BULLET} ${playerName} vanished into the void.${RESET}\r\n`,
        },
        playerId: null,
        timestamp: Date.now(),
      });
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error for ${playerName}:`, err);
  });
}

// ── Helpers ────────────────────────────────────────────────────────

/** Send a ServerEventPacket to a single WebSocket client */
export function sendEvent(ws: WebSocket, event: ServerEventPacket): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

/**
 * Broadcast a ServerEventPacket to all players in a room,
 * optionally excluding one player (e.g. the sender).
 */
export function broadcastToRoom(
  _wss: WebSocketServer,
  dungeon: DungeonState,
  roomId: string,
  event: ServerEventPacket,
  excludePlayerId?: string,
): void {
  const playersInRoom = dungeon.getRoomPlayers(roomId);
  const serialized = JSON.stringify(event);

  for (const player of playersInRoom) {
    if (excludePlayerId && player.id === excludePlayerId) continue;
    const socket = playerSockets.get(player.id);
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(serialized);
    }
  }
}

/** Broadcast to every connected client */
export function broadcastGlobal(
  wss: WebSocketServer,
  event: ServerEventPacket,
): void {
  const message = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}
