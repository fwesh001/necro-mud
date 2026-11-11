/**
 * Raw Telnet Bridge
 *
 * Implements a vintage TCP Telnet server on port 2323 using node:net.
 * Allows retro BBS clients (PuTTY, SyncTERM, or native telnet) to connect directly
 * to the MUD and experience raw 16-color ANSI/CP437 gameplay.
 */

import net from 'node:net';
import type { WebSocket, WebSocketServer } from 'ws';
import type { CommandPacket } from '@necro-mud/shared';
import { DungeonState } from '../engine/dungeon.js';
import { parseAndExecute } from '../commands/parser.js';
import { getWelcomeBanner } from '../ansi/banner.js';
import { renderRoomDescription } from '../ansi/renderer.js';

let nextTelnetId = 1000;

// Telnet Protocol Bytes
const IAC = 0xff;
const WILL = 0xfb;
const ECHO = 0x01;
const SUPPRESS_GO_AHEAD = 0x03;

/** Strip Telnet command sequences from incoming binary stream */
function cleanTelnetInput(buf: Buffer): string {
  const cleanBytes: number[] = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === IAC) {
      i += 3; // Skip IAC <COMMAND> <OPTION>
    } else {
      cleanBytes.push(buf[i]!);
      i++;
    }
  }
  return Buffer.from(cleanBytes).toString('utf-8');
}

export function startTelnetBridge(
  dungeon: DungeonState,
  wss: WebSocketServer,
  port: number = parseInt(process.env.TELNET_PORT ?? '2323', 10),
): net.Server {
  const server = net.createServer((socket) => {
    const playerId = `telnet-${nextTelnetId++}`;
    const playerName = `DialIn-${playerId.split('-')[1]}`;
    const remoteIp = socket.remoteAddress ?? 'unknown';

    console.log(`[Telnet] ${playerName} connected from ${remoteIp}`);

    // Send Telnet Negotiations: WILL ECHO, WILL SUPPRESS_GO_AHEAD
    socket.write(Buffer.from([IAC, WILL, ECHO, IAC, WILL, SUPPRESS_GO_AHEAD]));

    // Register player into DungeonState
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

    // Minimal WebSocket shim to plug Telnet socket seamlessly into the command parser
    const wsShim = {
      readyState: 1, // WebSocket.OPEN
      send: (raw: string) => {
        try {
          const evt = JSON.parse(raw);
          if (evt?.payload?.ansi) {
            socket.write(evt.payload.ansi);
            socket.write('\r\n\x1b[32m[NECRO-MUD]>\x1b[0m ');
          } else if (evt?.payload?.message) {
            socket.write(`\r\n\x1b[31m${evt.payload.message}\x1b[0m\r\n\x1b[32m[NECRO-MUD]>\x1b[0m `);
          }
        } catch {
          socket.write(raw);
        }
      },
      close: () => socket.end(),
    } as unknown as WebSocket;

    // Send initial Banner & Room Description
    socket.write(getWelcomeBanner());
    socket.write(
      `\r\n\x1b[1;32mConnected via Telnet Bridge. Welcome, ${player.name}!\x1b[0m\r\nType \x1b[1;33mHELP\x1b[0m for commands.\r\n\r\n`
    );

    const entrance = dungeon.getRoom('entrance');
    if (entrance) {
      const roomAnsi = renderRoomDescription(
        entrance,
        dungeon.getRoomMonsters('entrance'),
        dungeon.getRoomPlayers('entrance').filter((p) => p.id !== playerId),
      );
      socket.write(roomAnsi);
    }
    socket.write('\r\n\x1b[32m[NECRO-MUD]>\x1b[0m ');

    let buffer = '';

    socket.on('data', (data) => {
      const text = cleanTelnetInput(data);
      buffer += text;

      if (buffer.includes('\n') || buffer.includes('\r')) {
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            socket.write('\x1b[32m[NECRO-MUD]>\x1b[0m ');
            continue;
          }

          const parts = trimmed.split(/\s+/);
          const command = parts[0]!.toUpperCase() as CommandPacket['command'];
          const args = parts.slice(1);

          const packet: CommandPacket = {
            type: 'command',
            command,
            args,
            playerId,
            timestamp: Date.now(),
          };

          parseAndExecute(packet, wsShim, wss, dungeon);
        }
      }
    });

    socket.on('close', () => {
      console.log(`[Telnet] ${playerName} disconnected`);
      dungeon.removePlayer(playerId);
    });

    socket.on('error', (err) => {
      console.warn(`[Telnet] Error from ${playerName}:`, err.message);
    });
  });

  server.listen(port, () => {
    console.log(`  ⚔  Raw Telnet bridge listening on port ${port} (telnet://localhost:${port})`);
  });

  return server;
}
