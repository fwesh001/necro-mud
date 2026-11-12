'use client';

import { useState, useEffect } from 'react';
import type { Direction } from '@necro-mud/shared';
import {
  computeHpSegments,
  computeQuestObjective,
  type HudMonster,
  type ScanDetails,
} from '../lib/telemetry';
import { getSoundEngine } from '../lib/sound-engine';
import type { CrtIntensity, PhosphorMode } from './CrtBezel';
import { PhosphorOscilloscope } from './PhosphorOscilloscope';

export type { HudMonster };

export interface HudTelemetry {
  playerId: string;
  playerName: string;
  title: string;
  hp: number;
  maxHp: number;
  xp: number;
  bugsSquashed: number;
  inventory: string[];
  roomName: string;
  roomPath: string | null;
  exits: Direction[];
  monsters: HudMonster[];
  mountedRepo: string;
  repoStatus: 'ready' | 'loading';
  roomCount: number | null;
  monsterCount: number | null;
  lastScan: ScanDetails | null;
  topHacker: { name: string; xp: number; title: string } | null;
  lastEventLabel: string;
}

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

interface TacticalHudProps {
  open: boolean;
  connectionState: ConnectionState;
  latencyMs: number | null;
  telemetry: HudTelemetry;
  phosphorMode: PhosphorMode;
  crtIntensity: CrtIntensity;
  muted: boolean;
  selectedMonster: string | null;
  onSelectMonster: (name: string | null) => void;
  onOpenPatchModal: () => void;
  onOpenGuide: () => void;
  onSendCommand: (command: string) => void;
  onMountRepo: (repoSlug: string) => void;
}

const PRESET_REPOS = ['fwesh001/necro-mud', 'facebook/react', 'vercel/next.js'] as const;

const MACRO_KEYS: Array<{
  label: string;
  command: string;
  direction?: Direction;
  needsMonsterTarget?: boolean;
  isCast?: boolean;
  tone?: 'danger' | 'accent' | 'magic' | 'neutral';
}> = [
  { label: 'LOOK', command: 'LOOK', tone: 'accent' },
  { label: 'MAP', command: 'MAP', tone: 'neutral' },
  { label: 'STATUS', command: 'STATUS', tone: 'neutral' },
  { label: 'TOP', command: 'TOP', tone: 'magic' },
  { label: 'MOVE N', command: 'MOVE north', direction: 'north', tone: 'neutral' },
  { label: 'MOVE S', command: 'MOVE south', direction: 'south', tone: 'neutral' },
  { label: 'MOVE E', command: 'MOVE east', direction: 'east', tone: 'neutral' },
  { label: 'MOVE W', command: 'MOVE west', direction: 'west', tone: 'neutral' },
  { label: 'SCAN', command: 'SCAN', needsMonsterTarget: true, tone: 'accent' },
  { label: 'ATTACK', command: 'ATTACK', needsMonsterTarget: true, tone: 'danger' },
  { label: 'PATCH', command: 'PATCH', needsMonsterTarget: true, tone: 'accent' },
  { label: 'CAST', command: 'CAST hotfix', isCast: true, tone: 'magic' },
];

/**
 * TacticalHud — Collapsible brushed-metal hardware telemetry deck.
 *
 * Includes the 4-step Active Quest Objective banner, live WebAudio phosphor
 * oscilloscope, vitals LEDs, commit scroll inventory, context-aware macro
 * keycaps with inline tactical advisories, preset repos, and [? GUIDE].
 */
export function TacticalHud({
  open,
  connectionState,
  latencyMs,
  telemetry,
  phosphorMode,
  crtIntensity,
  muted,
  selectedMonster,
  onSelectMonster,
  onOpenPatchModal,
  onOpenGuide,
  onSendCommand,
  onMountRepo,
}: TacticalHudProps) {
  const [repoInput, setRepoInput] = useState(telemetry.mountedRepo);
  const [advisory, setAdvisory] = useState<{ text: string; tone: 'warn' | 'info' } | null>(null);

  useEffect(() => {
    setRepoInput(telemetry.mountedRepo);
  }, [telemetry.mountedRepo]);

  useEffect(() => {
    setAdvisory(null);
  }, [telemetry.roomName, telemetry.mountedRepo]);

  if (!open) return null;

  const { pct: hpPct, filled: filledSegments, total: hpSegments } = computeHpSegments(
    telemetry.hp,
    telemetry.maxHp,
    12,
  );

  const objective = computeQuestObjective({
    monsters: telemetry.monsters,
    lastScan: telemetry.lastScan,
    inventory: telemetry.inventory,
    exits: telemetry.exits,
  });

  const activeTarget =
    telemetry.monsters.find(m => m.name === selectedMonster)?.name
    ?? telemetry.monsters[0]?.name
    ?? null;

  const triggerAdvisory = (text: string, tone: 'warn' | 'info' = 'warn') => {
    getSoundEngine().unlock();
    getSoundEngine().playEventSfx('error');
    setAdvisory({ text, tone });
  };

  const handleMacroClick = (macro: (typeof MACRO_KEYS)[number]) => {
    // Edge Case 1: Blocked exit interception
    if (macro.direction && !telemetry.exits.includes(macro.direction)) {
      const validList = telemetry.exits.length > 0
        ? telemetry.exits.map(d => d.toUpperCase()).join(', ')
        : 'NONE';
      triggerAdvisory(
        `Blocked: No exit ${macro.direction.toUpperCase()} from ${telemetry.roomName}. Valid exits: ${validList}`,
        'warn',
      );
      return;
    }

    // Edge Case 2: Combat key clicked in empty room
    if (macro.needsMonsterTarget && telemetry.monsters.length === 0) {
      triggerAdvisory(
        'Edge Case — Sector Clear: No hostile bugs in this room. Use a glowing [MOVE] key to find monsters first.',
        'warn',
      );
      return;
    }

    // Edge Case 3: CAST key without Commit Scrolls in inventory
    if (macro.isCast) {
      if (telemetry.inventory.length === 0) {
        triggerAdvisory(
          'No Commit Scrolls in inventory yet! Slay a bug with [ATTACK] or [PATCH] to loot scroll-hotfix, scroll-refactor, or scroll-rollback.',
          'info',
        );
        return;
      }

      setAdvisory(null);
      if (telemetry.inventory.includes('scroll-refactor') && activeTarget) {
        onSendCommand(`CAST refactor ${activeTarget}`);
      } else if (telemetry.inventory.includes('scroll-rollback')) {
        onSendCommand('CAST rollback');
      } else {
        onSendCommand('CAST hotfix');
      }
      return;
    }

    setAdvisory(null);
    if (macro.needsMonsterTarget && activeTarget) {
      onSendCommand(`${macro.command} ${activeTarget}`);
      return;
    }
    onSendCommand(macro.command);
  };

  const handleRepoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = repoInput.trim();
    if (!trimmed) return;
    setAdvisory(null);
    onMountRepo(trimmed);
  };

  const handlePresetRepoClick = (slug: string) => {
    getSoundEngine().unlock();
    getSoundEngine().playKeystroke();
    setRepoInput(slug);
    setAdvisory(null);
    onMountRepo(slug);
  };

  const statusColor =
    connectionState === 'connected'
      ? 'var(--crt-accent)'
      : connectionState === 'connecting'
      ? '#FFB000'
      : '#FF5555';

  return (
    <aside
      className="w-full lg:w-84 shrink-0 rounded-2xl p-4 font-mono text-xs flex flex-col gap-3 select-none"
      style={{
        background: 'linear-gradient(160deg, #252525 0%, #161616 55%, #0d0d0d 100%)',
        border: '2px solid #353535',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 45px rgba(0,0,0,0.8)',
      }}
    >
      {/* Header plate */}
      <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-2 gap-1.5">
        <span className="uppercase tracking-[0.18em] font-bold text-[11px] text-neutral-400">
          Telemetry Deck
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenGuide}
            title="Open Necromancer's Field Guide"
            className="px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase cursor-pointer"
            style={{
              borderColor: 'var(--crt-accent-dim)',
              color: 'var(--crt-accent)',
              background: '#0d150d',
            }}
          >
            [? GUIDE]
          </button>
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{
              backgroundColor: statusColor,
              boxShadow: `0 0 6px ${statusColor}`,
            }}
          />
          <span className="text-[10px] uppercase" style={{ color: statusColor }}>
            {connectionState === 'connected'
              ? `LINK ${latencyMs !== null ? `${latencyMs}ms` : 'OK'}`
              : connectionState.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Idea A: Active Quest Objective Banner */}
      <section
        aria-label="Active Quest Objective"
        className="rounded-lg px-2.5 py-2 border flex flex-col gap-1"
        style={{
          background: 'rgba(0, 255, 65, 0.06)',
          borderColor: 'var(--crt-accent-dim)',
          boxShadow: 'inset 0 0 12px rgba(0,0,0,0.45)',
        }}
      >
        <div className="flex items-center justify-between text-[9px] uppercase tracking-wider">
          <span className="font-bold" style={{ color: 'var(--crt-accent)' }}>
            ★ Active Objective
          </span>
          <span
            className="px-1.5 py-0.2 rounded border text-[9px] font-bold"
            style={{
              borderColor: 'var(--crt-accent-dim)',
              color: 'var(--crt-accent)',
              background: '#081108',
            }}
          >
            STEP {objective.step}/4
          </span>
        </div>
        <p className="text-[10px] text-neutral-200 leading-snug">
          {objective.text}
        </p>
      </section>

      {/* Live Phosphor Audio Oscilloscope */}
      <PhosphorOscilloscope
        phosphorMode={phosphorMode}
        crtIntensity={crtIntensity}
        muted={muted}
      />

      {/* Live Vitals LEDs */}
      <section className="rounded-lg p-3 bg-[#090b09] border border-[#2a2a2a] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[11px] font-bold truncate" style={{ color: 'var(--crt-accent)' }}>
              {telemetry.playerName}
            </div>
            <div className="text-[10px] text-neutral-500 truncate">
              {telemetry.title}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-amber-300 font-bold">{telemetry.xp} XP</div>
            <div className="text-[9px] text-neutral-500">{telemetry.bugsSquashed} bugs</div>
          </div>
        </div>

        {/* Segmented LED HP Bar */}
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="uppercase text-neutral-500">Vitality</span>
            <span style={{ color: hpPct > 30 ? 'var(--crt-accent)' : '#FF5555' }}>
              {telemetry.hp}/{telemetry.maxHp} HP
            </span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            {Array.from({ length: hpSegments }).map((_, idx) => {
              const lit = idx < filledSegments;
              const segColor =
                hpPct > 60 ? 'var(--crt-accent)' : hpPct > 30 ? '#FFB000' : '#FF3366';
              return (
                <div
                  key={idx}
                  className="h-2 rounded-[2px]"
                  style={{
                    backgroundColor: lit ? segColor : '#1a1d1a',
                    boxShadow: lit ? `0 0 5px ${segColor}` : 'none',
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Room readout */}
        <div className="pt-1 border-t border-[#1e221e] flex flex-col gap-0.5">
          <span className="text-[10px] uppercase text-neutral-500">Sector</span>
          <span className="text-xs font-bold text-neutral-200 truncate">
            {telemetry.roomName}
          </span>
          {telemetry.roomPath && (
            <span className="text-[10px] text-neutral-500 truncate">
              {telemetry.roomPath}
            </span>
          )}
        </div>

        {/* Commit Scrolls / Inventory */}
        <div className="pt-1 border-t border-[#1e221e] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-neutral-500">Commit Scrolls</span>
            <button
              type="button"
              onClick={onOpenPatchModal}
              className="text-[9px] uppercase px-1.5 py-0.5 rounded border cursor-pointer"
              style={{
                borderColor: 'rgba(217, 70, 239, 0.45)',
                color: '#e879f9',
                background: '#160d19',
              }}
            >
              BIOS / Spells
            </button>
          </div>
          {telemetry.inventory.length === 0 ? (
            <span className="text-[10px] text-neutral-600 italic">No scrolls in inventory</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {telemetry.inventory.map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-fuchsia-950/60 text-fuchsia-200 border border-fuchsia-800/60"
                >
                  ★ {item}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Active Monsters */}
        <div className="pt-1 border-t border-[#1e221e] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-neutral-500">Hostiles</span>
            <span className="text-[10px] text-neutral-500">
              {telemetry.monsters.length} active
            </span>
          </div>
          {telemetry.monsters.length === 0 ? (
            <span className="text-[11px] text-neutral-600 italic">Sector clear</span>
          ) : (
            <div className="crt-scroll flex flex-col gap-1 max-h-20 overflow-y-auto pr-1">
              {telemetry.monsters.map(m => {
                const isSelected = activeTarget === m.name;
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => onSelectMonster(m.name)}
                    className="flex items-center justify-between px-2 py-1 rounded text-left text-[11px] cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? 'rgba(255, 85, 85, 0.14)' : '#121412',
                      border: `1px solid ${isSelected ? '#FF5555' : '#262626'}`,
                      color: isSelected ? '#FF8888' : '#ccc',
                    }}
                  >
                    <span className="truncate">☠ {m.name}</span>
                    <span className="text-[9px] uppercase text-neutral-500 ml-1 shrink-0">
                      {m.tier}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Inline Tactical Advisory */}
      {advisory && (
        <div
          role="status"
          className="rounded-lg px-2.5 py-1.5 border flex items-start justify-between gap-2 text-[10px] leading-snug"
          style={{
            background:
              advisory.tone === 'warn'
                ? 'rgba(255, 176, 0, 0.10)'
                : 'rgba(192, 132, 252, 0.10)',
            borderColor:
              advisory.tone === 'warn'
                ? 'rgba(255, 176, 0, 0.55)'
                : 'rgba(192, 132, 252, 0.55)',
            color: advisory.tone === 'warn' ? '#FCD34D' : '#E9D5FF',
          }}
        >
          <span>{advisory.text}</span>
          <button
            type="button"
            onClick={() => setAdvisory(null)}
            aria-label="Dismiss advisory"
            className="text-[9px] px-1 rounded border border-current/40 hover:bg-white/10 cursor-pointer shrink-0"
          >
            [X]
          </button>
        </div>
      )}

      {/* Mechanical Macro Keycaps */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            Macro Keycaps
          </span>
          {activeTarget ? (
            <span className="text-[9px] text-red-400 truncate max-w-[155px]">
              TGT: {activeTarget}
            </span>
          ) : (
            <span className="text-[9px] text-neutral-500 truncate max-w-[155px]">
              EXITS: {telemetry.exits.length > 0 ? telemetry.exits.map(e => e.toUpperCase()).join('/') : 'NONE'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {MACRO_KEYS.map(macro => {
            const isExitOpen = macro.direction ? telemetry.exits.includes(macro.direction) : true;
            const isCombatReady = macro.needsMonsterTarget ? telemetry.monsters.length > 0 : true;
            const isCastReady = macro.isCast ? telemetry.inventory.length > 0 : true;
            const isAvailable = isExitOpen && isCombatReady && isCastReady;
            const isFocused = isAvailable && objective.focusKeys.includes(macro.label);

            let borderColor = '#3a3a3a';
            let textColor = '#d4d4d4';
            if (!isAvailable) {
              borderColor = '#262626';
              textColor = '#666666';
            } else if (macro.tone === 'danger') {
              borderColor = 'rgba(255, 85, 85, 0.55)';
              textColor = '#FF7777';
            } else if (macro.tone === 'magic') {
              borderColor = 'rgba(217, 70, 239, 0.55)';
              textColor = '#f0abfc';
            } else if (macro.tone === 'accent' || macro.direction) {
              borderColor = 'var(--crt-accent-dim)';
              textColor = 'var(--crt-accent)';
            }

            const titleText = !isExitOpen
              ? `Blocked: No ${macro.direction} exit from here`
              : !isCombatReady
              ? 'No hostile monsters in this room'
              : !isCastReady
              ? 'Requires a Commit Scroll from defeating monsters'
              : macro.command;

            return (
              <button
                key={macro.label}
                type="button"
                disabled={connectionState !== 'connected'}
                onClick={() => handleMacroClick(macro)}
                title={titleText}
                data-available={isAvailable ? 'true' : 'false'}
                data-focused={isFocused ? 'true' : 'false'}
                className={`px-1.5 py-1.5 rounded text-[9px] font-bold uppercase tracking-wide cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-0.5 flex items-center justify-center gap-1 ${
                  isAvailable ? '' : 'opacity-45'
                } ${isFocused ? 'animate-pulse' : ''}`}
                style={{
                  background: isFocused
                    ? 'linear-gradient(180deg, #1a2d1d 0%, #0f1b11 100%)'
                    : 'linear-gradient(180deg, #2b2b2b 0%, #1a1a1a 100%)',
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  boxShadow: isFocused
                    ? '0 0 10px var(--crt-accent-glow), inset 0 1px 0 rgba(255,255,255,0.12), 0 3px 0 #090909'
                    : 'inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 0 #090909',
                }}
              >
                {macro.direction && isAvailable && (
                  <span
                    aria-hidden="true"
                    className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: 'var(--crt-accent)',
                      boxShadow: '0 0 6px var(--crt-accent)',
                    }}
                  />
                )}
                <span>{macro.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Repository Loader Bar + Preset Repo Chips */}
      <section className="pt-2 border-t border-[#2e2e2e] flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] gap-2">
          <span className="uppercase tracking-wider text-neutral-500">Mounted Repo</span>
          <span
            className="truncate max-w-[165px]"
            style={{ color: telemetry.repoStatus === 'loading' ? '#FFB000' : '#a3a3a3' }}
          >
            {telemetry.repoStatus === 'loading'
              ? 'LOADING TREE...'
              : telemetry.roomCount !== null
              ? `${telemetry.mountedRepo} (${telemetry.roomCount}R/${telemetry.monsterCount ?? 0}M)`
              : telemetry.mountedRepo}
          </span>
        </div>

        <div className="flex flex-wrap gap-1" aria-label="Preset repositories">
          {PRESET_REPOS.map(slug => {
            const isMounted = telemetry.mountedRepo === slug;
            return (
              <button
                key={slug}
                type="button"
                disabled={connectionState !== 'connected'}
                onClick={() => handlePresetRepoClick(slug)}
                className="px-1.5 py-0.5 rounded border text-[9px] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: isMounted ? 'var(--crt-accent)' : '#323232',
                  color: isMounted ? 'var(--crt-accent)' : '#a3a3a3',
                  background: isMounted ? 'rgba(0, 255, 65, 0.09)' : '#121212',
                }}
              >
                {slug}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleRepoSubmit} className="flex gap-1.5">
          <input
            type="text"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            placeholder="owner/repo"
            aria-label="GitHub repository owner/repo"
            className="flex-1 min-w-0 px-2 py-1 rounded bg-[#090b09] border border-[#333] text-[11px] font-mono focus:outline-none"
            style={{ color: 'var(--crt-accent)' }}
          />
          <button
            type="submit"
            disabled={connectionState !== 'connected'}
            className="px-2.5 py-1 rounded text-[10px] font-bold uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-px"
            style={{
              background: '#1c241c',
              border: '1px solid var(--crt-accent-dim)',
              color: 'var(--crt-accent)',
            }}
          >
            Mount
          </button>
        </form>
      </section>
    </aside>
  );
}
