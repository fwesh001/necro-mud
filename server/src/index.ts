/**
 * Necro-MUD Server — Entry Point
 *
 * Express HTTP server + WebSocket server sharing port 4000.
 * Handles multiplayer MUD sessions over WebSockets.
 */

import dns from 'node:dns';
import express, { type Express } from 'express';
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { AnsiColor, CP437, FG, RESET } from '@necro-mud/shared';
import { broadcastGlobal, handleConnection } from './ws/handler.js';
import { DungeonState } from './engine/dungeon.js';
import { generateDungeonFromRepo, generateMockDungeon } from './engine/github-parser.js';
import { hasAiDmKey } from './engine/ai-dm.js';
import { renderRoomDescription } from './ansi/renderer.js';
import { getWelcomeBanner } from './ansi/banner.js';
import { startTelnetBridge } from './telnet/bridge.js';

const DEFAULT_BOOT_OWNER = 'fwesh001';
const DEFAULT_BOOT_REPO = 'necro-mud';

/**
 * Load local `server/src/.env` variables into `process.env` without overriding
 * environment variables provided by the host (e.g., Render). Zero dependencies.
 */
function loadLocalEnv(): void {
  const candidates = [
    resolve(process.cwd(), 'server/src/.env'),
    resolve(process.cwd(), 'src/.env'),
    fileURLToPath(new URL('../src/.env', import.meta.url)),
  ];

  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    try {
      const content = readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*=\s*['"]?([^'"\r\n]*)['"]?\s*$/);
        if (!match) continue;
        const [, key, rawVal] = match;
        if (key && rawVal !== undefined && !process.env[key]) {
          process.env[key] = rawVal.trim();
        }
      }
      return;
    } catch {
      // Ignore unreadable local env file
    }
  }
}

dns.setDefaultResultOrder('ipv4first');
loadLocalEnv();

const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ── Express App ──────────────────────────────────────────────────────
const app: Express = express();
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'alive',
    name: 'necro-mud',
    version: '0.1.0',
    repo: dungeon.getMountedRepo(),
    live: dungeon.isLiveRepo(),
    aiDm: hasAiDmKey(),
    players: dungeon.getPlayerCount(),
    rooms: dungeon.getRoomCount(),
    monsters: dungeon.getMonsterCount(),
    uptime: process.uptime(),
  });
});

// ── Dungeon Initialisation (Mock seed -> Live GitHub Sync) ───────────
const mockSeed = generateMockDungeon();
const dungeon = new DungeonState(
  mockSeed.rooms,
  mockSeed.monsters,
  `${DEFAULT_BOOT_OWNER}/${DEFAULT_BOOT_REPO}`,
  false,
);

// ── HTTP + WebSocket Server ──────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const initialSyncPromise: Promise<void> = (async () => {
  if (process.env.NECRO_MOCK_BOOT === '1') return;

  const { rooms, monsters } = await generateDungeonFromRepo({
    owner: DEFAULT_BOOT_OWNER,
    repo: DEFAULT_BOOT_REPO,
    token: process.env.GITHUB_TOKEN,
  });

  if (dungeon.hasManualRepoOverride()) return;

  const isLive = rooms[0]?.name.includes(`${DEFAULT_BOOT_OWNER}/${DEFAULT_BOOT_REPO}`) ?? false;
  if (!isLive) {
    console.warn(`[Boot] Using offline mock dungeon fallback for ${DEFAULT_BOOT_OWNER}/${DEFAULT_BOOT_REPO}.`);
    return;
  }

  dungeon.loadDungeon(rooms, monsters, `${DEFAULT_BOOT_OWNER}/${DEFAULT_BOOT_REPO}`, true, false);
  console.log(
    `  ✦  Live repo synced (${DEFAULT_BOOT_OWNER}/${DEFAULT_BOOT_REPO}): ${rooms.length} rooms, ${monsters.length} monsters`,
  );

  if (wss.clients.size > 0) {
    broadcastGlobal(wss, {
      type: 'event',
      event: 'repo-loaded',
      payload: {
        owner: DEFAULT_BOOT_OWNER,
        repo: DEFAULT_BOOT_REPO,
        roomCount: rooms.length,
        monsterCount: monsters.length,
        ansi: `\r\n${FG[AnsiColor.BrightGreen]}${CP437.STAR} Live GitHub tree synchronized for ${DEFAULT_BOOT_OWNER}/${DEFAULT_BOOT_REPO} (${rooms.length} rooms, ${monsters.length} entities).${RESET}\r\n`,
      },
      playerId: null,
      timestamp: Date.now(),
    });
    const entrance = dungeon.getRoom('entrance');
    if (entrance) {
      broadcastGlobal(wss, {
        type: 'event',
        event: 'room-description',
        payload: { ansi: renderRoomDescription(entrance, dungeon.getRoomMonsters('entrance'), []) },
        playerId: null,
        timestamp: Date.now(),
      });
    }
  }
})().catch((err) => {
  console.warn('[Boot] Live GitHub startup sync failed; continuing with mock fallback:', err?.message ?? err);
});

wss.on('connection', (ws, req) => {
  void handleConnection(ws, req, dungeon, wss, initialSyncPromise);
});

// ── Start ────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(getWelcomeBanner());
  console.log(`\n  ⚔  Necro-MUD server listening on http://localhost:${PORT}`);
  console.log(`  ⚔  WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`  ⚔  Initial dungeon seeded: ${dungeon.getRoomCount()} rooms, ${dungeon.getMonsterCount()} monsters | AI DM: ${hasAiDmKey() ? 'ENABLED' : 'FALLBACK'}`);
  console.log(`  ⚔  Syncing live GitHub repo ${DEFAULT_BOOT_OWNER}/${DEFAULT_BOOT_REPO}...\n`);
  startTelnetBridge(dungeon, wss);
});

export { app, server, wss, dungeon };

