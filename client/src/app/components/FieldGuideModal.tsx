'use client';

import { useEffect, useState } from 'react';
import { getSoundEngine } from '../lib/sound-engine';

interface FieldGuideModalProps {
  open: boolean;
  onClose: () => void;
}

type GuideTab = 'quickstart' | 'commands' | 'hardware';

const BUTTON_REFERENCE: Array<{
  key: string;
  role: string;
  edgeCase: string;
}> = [
  { key: 'LOOK', role: 'Re-print current sector box, exits & monsters', edgeCase: 'Always safe anywhere' },
  { key: 'MAP', role: 'Render 80-col dungeon tree topology', edgeCase: 'Highlights discovered vs fog rooms' },
  { key: 'STATUS', role: 'Show HP, ATK, DEF, XP, rank & scrolls', edgeCase: 'Syncs HUD vitals & inventory' },
  { key: 'TOP', role: 'Open Hall of Fame XP leaderboard', edgeCase: 'Aggregates persisted hackers' },
  { key: 'MOVE N/S/E/W', role: 'Traverse unlocked repository chambers', edgeCase: 'Dimmed keys warn locally if blocked' },
  { key: 'SCAN', role: 'Inspect GitHub issue body, file & stats', edgeCase: 'Requires at least 1 active hostile' },
  { key: 'ATTACK', role: 'Execute combat round + AI DM narration', edgeCase: 'Works on every tier & complexity boss' },
  { key: 'PATCH', role: 'Apply 17–24 direct code fix damage', edgeCase: 'Complexity bosses resist PATCH; use ATTACK/REFACTOR' },
  { key: 'CAST', role: 'Invoke HOTFIX, REFACTOR, or ROLLBACK', edgeCase: 'Consumes scroll for boosted effect; warns if empty' },
  { key: 'MOUNT', role: 'Load any public owner/repo into dungeon', edgeCase: 'Falls back to mock dungeon if offline/rate-limited' },
];

/**
 * FieldGuideModal — Retro CRT Necromancer's Field Guide & Interactive Tutorial.
 *
 * Accessible via [? GUIDE] on CrtBezel and TacticalHud. Provides Quickstart Loop,
 * Button & Edge-Case Reference, and CRT Hardware & WebAudio Guide tabs.
 */
export function FieldGuideModal({ open, onClose }: FieldGuideModalProps) {
  const [tab, setTab] = useState<GuideTab>('quickstart');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        getSoundEngine().playKeystroke();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectTab = (next: GuideTab) => {
    getSoundEngine().unlock();
    getSoundEngine().playKeystroke();
    setTab(next);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono"
      role="dialog"
      aria-modal="true"
      aria-label="Necromancer's Field Guide"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl p-5 text-xs shadow-2xl border-2 flex flex-col max-h-[88vh]"
        style={{
          background: 'linear-gradient(170deg, #0b100c 0%, #050705 100%)',
          borderColor: 'var(--crt-accent)',
          boxShadow: '0 0 34px var(--crt-glow-soft)',
          color: '#d8e2d8',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b pb-2.5 mb-3 shrink-0"
          style={{ borderColor: 'var(--crt-accent-dim)' }}
        >
          <div>
            <div className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--crt-accent)' }}>
              ╔══ NECROMANCER&apos;S FIELD GUIDE ══╗
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              GitHub-to-Dungeon Manual • Edge-Case Rules • CRT Hardware Specs
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              getSoundEngine().playKeystroke();
              onClose();
            }}
            className="px-2 py-1 rounded border text-[10px] uppercase cursor-pointer"
            style={{ borderColor: '#444', color: '#aaa', background: '#141714' }}
          >
            [ESC] Close
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex flex-wrap gap-1.5 mb-3 shrink-0" role="tablist">
          {(
            [
              { id: 'quickstart', label: '1. 30-Sec Quickstart Loop' },
              { id: 'commands', label: '2. Buttons & Edge Cases' },
              { id: 'hardware', label: '3. CRT Hardware & Audio' },
            ] as const
          ).map(item => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => selectTab(item.id)}
                className="px-3 py-1.5 rounded border text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-colors"
                style={{
                  background: active ? 'rgba(0, 255, 65, 0.1)' : '#101310',
                  borderColor: active ? 'var(--crt-accent)' : '#2d332d',
                  color: active ? 'var(--crt-accent)' : '#888',
                  boxShadow: active ? '0 0 10px var(--crt-glow-soft)' : 'none',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="crt-scroll overflow-y-auto pr-1 flex flex-col gap-3">
          {tab === 'quickstart' && (
            <>
              <div className="rounded-lg p-3 bg-[#060906] border border-[#242c24]">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
                  GitHub Repository -&gt; Dungeon Mapping
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded bg-black/50 border border-[#1e261e]">
                    <div className="font-bold text-cyan-300">◆ Folders &amp; Branches</div>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      Top-level directories materialize as linked chambers north from The Repository Gates.
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-black/50 border border-[#1e261e]">
                    <div className="font-bold text-red-400">☠ Issues, CI &amp; Hotspots</div>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      Open GitHub issues, broken workflows, and large modules spawn as live monsters with real metadata.
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-black/50 border border-[#1e261e]">
                    <div className="font-bold text-fuchsia-300">★ Commit Scrolls</div>
                    <div className="text-[10px] text-neutral-400 mt-1">
                      Vanquished bugs drop <span className="text-fuchsia-200">scroll-hotfix</span>,{' '}
                      <span className="text-fuchsia-200">scroll-refactor</span>, and{' '}
                      <span className="text-fuchsia-200">scroll-rollback</span>.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-3 bg-[#060906] border border-[#242c24]">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2">
                  Core Gameplay Loop
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <span className="px-2 py-1 rounded border border-[#2f452f] bg-[#0b150b]" style={{ color: 'var(--crt-accent)' }}>
                    1. MOVE N
                  </span>
                  <span className="text-neutral-600">-&gt;</span>
                  <span className="px-2 py-1 rounded border border-[#2f452f] bg-[#0b150b]" style={{ color: 'var(--crt-accent)' }}>
                    2. SCAN
                  </span>
                  <span className="text-neutral-600">-&gt;</span>
                  <span className="px-2 py-1 rounded border border-red-900/70 bg-[#1a0b0b] text-red-300">
                    3. ATTACK / PATCH
                  </span>
                  <span className="text-neutral-600">-&gt;</span>
                  <span className="px-2 py-1 rounded border border-fuchsia-900/70 bg-[#170b1c] text-fuchsia-300">
                    4. CAST
                  </span>
                  <span className="text-neutral-600">-&gt;</span>
                  <span className="px-2 py-1 rounded border border-amber-900/70 bg-[#181308] text-amber-300">
                    5. TOP
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-2.5 leading-relaxed">
                  Watch the <span style={{ color: 'var(--crt-accent)' }}>ACTIVE OBJECTIVE</span> banner at the top of the Telemetry Deck—it advances automatically as you explore, scan diagnostics, defeat monsters, and loot commit scrolls. You can also type commands directly inside the 80-column CRT terminal.
                </p>
              </div>
            </>
          )}

          {tab === 'commands' && (
            <div className="rounded-lg p-3 bg-[#060906] border border-[#242c24] flex flex-col gap-2">
              <div className="grid grid-cols-1 gap-1.5">
                {BUTTON_REFERENCE.map(row => (
                  <div
                    key={row.key}
                    className="grid grid-cols-12 gap-2 p-2 rounded bg-black/45 border border-[#1a201a] items-center"
                  >
                    <span className="col-span-3 font-bold" style={{ color: 'var(--crt-accent)' }}>
                      {row.key}
                    </span>
                    <span className="col-span-5 text-neutral-300 text-[10px]">{row.role}</span>
                    <span className="col-span-4 text-amber-300/80 text-[10px]">{row.edgeCase}</span>
                  </div>
                ))}
              </div>
              <div className="p-2.5 rounded border border-red-900/50 bg-red-950/20 text-[10px] text-neutral-300 leading-relaxed">
                <strong className="text-red-300">Zero HP Respawn Edge Case:</strong> Falling to 0 HP never deletes your character. You revive automatically at The Repository Gates with half max HP while keeping earned XP and inventory.
              </div>
            </div>
          )}

          {tab === 'hardware' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-lg p-3 bg-[#060906] border border-[#242c24] flex flex-col gap-1.5">
                <div className="font-bold uppercase" style={{ color: 'var(--crt-accent)' }}>
                  CRT Monitor Bezel Controls
                </div>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  <strong>PHOSPHOR:</strong> Cycles <span className="text-green-400">P1-GRN</span>, <span className="text-amber-400">P3-AMB</span>, <span className="text-pink-400">BLOOD</span>, and <span className="text-cyan-300">VGA-16</span> shaders, XTerm ANSI palette, and oscilloscope beam.
                </p>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  <strong>DEGAUSS:</strong> Triggers a 900ms magnetic warp + RGB chromatic aberration sweep and capacitor discharge thump.
                </p>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  <strong>SCAN / PWR:</strong> Adjusts scanline + CRT flicker intensity (`HIGH`/`LOW`/`OFF`) or collapses the electron gun beam into standby.
                </p>
              </div>
              <div className="rounded-lg p-3 bg-[#060906] border border-[#242c24] flex flex-col gap-1.5">
                <div className="font-bold text-fuchsia-300 uppercase">
                  WebAudio Synth &amp; 60Hz Scope
                </div>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  <strong>SFX:</strong> Synthesizes zero-sample 2400-baud modem handshakes, IBM Model M bucking-spring key clicks, combat crunches, and spell arpeggios via WebAudio oscillators and noise buffers.
                </p>
                <p className="text-[10px] text-neutral-300 leading-relaxed">
                  <strong>HUM &amp; Scope:</strong> Enable <strong>HUM</strong> for a continuous 60Hz transformer + 55Hz sub-bass drone. The HUD oscilloscope plots live `AnalyserNode` samples or falls back to an idle 60Hz cathode ripple.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

