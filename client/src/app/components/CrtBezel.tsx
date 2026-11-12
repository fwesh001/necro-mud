'use client';

import type { ReactNode } from 'react';

export type PhosphorMode = 'green' | 'amber' | 'blood' | 'vga';
export type CrtIntensity = 'high' | 'low' | 'off';
export type PowerPhase = 'on' | 'collapsing' | 'off' | 'warming';

const PHOSPHOR_LABELS: Record<PhosphorMode, string> = {
  green: 'P1-GRN',
  amber: 'P3-AMB',
  blood: 'BLOOD',
  vga: 'VGA-16',
};

const INTENSITY_LABELS: Record<CrtIntensity, string> = {
  high: 'HIGH',
  low: 'LOW',
  off: 'OFF',
};

interface CrtBezelProps {
  children: ReactNode;
  phosphorMode: PhosphorMode;
  onCyclePhosphor: () => void;
  crtIntensity: CrtIntensity;
  onCycleIntensity: () => void;
  powerOn: boolean;
  powerPhase: PowerPhase;
  onTogglePower: () => void;
  muted: boolean;
  onToggleMute: () => void;
  ambientOn: boolean;
  onToggleAmbient: () => void;
  isDegaussing: boolean;
  onDegauss: () => void;
  hudOpen: boolean;
  onToggleHud: () => void;
  onOpenGuide?: () => void;
}

/**
 * CRT Monitor Bezel — Interactive 1980s/1990s CRT monitor shell.
 *
 * Exposes physical hardware controls along the monitor bottom rail:
 * Phosphor selector, Degauss coil button, Scanline/Flicker intensity,
 * Audio mute + 60Hz hum toggle, HUD deck toggle, and Cathode Power switch.
 */
export function CrtBezel({
  children,
  phosphorMode,
  onCyclePhosphor,
  crtIntensity,
  onCycleIntensity,
  powerOn,
  powerPhase,
  onTogglePower,
  muted,
  onToggleMute,
  ambientOn,
  onToggleAmbient,
  isDegaussing,
  onDegauss,
  hudOpen,
  onToggleHud,
  onOpenGuide,
}: CrtBezelProps) {
  const powerClass =
    powerPhase === 'collapsing'
      ? 'crt-power-collapsing'
      : powerPhase === 'off'
      ? 'crt-power-off'
      : powerPhase === 'warming'
      ? 'crt-power-warming'
      : '';

  return (
    <div
      className="relative w-full flex-1 min-w-0"
      data-phosphor={phosphorMode}
      data-crt-intensity={crtIntensity}
    >
      {/* Outer CRT shell */}
      <div
        className="rounded-2xl p-4 sm:p-6 pb-5 shadow-crt-outer"
        style={{
          background: 'linear-gradient(145deg, #2a2a2a 0%, #191919 52%, #0f0f0f 100%)',
          border: '2px solid #353535',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 22px 55px rgba(0,0,0,0.85)',
        }}
      >
        {/* Top bezel — label and vents */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            <span
              className="text-xs tracking-[0.28em] uppercase font-bold select-none"
              style={{ color: '#6b6b6b' }}
            >
              ☠ Necro-MUD
            </span>
            <span
              className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded border font-mono uppercase"
              style={{
                color: 'var(--crt-accent)',
                borderColor: 'var(--crt-accent-dim)',
                background: 'rgba(0,0,0,0.45)',
              }}
            >
              {PHOSPHOR_LABELS[phosphorMode]}
            </span>
          </div>

          {/* Faux ventilation slots */}
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-5 sm:w-6 h-0.5 rounded-full"
                style={{ background: '#333' }}
              />
            ))}
          </div>
        </div>

        {/* Inner dark CRT glass recess */}
        <div
          className="crt-curve relative shadow-crt-inner border-2 border-[#080808]"
          style={{
            background: '#020202',
            minHeight: '68vh',
          }}
        >
          {/* Power-off indicator dot */}
          {powerPhase === 'off' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20 pointer-events-none">
              <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-neutral-700">
                Cathode Standby — Press PWR
              </span>
            </div>
          )}

          {/* Active CRT glass with scanlines, vignette, noise, flicker, degauss & power animations */}
          <div
            className={`crt-scanlines crt-vignette crt-noise crt-flicker relative h-full min-h-[68vh] origin-center ${powerClass} ${
              isDegaussing ? 'crt-degauss-active' : ''
            }`}
            style={{
              background: 'var(--crt-screen-bg)',
            }}
          >
            <div className="relative z-0 h-full min-h-[68vh]">
              {children}
            </div>
          </div>
        </div>

        {/* Bottom bezel — tactile CRT hardware controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 px-2">
          {/* Left: Power switch & LED */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onTogglePower}
              title="Toggle CRT monitor power"
              className="flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider cursor-pointer transition-all active:translate-y-px"
              style={{
                background: powerOn ? '#1b221b' : '#261414',
                border: '1px solid #444',
                color: powerOn ? 'var(--crt-accent)' : '#9e5252',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 4px rgba(0,0,0,0.6)',
              }}
            >
              <span className={powerOn ? 'power-led' : 'power-led-off'} />
              <span>PWR {powerOn ? 'ON' : 'OFF'}</span>
            </button>

            <span className="hidden md:inline text-[10px] tracking-wider uppercase select-none" style={{ color: '#4d4d4d' }}>
              NM-2026 • Kiroween
            </span>
          </div>

          {/* Right: Hardware switches */}
          <div className="flex flex-wrap items-center gap-1.5">
            <BezelButton
              label={`PHOSPHOR: ${PHOSPHOR_LABELS[phosphorMode]}`}
              onClick={onCyclePhosphor}
              active
              title="Cycle CRT phosphor palette"
            />
            <BezelButton
              label="DEGAUSS"
              onClick={onDegauss}
              disabled={!powerOn}
              title="Discharge magnetic degauss coil"
            />
            <BezelButton
              label={`SCAN: ${INTENSITY_LABELS[crtIntensity]}`}
              onClick={onCycleIntensity}
              active={crtIntensity !== 'off'}
              title="Toggle scanline & flicker intensity"
            />
            <BezelButton
              label={muted ? 'SFX: MUTE' : 'SFX: ON'}
              onClick={onToggleMute}
              active={!muted}
              title="Mute or unmute WebAudio SFX"
            />
            <BezelButton
              label={ambientOn && !muted ? 'HUM: ON' : 'HUM: OFF'}
              onClick={onToggleAmbient}
              active={ambientOn && !muted}
              title="Toggle 60Hz CRT transformer hum"
            />
            <BezelButton
              label={hudOpen ? 'HUD: ON' : 'HUD: OFF'}
              onClick={onToggleHud}
              active={hudOpen}
              title="Show or collapse Tactical Hardware HUD"
            />
            {onOpenGuide && (
              <BezelButton
                label="[? GUIDE]"
                onClick={onOpenGuide}
                active
                title="Open Necromancer's Field Guide & Edge-Case Reference"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BezelButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}

function BezelButton({ label, onClick, active = false, disabled = false, title }: BezelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wide transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:translate-y-px"
      style={{
        background: '#171717',
        border: `1px solid ${active ? 'var(--crt-accent-dim)' : '#383838'}`,
        color: active ? 'var(--crt-accent)' : '#888',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 3px rgba(0,0,0,0.65)',
      }}
    >
      {label}
    </button>
  );
}
