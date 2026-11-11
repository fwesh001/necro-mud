'use client';

import type { ReactNode } from 'react';

interface CrtBezelProps {
  children: ReactNode;
}

/**
 * CRT Monitor Bezel — A haunted 1990s CRT monitor frame.
 *
 * Renders a dark outer shell with bevelled edges, a "NECRO-MUD" label
 * etched into the top bezel, a pulsing green power LED, and an inner
 * screen area with scanline and vignette overlays.
 */
export function CrtBezel({ children }: CrtBezelProps) {
  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* Outer CRT shell */}
      <div
        className="rounded-2xl p-6 pb-8 shadow-crt-outer"
        style={{
          background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 50%, #111 100%)',
          border: '2px solid #333',
        }}
      >
        {/* Top bezel — label and vents */}
        <div className="flex items-center justify-between mb-3 px-2">
          {/* Brand label */}
          <div className="flex items-center gap-3">
            <span
              className="text-xs tracking-[0.3em] uppercase font-bold"
              style={{ color: '#555' }}
            >
              ☠ Necro-MUD
            </span>
          </div>

          {/* Faux ventilation slots */}
          <div className="flex gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-0.5 rounded-full"
                style={{ background: '#333' }}
              />
            ))}
          </div>
        </div>

        {/* Inner screen with CRT effects */}
        <div className="crt-scanlines crt-vignette crt-noise crt-flicker crt-curve relative shadow-crt-inner"
          style={{
            background: 'radial-gradient(ellipse at center, #0a0f0a 0%, #020502 100%)',
            minHeight: '70vh',
          }}
        >
          {/* Screen content */}
          <div className="relative z-0 h-full min-h-[70vh]">
            {children}
          </div>
        </div>

        {/* Bottom bezel — power LED and model label */}
        <div className="flex items-center justify-between mt-3 px-4">
          {/* Power LED */}
          <div className="flex items-center gap-2">
            <div className="power-led" />
            <span className="text-[10px] uppercase" style={{ color: '#444' }}>
              Power
            </span>
          </div>

          {/* Model label */}
          <span className="text-[10px]" style={{ color: '#333' }}>
            MODEL NM-2026 &nbsp;•&nbsp; Kiroween Edition
          </span>
        </div>
      </div>
    </div>
  );
}

