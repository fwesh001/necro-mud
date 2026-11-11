'use client';

import { useState, useEffect } from 'react';
import {
  computeHpSegments,
  type HudMonster,
  type ScanDetails,
} from '../lib/telemetry';
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
  onSendCommand: (command: string) => void;
  onMountRepo: (repoSlug: string) => void;
}

const MACRO_KEYS: Array<{
  label: string;
  command: string;
  needsMonsterTarget?: boolean;
  tone?: 'danger' | 'accent' | 'magic' | 'neutral';
}> = [
  { label: 'LOOK', command: 'LOOK', tone: 'accent' },
  { label: 'MAP', command: 'MAP', tone: 'neutral' },
  { label: 'STATUS', command: 'STATUS', tone: 'neutral' },
  { label: 'TOP', command: 'TOP', tone: 'magic' },
  { label: 'MOVE N', command: 'MOVE north', tone: 'neutral' },
  { label: 'MOVE S', command: 'MOVE south', tone: 'neutral' },
  { label: 'MOVE E', command: 'MOVE east', tone: 'neutral' },
  { label: 'MOVE W', command: 'MOVE west', tone: 'neutral' },
  { label: 'SCAN', command: 'SCAN', needsMonsterTarget: true, tone: 'accent' },
  { label: 'ATTACK', command: 'ATTACK', needsMonsterTarget: true, tone: 'danger' },
  { label: 'PATCH', command: 'PATCH', needsMonsterTarget: true, tone: 'accent' },
  { label: 'CAST', command: 'CAST hotfix', tone: 'magic' },
];

/**
 * TacticalHud — Collapsible brushed-metal hardware telemetry deck.
 *
 * Displays live player vitals, XP/title, commit scroll inventory,
 * WebAudio phosphor oscilloscope, monster targeting, mechanical macro
 * keycaps (including CAST & TOP), BIOS Patch modal button, and repo loader.
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
  onSendCommand,
  onMountRepo,
}: TacticalHudProps) {
  const [repoInput, setRepoInput] = useState(telemetry.mountedRepo);

  useEffect(() => {
    setRepoInput(telemetry.mountedRepo);
  }, [telemetry.mountedRepo]);

  if (!open) return null;

  const { pct: hpPct, filled: filledSegments, total: hpSegments } = computeHpSegments(
    telemetry.hp,
    telemetry.maxHp,
    12,
  );

  const activeTarget =
    telemetry.monsters.find(m => m.name === selectedMonster)?.name
    ?? telemetry.monsters[0]?.name
    ?? null;

  const handleMacroClick = (macro: (typeof MACRO_KEYS)[number]) => {
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
    onMountRepo(trimmed);
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
      <div className="flex items-center justify-between border-b border-[#2e2e2e] pb-2">
        <span className="uppercase tracking-[0.2em] font-bold text-[11px] text-neutral-400">
          Telemetry Deck
        </span>
        <div className="flex items-center gap-2">
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
            <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
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

      {/* Mechanical Macro Keycaps */}
      <section className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            Macro Keycaps
          </span>
          {activeTarget && (
            <span className="text-[9px] text-red-400 truncate max-w-[155px]">
              TGT: {activeTarget}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {MACRO_KEYS.map(macro => {
            const borderColor =
              macro.tone === 'danger'
                ? 'rgba(255, 85, 85, 0.45)'
                : macro.tone === 'magic'
                ? 'rgba(217, 70, 239, 0.45)'
                : macro.tone === 'accent'
                ? 'var(--crt-accent-dim)'
                : '#3a3a3a';
            const textColor =
              macro.tone === 'danger'
                ? '#FF7777'
                : macro.tone === 'magic'
                ? '#f0abfc'
                : macro.tone === 'accent'
                ? 'var(--crt-accent)'
                : '#d4d4d4';

            return (
              <button
                key={macro.label}
                type="button"
                disabled={connectionState !== 'connected'}
                onClick={() => handleMacroClick(macro)}
                className="px-1.5 py-1.5 rounded text-[9px] font-bold uppercase tracking-wide cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-0.5"
                style={{
                  background: 'linear-gradient(180deg, #2b2b2b 0%, #1a1a1a 100%)',
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 3px 0 #090909',
                }}
              >
                {macro.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Repository Loader Bar */}
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
