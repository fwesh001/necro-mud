'use client';

import { useEffect } from 'react';
import type { HudMonster, ScanDetails } from '../lib/telemetry';
import { getSoundEngine } from '../lib/sound-engine';

interface PatchModalProps {
  open: boolean;
  onClose: () => void;
  activeTarget: string | null;
  monsters: HudMonster[];
  scanDetails: ScanDetails | null;
  inventory: string[];
  connected: boolean;
  onSelectTarget: (name: string) => void;
  onSendCommand: (command: string) => void;
}

const SPELLBOOK: Array<{
  id: 'hotfix' | 'refactor' | 'rollback';
  scrollItem: string;
  label: string;
  effect: string;
  needsTarget: boolean;
}> = [
  {
    id: 'hotfix',
    scrollItem: 'scroll-hotfix',
    label: 'HOTFIX',
    effect: 'Restore +25 HP (+45 HP with scroll)',
    needsTarget: false,
  },
  {
    id: 'refactor',
    scrollItem: 'scroll-refactor',
    label: 'REFACTOR',
    effect: '30 dmg to target (45 dmg with scroll)',
    needsTarget: true,
  },
  {
    id: 'rollback',
    scrollItem: 'scroll-rollback',
    label: 'ROLLBACK',
    effect: 'Restore +15 HP & shield (+25 HP with scroll)',
    needsTarget: false,
  },
];

/**
 * PatchModal — Haunted BIOS Defect Patcher & Commit Scroll Spellbook overlay.
 *
 * Lets players inspect scanned GitHub defect diagnostics, trigger SCAN/PATCH,
 * or invoke HOTFIX/REFACTOR/ROLLBACK commit scrolls with mechanical SFX.
 */
export function PatchModal({
  open,
  onClose,
  activeTarget,
  monsters,
  scanDetails,
  inventory,
  connected,
  onSelectTarget,
  onSendCommand,
}: PatchModalProps) {
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

  const fireCmd = (cmd: string) => {
    getSoundEngine().unlock();
    getSoundEngine().playKeystroke();
    onSendCommand(cmd);
  };

  const targetMatchesScan =
    scanDetails &&
    activeTarget &&
    scanDetails.target.toLowerCase() === activeTarget.toLowerCase();

  const effectiveScan = targetMatchesScan ? scanDetails : scanDetails;
  const isComplexityBoss = effectiveScan?.origin === 'complexity';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono"
      role="dialog"
      aria-modal="true"
      aria-label="BIOS Defect Patcher and Spellbook"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl p-5 text-xs shadow-2xl border-2"
        style={{
          background: 'linear-gradient(170deg, #0b100c 0%, #050705 100%)',
          borderColor: 'var(--crt-accent)',
          boxShadow: '0 0 32px var(--crt-glow-soft)',
          color: '#d8e2d8',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top BIOS header */}
        <div className="flex items-center justify-between border-b pb-2.5 mb-4" style={{ borderColor: 'var(--crt-accent-dim)' }}>
          <div>
            <div className="text-sm font-bold tracking-wider uppercase" style={{ color: 'var(--crt-accent)' }}>
              ╔══ BIOS PATCHER &amp; SPELLBOOK ══╗
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              Diagnostics • Direct Defect Patching • Commit Scroll Invocation
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Panel: Target Diagnostics & Patch */}
          <div className="rounded-lg p-3 bg-[#060906] border border-[#273027] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                Defect Target
              </span>
              <span className="text-[10px]" style={{ color: 'var(--crt-accent)' }}>
                {monsters.length} in sector
              </span>
            </div>

            {monsters.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {monsters.map(m => {
                  const selected = activeTarget === m.name;
                  return (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => {
                        getSoundEngine().playKeystroke();
                        onSelectTarget(m.name);
                      }}
                      className="px-2 py-1 rounded text-[10px] cursor-pointer border"
                      style={{
                        borderColor: selected ? '#FF5555' : '#2d332d',
                        background: selected ? 'rgba(255, 85, 85, 0.16)' : '#101410',
                        color: selected ? '#FF9999' : '#aaa',
                      }}
                    >
                      ☠ {m.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-[11px] text-neutral-500 italic">
                No hostiles in current room. Move to an infected directory to scan or patch.
              </div>
            )}

            {/* Scan inspection box */}
            <div className="rounded p-2.5 bg-[#030503] border border-[#1d241d] min-h-[140px] flex flex-col gap-1.5">
              {effectiveScan ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 truncate">{effectiveScan.target}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300">
                      {effectiveScan.origin} • {effectiveScan.tier}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    HP {effectiveScan.hp} | ATK {effectiveScan.atk} | DEF {effectiveScan.def}
                  </div>
                  {effectiveScan.labels.length > 0 && (
                    <div className="text-[10px] text-fuchsia-300 truncate">
                      Labels: {effectiveScan.labels.join(', ')}
                    </div>
                  )}
                  <div className="text-[10px] text-cyan-400 truncate">
                    {effectiveScan.source}
                  </div>
                  <p className="text-[10px] text-neutral-300 leading-relaxed line-clamp-3">
                    {effectiveScan.description}
                  </p>
                  {effectiveScan.snippet && (
                    <pre className="text-[9px] text-neutral-400 bg-black/70 p-1.5 rounded border border-[#1f261f] overflow-x-auto max-h-20 whitespace-pre-wrap">
                      {effectiveScan.snippet}
                    </pre>
                  )}
                </>
              ) : (
                <div className="text-[11px] text-neutral-500 my-auto text-center">
                  Run <span style={{ color: 'var(--crt-accent)' }}>SCAN</span> on a target to load GitHub issue body &amp; complexity snippet.
                </div>
              )}
            </div>

            {isComplexityBoss && (
              <div className="text-[10px] text-amber-400 bg-amber-950/30 border border-amber-800/50 rounded px-2 py-1">
                ⚠ Complexity monster resists inline PATCH — use ATTACK or CAST REFACTOR!
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
              <button
                type="button"
                disabled={!connected || !activeTarget}
                onClick={() => activeTarget && fireCmd(`SCAN ${activeTarget}`)}
                className="py-1.5 px-2 rounded border text-[10px] font-bold uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'var(--crt-accent-dim)',
                  color: 'var(--crt-accent)',
                  background: '#111811',
                }}
              >
                SCAN Target
              </button>
              <button
                type="button"
                disabled={!connected || !activeTarget}
                onClick={() => activeTarget && fireCmd(`PATCH ${activeTarget}`)}
                className="py-1.5 px-2 rounded border text-[10px] font-bold uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  borderColor: 'rgba(255, 85, 85, 0.5)',
                  color: '#FF8888',
                  background: '#1c1010',
                }}
              >
                Execute PATCH
              </button>
            </div>
          </div>

          {/* Right Panel: Commit Scroll Spellbook */}
          <div className="rounded-lg p-3 bg-[#060906] border border-[#273027] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                Commit Scroll Spellbook
              </span>
              <span className="text-[10px] text-fuchsia-300">
                {inventory.length} scroll{inventory.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {SPELLBOOK.map(spell => {
                const hasScroll = inventory.includes(spell.scrollItem);
                const disabled = !connected || (spell.needsTarget && !activeTarget);
                const commandText = spell.needsTarget && activeTarget
                  ? `CAST ${spell.id} ${activeTarget}`
                  : `CAST ${spell.id}`;

                return (
                  <div
                    key={spell.id}
                    className="rounded p-2.5 border flex items-center justify-between gap-2"
                    style={{
                      background: hasScroll ? 'rgba(180, 70, 255, 0.08)' : '#0a0d0a',
                      borderColor: hasScroll ? 'rgba(217, 70, 239, 0.45)' : '#232823',
                    }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-fuchsia-300">★ {spell.label}</span>
                        {hasScroll && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-fuchsia-950 text-fuchsia-200 border border-fuchsia-700/60">
                            SCROLL READY
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {spell.effect}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => fireCmd(commandText)}
                      className="px-2.5 py-1.5 rounded border text-[10px] font-bold uppercase shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        borderColor: 'rgba(217, 70, 239, 0.5)',
                        color: '#f0abfc',
                        background: '#190f1d',
                      }}
                    >
                      Cast
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-2 border-t border-[#1e241e] text-[10px] text-neutral-500">
              Held Inventory: {inventory.length > 0 ? inventory.join(', ') : '(empty — patch bugs to loot scrolls)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

