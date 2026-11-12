import test from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import {
  clampHpRatio,
  computeHpSegments,
  computeQuestObjective,
  parseRoomDescription,
  parseScanResult,
  parseStatusView,
  stripAnsi,
  wrapTerminalText,
} from '../../app/lib/telemetry.js';
import { deriveHealthUrl, resolveWsUrl } from '../../app/lib/endpoints.js';

const sgrSequenceArb = fc
  .array(fc.integer({ min: 0, max: 107 }), { minLength: 1, maxLength: 4 })
  .map(codes => `\x1b[${codes.join(';')}m`);

const ansiMixedTextArb = fc
  .array(
    fc.oneof(
      fc.string({ minLength: 0, maxLength: 45 }),
      sgrSequenceArb,
      fc.constantFrom('\n', '\r\n', ' ', '\t', '╔═══╗', '☠', '†'),
    ),
    { minLength: 0, maxLength: 20 },
  )
  .map(parts => parts.join(''));

test('PBT: stripAnsi removes all SGR sequences and is strictly idempotent', () => {
  fc.assert(
    fc.property(ansiMixedTextArb, (input) => {
      const stripped = stripAnsi(input);
      assert.equal(stripAnsi(stripped), stripped);
      assert.equal(/\x1b\[[0-9;?]*[ -/]*[@-~]/.test(stripped), false);
    }),
    { numRuns: 1000 },
  );
});

test('PBT: wrapTerminalText preserves 80-column max visible width invariant across arbitrary inputs', () => {
  fc.assert(
    fc.property(
      ansiMixedTextArb,
      fc.integer({ min: 10, max: 80 }),
      (text, maxCols) => {
        const lines = wrapTerminalText(text, maxCols);
        assert.ok(lines.length >= 1);
        for (const line of lines) {
          const visibleWidth = stripAnsi(line).length;
          assert.ok(
            visibleWidth <= maxCols,
            `Expected visible width <= ${maxCols}, got ${visibleWidth} in line: ${JSON.stringify(line)}`,
          );
        }
      },
    ),
    { numRuns: 1200 },
  );
});

test('PBT: clampHpRatio and computeHpSegments always remain bounded [0..100] and [0..total]', () => {
  const numberEdgeArb = fc.oneof(
    fc.integer({ min: -10000, max: 10000 }),
    fc.double({ min: -1e6, max: 1e6 }),
    fc.constantFrom(0, -0, NaN, Infinity, -Infinity),
  );

  fc.assert(
    fc.property(
      numberEdgeArb,
      numberEdgeArb,
      fc.integer({ min: 1, max: 40 }),
      (hp, maxHp, totalSegments) => {
        const ratio = clampHpRatio(hp, maxHp);
        assert.ok(Number.isFinite(ratio));
        assert.ok(ratio >= 0 && ratio <= 1);

        const segs = computeHpSegments(hp, maxHp, totalSegments);
        assert.ok(segs.pct >= 0 && segs.pct <= 100);
        assert.ok(segs.filled >= 0 && segs.filled <= segs.total);
        assert.equal(segs.total, totalSegments);
      },
    ),
    { numRuns: 1200 },
  );
});

test('PBT: deriveHealthUrl always maps ws:// and wss:// endpoints to /api/health', () => {
  const hostArb = fc.domain();
  const portArb = fc.option(fc.integer({ min: 80, max: 65535 }), { nil: undefined });
  const protoArb = fc.constantFrom('ws', 'wss');

  fc.assert(
    fc.property(protoArb, hostArb, portArb, (proto, host, port) => {
      const wsUrl = resolveWsUrl(`${proto}://${host}${port ? `:${port}` : ''}/`);
      const health = deriveHealthUrl(wsUrl);
      const expectedProto = proto === 'wss' ? 'https://' : 'http://';
      assert.ok(health.startsWith(expectedProto), `Unexpected protocol in ${health}`);
      assert.ok(health.endsWith('/api/health'), `Unexpected path in ${health}`);
    }),
    { numRuns: 1000 },
  );
});

test('PBT: HUD ANSI parsers never throw on arbitrary fuzzed payloads', () => {
  fc.assert(
    fc.property(ansiMixedTextArb, (raw) => {
      const room = parseRoomDescription(raw);
      assert.ok(Array.isArray(room.monsters));
      assert.ok(Array.isArray(room.exits));

      const status = parseStatusView(raw);
      if (status.hp !== undefined) assert.ok(Number.isFinite(status.hp));
      if (status.xp !== undefined) assert.ok(Number.isFinite(status.xp));

      const scan = parseScanResult(raw);
      assert.ok(scan === null || typeof scan.target === 'string');
    }),
    { numRuns: 1000 },
  );
});

test('PBT: parseRoomDescription extracts unlocked exits accurately and computeQuestObjective always yields valid Step 1-4', () => {
  const dirArb = fc.constantFrom('north', 'south', 'east', 'west', 'up', 'down') as fc.Arbitrary<
    'north' | 'south' | 'east' | 'west' | 'up' | 'down'
  >;

  fc.assert(
    fc.property(
      fc.uniqueArray(dirArb, { minLength: 1, maxLength: 4 }),
      fc.boolean(),
      fc.boolean(),
      fc.boolean(),
      (dirs, hasMonster, scanned, hasScroll) => {
        const exitsBlock = dirs.map(d => `  ► \x1b[97m${d}\x1b[0m`).join('\r\n');
        const monstersBlock = hasMonster ? '\r\n\x1b[91m☠ Monsters:\x1b[0m\r\n  † Bug #1 [MINION]' : '';
        const roomAnsi = `\x1b[1;32mTest Chamber\x1b[0m\r\nDesc\r\n[src/]\r\n\r\nExits:\r\n${exitsBlock}${monstersBlock}\r\n`;

        const parsed = parseRoomDescription(roomAnsi);
        assert.deepEqual(parsed.exits, dirs);

        const obj = computeQuestObjective({
          monsters: parsed.monsters,
          lastScan: scanned && hasMonster ? {
            target: 'Bug #1',
            origin: 'bug',
            tier: 'minion',
            hp: '30/30',
            atk: '7',
            def: '3',
            labels: [],
            source: '',
            description: '',
            snippet: null,
          } : null,
          inventory: hasScroll ? ['scroll-hotfix'] : [],
          exits: parsed.exits,
        });

        assert.ok([1, 2, 3, 4].includes(obj.step));
        assert.ok(obj.text.startsWith(`STEP ${obj.step}/4:`));
        if (hasScroll) assert.equal(obj.step, 4);
        else if (!hasMonster) assert.equal(obj.step, 1);
        else if (scanned) assert.equal(obj.step, 3);
        else assert.equal(obj.step, 2);
      },
    ),
    { numRuns: 1000 },
  );
});

