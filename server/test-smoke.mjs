/**
 * Smoke test for Necro-MUD Server
 *
 * Verifies:
 *   1. HTTP /api/health
 *   2. WebSocket connection
 *   3. Welcome packet & initial room description
 *   4. Commands: HELP, LOOK, MAP, STATUS, MOVE, SCAN, PATCH, CAST, ATTACK, REPO, TOP
 *   5. Raw Telnet Bridge on port 2323
 *   6. Line length constraint (all visible ANSI lines <= 80 chars)
 */

import http from 'node:http';
import net from 'node:net';
import { WebSocket } from 'ws';

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function checkAnsiWidth(ansiText, context) {
  const lines = ansiText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const visible = stripAnsi(lines[i]);
    if (visible.length > 80) {
      throw new Error(`[ANSI 80-col violation in ${context} line ${i + 1}]: len=${visible.length} > 80\n"${visible}"`);
    }
  }
}

async function testHealth() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:4000/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status !== 'alive') {
            return reject(new Error(`Unexpected health status: ${data}`));
          }
          console.log('  [PASS] /api/health endpoint:', json);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function testWs() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:4000');
    const events = [];
    let playerId = null;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Smoke test timed out after receiving ${events.length} events`));
    }, 15000);

    let room2Monster = 'monster-bug-42';

    function sendCommand(cmd, args = []) {
      ws.send(JSON.stringify({
        type: 'command',
        command: cmd,
        args,
        playerId,
        timestamp: Date.now(),
      }));
    }

    ws.on('open', () => {
      console.log('  [PASS] WebSocket connection opened');
    });

    ws.on('message', async (data) => {
      const packet = JSON.parse(data.toString());
      events.push(packet);

      if (packet.payload?.ansi && typeof packet.payload.ansi === 'string') {
        checkAnsiWidth(packet.payload.ansi, packet.event);
      }

      if (packet.event === 'welcome') {
        playerId = packet.payload.playerId;
        console.log(`  [PASS] Received welcome event for ${playerId}`);
        sendCommand('HELP');
      } else if (packet.event === 'help-text') {
        console.log('  [PASS] Received help-text');
        sendCommand('LOOK');
      } else if (packet.event === 'room-description' && events.filter(e => e.event === 'room-description').length === 2) {
        console.log('  [PASS] Received room-description for LOOK');
        sendCommand('STATUS');
      } else if (packet.event === 'status-view') {
        console.log('  [PASS] Received status-view');
        sendCommand('MAP');
      } else if (packet.event === 'map-view') {
        console.log('  [PASS] Received map-view');
        sendCommand('MOVE', ['north']);
      } else if (packet.event === 'room-description' && events.filter(e => e.event === 'room-description').length === 3) {
        console.log('  [PASS] Moved north successfully');
        const cleanRoom = stripAnsi(packet.payload.ansi ?? '');
        const match = cleanRoom.match(/†\s+(.+?)\s+\[(?:MINION|ELITE|BOSS)\]/i);
        room2Monster = match ? match[1].trim() : 'monster-bug-42';
        sendCommand('SCAN', [room2Monster]);
      } else if (packet.event === 'scan-result') {
        console.log(`  [PASS] Received scan-result for ${room2Monster}`);
        sendCommand('PATCH', [room2Monster]);
      } else if (packet.event === 'combat-result' && packet.payload.patchResult) {
        console.log('  [PASS] Received PATCH result');
        sendCommand('CAST', ['hotfix']);
      } else if (packet.event === 'narration' && packet.payload.spellResult) {
        console.log('  [PASS] Received CAST hotfix result');
        sendCommand('ATTACK', [room2Monster]);
      } else if (packet.event === 'combat-result' && !packet.payload.patchResult) {
        console.log('  [PASS] Received ATTACK combat-result with gothic narration');
        sendCommand('REPO', ['fwesh001/necro-mud']);
      } else if (packet.event === 'repo-loaded') {
        console.log('  [PASS] Received repo-loaded event! Reality shifted successfully!');
        sendCommand('TOP');
      } else if (packet.event === 'leaderboard-view') {
        console.log('  [PASS] Received leaderboard-view (Hall of Fame)!');
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function testTelnet() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ port: 2323, host: '127.0.0.1' }, () => {
      console.log('  [PASS] Raw Telnet connection opened on port 2323');
    });

    let received = '';
    const timeout = setTimeout(() => {
      socket.end();
      reject(new Error('Telnet test timed out'));
    }, 6000);

    socket.on('data', (chunk) => {
      received += chunk.toString('utf-8');
      if (received.includes('NECRO-MUD') && received.includes('Repository Gates')) {
        checkAnsiWidth(received, 'telnet-stream');
        console.log('  [PASS] Telnet received authentic ANSI welcome & room banner!');
        clearTimeout(timeout);
        socket.end();
        resolve();
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function run() {
  console.log('Starting Necro-MUD Complete Backend Smoke Tests...');
  try {
    await testHealth();
    await testWs();
    await testTelnet();
    console.log('\n>>> ALL BACKEND SMOKE TESTS PASSED (HTTP, WS, TELNET)! <<<\n');
    process.exit(0);
  } catch (err) {
    console.error('\nXXX SMOKE TEST FAILED: XXX', err);
    process.exit(1);
  }
}

run();
