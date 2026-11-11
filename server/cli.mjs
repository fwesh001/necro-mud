/**
 * Necro-MUD Interactive Terminal Client
 *
 * Playable CLI client for testing the dungeon crawler directly in your terminal.
 *
 * Usage:
 *   node server/cli.mjs [player-name]
 */

import readline from 'node:readline';
import { WebSocket } from 'ws';

const playerName = process.argv[2] ?? `Adventurer-${Math.floor(1000 + Math.random() * 9000)}`;
const WS_URL = process.env.WS_URL ?? 'ws://localhost:4000';

console.log(`\x1b[36mConnecting to Necro-MUD at ${WS_URL} as "${playerName}"...\x1b[0m\n`);

const ws = new WebSocket(WS_URL);
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '\x1b[32m[NECRO-MUD]>\x1b[0m ',
});

let myPlayerId = null;

ws.on('open', () => {
  // Connected
});

ws.on('message', (data) => {
  try {
    const packet = JSON.parse(data.toString());

    if (packet.event === 'welcome') {
      myPlayerId = packet.payload.playerId;
      if (packet.payload.banner) {
        process.stdout.write(packet.payload.banner + '\r\n');
      }
      if (packet.payload.message) {
        process.stdout.write(packet.payload.message + '\r\n');
      }
    } else if (packet.payload?.ansi) {
      process.stdout.write(packet.payload.ansi + '\r\n');
    } else if (packet.payload?.message) {
      process.stdout.write(`\x1b[33m${packet.payload.message}\x1b[0m\r\n`);
    }

    rl.prompt();
  } catch {
    process.stdout.write(data.toString() + '\r\n');
    rl.prompt();
  }
});

ws.on('close', () => {
  console.log('\n\x1b[31mConnection closed by server.\x1b[0m');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('\x1b[31mWebSocket error:\x1b[0m', err.message);
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    rl.prompt();
    return;
  }

  if (trimmed.toUpperCase() === 'QUIT' || trimmed.toUpperCase() === 'EXIT') {
    ws.close();
    process.exit(0);
  }

  const parts = trimmed.split(/\s+/);
  const command = parts[0]!.toUpperCase();
  const args = parts.slice(1);

  // Send typed CommandPacket
  ws.send(
    JSON.stringify({
      type: 'command',
      command,
      args,
      playerId: myPlayerId,
      timestamp: Date.now(),
    })
  );
});

