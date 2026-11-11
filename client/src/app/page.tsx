'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ServerEventPacket } from '@necro-mud/shared';
import {
  CrtBezel,
  type PhosphorMode,
  type CrtIntensity,
  type PowerPhase,
} from './components/CrtBezel';
import { BootSequence } from './components/BootSequence';
import {
  TacticalHud,
  type HudTelemetry,
  type ConnectionState,
} from './components/TacticalHud';
import { PatchModal } from './components/PatchModal';
import { getClientWsUrl } from './lib/endpoints';
import { getSoundEngine } from './lib/sound-engine';
import {
  parsePatchTargetName,
  parseRoomDescription,
  parseScanResult,
  parseStatusView,
} from './lib/telemetry';

// XTerm.js MUST be loaded client-side only — SSR will throw `window is not defined`
const Terminal = dynamic(
  () => import('./components/Terminal').then(mod => ({ default: mod.Terminal })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full font-mono text-sm opacity-60">
        Loading terminal...
      </div>
    ),
  },
);

const PHOSPHOR_CYCLE: PhosphorMode[] = ['green', 'amber', 'blood', 'vga'];
const INTENSITY_CYCLE: CrtIntensity[] = ['high', 'low', 'off'];

export default function HomePage() {
  const wsUrl = getClientWsUrl();
  const [bootComplete, setBootComplete] = useState(false);
  const [phosphorMode, setPhosphorMode] = useState<PhosphorMode>('green');
  const [crtIntensity, setCrtIntensity] = useState<CrtIntensity>('high');
  const [powerOn, setPowerOn] = useState(true);
  const [powerPhase, setPowerPhase] = useState<PowerPhase>('on');
  const [isDegaussing, setIsDegaussing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const [hudOpen, setHudOpen] = useState(true);
  const [patchModalOpen, setPatchModalOpen] = useState(false);
  const [selectedMonster, setSelectedMonster] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [telemetry, setTelemetry] = useState<HudTelemetry>({
    playerId: 'pending',
    playerName: 'Adventurer',
    title: 'Intern Drifter',
    hp: 100,
    maxHp: 100,
    xp: 0,
    bugsSquashed: 0,
    inventory: [],
    roomName: 'The Repository Gates',
    roomPath: '/',
    monsters: [],
    mountedRepo: 'fwesh001/necro-mud',
    repoStatus: 'ready',
    roomCount: null,
    monsterCount: null,
    lastScan: null,
    topHacker: null,
    lastEventLabel: 'BOOT',
  });

  const commandSenderRef = useRef<((cmd: string) => void) | null>(null);
  const powerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const degaussTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync persisted audio preferences after mount
  useEffect(() => {
    const sound = getSoundEngine();
    setMuted(sound.isMuted());
    setAmbientOn(sound.isAmbientEnabled());

    return () => {
      if (powerTimerRef.current) clearTimeout(powerTimerRef.current);
      if (degaussTimerRef.current) clearTimeout(degaussTimerRef.current);
    };
  }, []);

  const handleCyclePhosphor = useCallback(() => {
    getSoundEngine().unlock();
    getSoundEngine().playKeystroke();
    setPhosphorMode(prev => {
      const idx = PHOSPHOR_CYCLE.indexOf(prev);
      return PHOSPHOR_CYCLE[(idx + 1) % PHOSPHOR_CYCLE.length]!;
    });
  }, []);

  const handleCycleIntensity = useCallback(() => {
    getSoundEngine().unlock();
    getSoundEngine().playKeystroke();
    setCrtIntensity(prev => {
      const idx = INTENSITY_CYCLE.indexOf(prev);
      return INTENSITY_CYCLE[(idx + 1) % INTENSITY_CYCLE.length]!;
    });
  }, []);

  const handleDegauss = useCallback(() => {
    if (!powerOn || isDegaussing) return;
    const sound = getSoundEngine();
    sound.unlock();
    sound.playDegauss();

    setIsDegaussing(true);
    if (degaussTimerRef.current) clearTimeout(degaussTimerRef.current);
    degaussTimerRef.current = setTimeout(() => {
      setIsDegaussing(false);
    }, 920);
  }, [powerOn, isDegaussing]);

  const handleTogglePower = useCallback(() => {
    getSoundEngine().unlock();
    getSoundEngine().playKeystroke();

    if (powerTimerRef.current) clearTimeout(powerTimerRef.current);

    if (powerOn) {
      setPowerOn(false);
      setPowerPhase('collapsing');
      powerTimerRef.current = setTimeout(() => {
        setPowerPhase('off');
      }, 460);
    } else {
      setPowerOn(true);
      setPowerPhase('warming');
      powerTimerRef.current = setTimeout(() => {
        setPowerPhase('on');
      }, 520);
    }
  }, [powerOn]);

  const handleToggleMute = useCallback(() => {
    const sound = getSoundEngine();
    sound.unlock();
    const nextMuted = !muted;
    sound.setMuted(nextMuted);
    setMuted(nextMuted);
  }, [muted]);

  const handleToggleAmbient = useCallback(() => {
    const sound = getSoundEngine();
    sound.unlock();
    const nextAmbient = sound.toggleAmbientHum();
    setAmbientOn(nextAmbient);
  }, []);

  const handleServerEvent = useCallback((packet: ServerEventPacket) => {
    const payload = packet.payload;

    setTelemetry(prev => {
      const next: HudTelemetry = {
        ...prev,
        lastEventLabel: packet.event.toUpperCase(),
      };

      if (packet.event === 'welcome') {
        if (typeof payload.playerId === 'string') next.playerId = payload.playerId;
        if (typeof payload.playerName === 'string') next.playerName = payload.playerName;
      }

      if (packet.event === 'room-description' && typeof payload.ansi === 'string') {
        const parsed = parseRoomDescription(payload.ansi);
        if (parsed.roomName) next.roomName = parsed.roomName;
        next.roomPath = parsed.roomPath;
        next.monsters = parsed.monsters;
      }

      if (packet.event === 'combat-result') {
        const patchResult = payload.patchResult as
          | { solved?: boolean; xpEarned?: number; loot?: string[] }
          | undefined;

        if (patchResult) {
          if (typeof patchResult.xpEarned === 'number' && patchResult.xpEarned > 0) {
            next.xp = prev.xp + patchResult.xpEarned;
          }
          if (patchResult.solved) {
            next.bugsSquashed = prev.bugsSquashed + 1;
            const patchedName = typeof payload.ansi === 'string'
              ? parsePatchTargetName(payload.ansi)
              : null;
            if (patchedName) {
              next.monsters = prev.monsters.filter(m => m.name !== patchedName);
            }
          }
          if (Array.isArray(patchResult.loot) && patchResult.loot.length > 0) {
            const merged = new Set(prev.inventory);
            for (const item of patchResult.loot) {
              if (typeof item === 'string') merged.add(item);
            }
            next.inventory = Array.from(merged);
          }
        } else {
          if (typeof payload.attackerHp === 'number') next.hp = payload.attackerHp;
          if (typeof payload.attackerMaxHp === 'number') next.maxHp = payload.attackerMaxHp;
          if (payload.targetSlain === true && typeof payload.targetName === 'string') {
            next.monsters = prev.monsters.filter(m => m.name !== payload.targetName);
            next.bugsSquashed = prev.bugsSquashed + 1;
          }
        }
      }

      if (packet.event === 'monster-slain' && typeof payload.monsterName === 'string') {
        next.monsters = prev.monsters.filter(m => m.name !== payload.monsterName);
      }

      if (packet.event === 'scan-result' && typeof payload.ansi === 'string') {
        const scan = parseScanResult(payload.ansi);
        if (scan) next.lastScan = scan;
      }

      if (packet.event === 'narration' && payload.spellResult && typeof payload.spellResult === 'object') {
        const spell = payload.spellResult as {
          success?: boolean;
          spellName?: string;
          hpHealed?: number;
          targetSlain?: boolean;
        };
        if (spell.success) {
          if (typeof spell.hpHealed === 'number' && spell.hpHealed > 0) {
            next.hp = Math.min(prev.maxHp, prev.hp + spell.hpHealed);
          }
          if (typeof spell.spellName === 'string') {
            const scrollSlug = `scroll-${spell.spellName.toLowerCase()}`;
            const idx = prev.inventory.indexOf(scrollSlug);
            if (idx !== -1) {
              next.inventory = prev.inventory.filter((_, i) => i !== idx);
            }
          }
        }
      }

      if (packet.event === 'status-view' && typeof payload.ansi === 'string') {
        const parsed = parseStatusView(payload.ansi);
        if (parsed.title) next.title = parsed.title;
        if (parsed.hp !== undefined) next.hp = parsed.hp;
        if (parsed.maxHp !== undefined) next.maxHp = parsed.maxHp;
        if (parsed.xp !== undefined) next.xp = parsed.xp;
        if (parsed.bugsSquashed !== undefined) next.bugsSquashed = parsed.bugsSquashed;
        if (parsed.inventory !== undefined) next.inventory = parsed.inventory;
      }

      if (packet.event === 'repo-loaded') {
        const owner = typeof payload.owner === 'string' ? payload.owner : '';
        const repo = typeof payload.repo === 'string' ? payload.repo : '';
        if (owner && repo) {
          next.mountedRepo = `${owner}/${repo}`;
        }
        next.repoStatus = 'ready';
        next.roomCount = typeof payload.roomCount === 'number' ? payload.roomCount : prev.roomCount;
        next.monsterCount = typeof payload.monsterCount === 'number' ? payload.monsterCount : prev.monsterCount;
        next.lastScan = null;
      }

      if (packet.event === 'leaderboard-view' && Array.isArray(payload.records)) {
        const records = payload.records as Array<{
          name?: string;
          xp?: number;
          title?: string;
          bugsSquashed?: number;
        }>;
        const first = records[0];
        if (first?.name && typeof first.xp === 'number' && first.title) {
          next.topHacker = { name: first.name, xp: first.xp, title: first.title };
        }
        const mine = records.find(r => r.name === prev.playerName);
        if (mine) {
          if (typeof mine.xp === 'number') next.xp = mine.xp;
          if (typeof mine.title === 'string') next.title = mine.title;
          if (typeof mine.bugsSquashed === 'number') next.bugsSquashed = mine.bugsSquashed;
        }
      }

      if (packet.event === 'error') {
        next.repoStatus = 'ready';
      }

      return next;
    });
  }, []);

  const handleConnectionChange = useCallback((state: ConnectionState, rtt?: number | null) => {
    setConnectionState(state);
    if (rtt !== undefined) setLatencyMs(rtt);
  }, []);

  const handleSendCommand = useCallback((cmd: string) => {
    commandSenderRef.current?.(cmd);
  }, []);

  const handleMountRepo = useCallback((repoSlug: string) => {
    setTelemetry(prev => ({
      ...prev,
      mountedRepo: repoSlug,
      repoStatus: 'loading',
    }));
    commandSenderRef.current?.(`REPO ${repoSlug}`);
  }, []);

  const activeTarget =
    telemetry.monsters.find(m => m.name === selectedMonster)?.name
    ?? telemetry.monsters[0]?.name
    ?? null;

  return (
    <main className="flex items-center justify-center min-h-screen bg-[#030303] p-3 sm:p-5">
      <div className="w-full max-w-[1440px] flex flex-col lg:flex-row items-stretch justify-center gap-4">
        <CrtBezel
          phosphorMode={phosphorMode}
          onCyclePhosphor={handleCyclePhosphor}
          crtIntensity={crtIntensity}
          onCycleIntensity={handleCycleIntensity}
          powerOn={powerOn}
          powerPhase={powerPhase}
          onTogglePower={handleTogglePower}
          muted={muted}
          onToggleMute={handleToggleMute}
          ambientOn={ambientOn}
          onToggleAmbient={handleToggleAmbient}
          isDegaussing={isDegaussing}
          onDegauss={handleDegauss}
          hudOpen={hudOpen}
          onToggleHud={() => setHudOpen(prev => !prev)}
        >
          {!bootComplete ? (
            <BootSequence
              wsUrl={wsUrl}
              onComplete={() => setBootComplete(true)}
            />
          ) : (
            <Terminal
              wsUrl={wsUrl}
              phosphorMode={phosphorMode}
              onServerEvent={handleServerEvent}
              onConnectionChange={handleConnectionChange}
              onRegisterSender={(fn) => {
                commandSenderRef.current = fn;
              }}
            />
          )}
        </CrtBezel>

        <TacticalHud
          open={hudOpen}
          connectionState={connectionState}
          latencyMs={latencyMs}
          telemetry={telemetry}
          phosphorMode={phosphorMode}
          crtIntensity={crtIntensity}
          muted={muted}
          selectedMonster={selectedMonster}
          onSelectMonster={setSelectedMonster}
          onOpenPatchModal={() => {
            getSoundEngine().unlock();
            getSoundEngine().playKeystroke();
            setPatchModalOpen(true);
          }}
          onSendCommand={handleSendCommand}
          onMountRepo={handleMountRepo}
        />
      </div>

      <PatchModal
        open={patchModalOpen}
        onClose={() => setPatchModalOpen(false)}
        activeTarget={activeTarget}
        monsters={telemetry.monsters}
        scanDetails={telemetry.lastScan}
        inventory={telemetry.inventory}
        connected={connectionState === 'connected'}
        onSelectTarget={(name) => setSelectedMonster(name)}
        onSendCommand={handleSendCommand}
      />
    </main>
  );
}
