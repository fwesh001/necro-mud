/**
 * Necro-MUD Server — Entry Point
 *
 * Express HTTP server + WebSocket server sharing port 4000.
 * Handles multiplayer MUD sessions over WebSockets.
 */

import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { handleConnection } from './ws/handler.js';
import { DungeonState } from './engine/dungeon.js';
import { generateDungeonFromRepo } from './engine/github-parser.js';
import { getWelcomeBanner } from './ansi/banner.js';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ── Express App ──────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'alive',
    name: 'necro-mud',
    version: '0.1.0',
    players: dungeon.getPlayerCount(),
    rooms: dungeon.getRoomCount(),
    uptime: process.uptime(),
  });
});

// ── Dungeon Initialisation ───────────────────────────────────────────
const { rooms, monsters } = generateDungeonFromRepo();
const dungeon = new DungeonState(rooms, monsters);

// ── HTTP + WebSocket Server ──────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  handleConnection(ws, req, dungeon, wss);
});

// ── Start ────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(getWelcomeBanner());
  console.log(`\n  ⚔  Necro-MUD server listening on http://localhost:${PORT}`);
  console.log(`  ⚔  WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`  ⚔  Dungeon loaded: ${dungeon.getRoomCount()} rooms, ${dungeon.getMonsterCount()} monsters\n`);
});

export { app, server, wss, dungeon };

