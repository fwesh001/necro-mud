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
  type HudMonster,
  type ConnectionState,
} from './components/TacticalHud';
import { getSoundEngine } from './lib/sound-engine';

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

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/** Parse room name, filepath, and living monsters from ANSI room-description output */
function parseRoomDescription(ansi: string): {
  roomName?: string;
  roomPath: string | null;
  monsters: HudMonster[];
} {
  const clean = stripAnsi(ansi);
  const lines = clean.split(/\r?\n/);

  let roomName: string | undefined;
  let roomPath: string | null = null;
  const monsters: HudMonster[] = [];

  for (const line of lines) {
    const trimmed = line.replace(/[╔╗╚╝═║]/g, '').trim();
    if (!trimmed) continue;

    if (!roomName) {
      roomName = trimmed;
      continue;
    }

    const pathMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (pathMatch && !['LOCKED', 'MINION', 'ELITE', 'BOSS'].includes(pathMatch[1] ?? '')) {
      roomPath = pathMatch[1] ?? null;
      continue;
    }

    // Monster lines start with CP437 sword †: "† Phantom Bug #42 [MINION] [██████████]"
    const monsterMatch = trimmed.match(/^†\s+(.+?)\s+\[(MINION|ELITE|BOSS)\]/i);
    if (monsterMatch) {
      monsters.push({
        name: monsterMatch[1]!.trim(),
        tier: monsterMatch[2]!.toLowerCase(),
      });
    }
  }

  return { roomName, roomPath, monsters };
}

export default function HomePage() {
  const [bootComplete, setBootComplete] = useState(false);
  const [phosphorMode, setPhosphorMode] = useState<PhosphorMode>('green');
  const [crtIntensity, setCrtIntensity] = useState<CrtIntensity>('high');
  const [powerOn, setPowerOn] = useState(true);
  const [powerPhase, setPowerPhase] = useState<PowerPhase>('on');
  const [isDegaussing, setIsDegaussing] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ambientOn, setAmbientOn] = useState(false);
  const [hudOpen, setHudOpen] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [telemetry, setTelemetry] = useState<HudTelemetry>({
    playerId: 'pending',
    playerName: 'Adventurer',
    hp: 100,
    maxHp: 100,
    xp: 0,
    roomName: 'The Repository Gates',
    roomPath: '/',
    monsters: [],
    mountedRepo: 'fwesh001/necro-mud',
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
        if (typeof payload.attackerHp === 'number') next.hp = payload.attackerHp;
        if (typeof payload.attackerMaxHp === 'number') next.maxHp = payload.attackerMaxHp;
        if (payload.targetSlain === true && typeof payload.targetName === 'string') {
          next.monsters = prev.monsters.filter(m => m.name !== payload.targetName);
        }
      }

      if (packet.event === 'monster-slain' && typeof payload.monsterName === 'string') {
        next.monsters = prev.monsters.filter(m => m.name !== payload.monsterName);
      }

      if (packet.event === 'status-view' && typeof payload.ansi === 'string') {
        const clean = stripAnsi(payload.ansi);
        const hpMatch = clean.match(/HP:\s+\S+\s+(\d+)\/(\d+)/);
        if (hpMatch) {
          next.hp = Number(hpMatch[1]);
          next.maxHp = Number(hpMatch[2]);
        }
        const xpMatch = clean.match(/XP:\s+(\d+)/);
        if (xpMatch) {
          next.xp = Number(xpMatch[1]);
        }
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
    setTelemetry(prev => ({ ...prev, mountedRepo: repoSlug }));
    commandSenderRef.current?.(`REPO ${repoSlug}`);
  }, []);

  return (
    <main className="flex items-center justify-center min-h-screen bg-[#030303] p-3 sm:p-5">
      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row items-stretch justify-center gap-4">
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
            <BootSequence onComplete={() => setBootComplete(true)} />
          ) : (
            <Terminal
              wsUrl="ws://localhost:4000"
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
          onSendCommand={handleSendCommand}
          onMountRepo={handleMountRepo}
        />
      </div>
    </main>
  );
}
