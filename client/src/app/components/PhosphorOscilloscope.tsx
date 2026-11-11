'use client';

import { useEffect, useRef } from 'react';
import { getSoundEngine } from '../lib/sound-engine';
import type { CrtIntensity, PhosphorMode } from './CrtBezel';

interface PhosphorOscilloscopeProps {
  phosphorMode: PhosphorMode;
  crtIntensity: CrtIntensity;
  muted: boolean;
}

const PHOSPHOR_BEAM_COLORS: Record<PhosphorMode, string> = {
  green: '#00FF41',
  amber: '#FFB000',
  blood: '#FF3366',
  vga: '#55FFFF',
};

/**
 * PhosphorOscilloscope — Live WebAudio AnalyserNode waveform monitor.
 *
 * Plots time-domain audio output from RetroSoundEngine inside a recessed
 * CRT scope window, falling back to an idle 60Hz cathode standby ripple
 * when silent or muted.
 */
export function PhosphorOscilloscope({
  phosphorMode,
  crtIntensity,
  muted,
}: PhosphorOscilloscopeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    let rafId = 0;
    let phase = 0;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;
      const beamColor = PHOSPHOR_BEAM_COLORS[phosphorMode];

      // Dark phosphor persistence clear
      ctx2d.fillStyle = '#040704';
      ctx2d.fillRect(0, 0, width, height);

      // Subtle scope graticule lines
      ctx2d.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx2d.lineWidth = 1;
      ctx2d.beginPath();
      ctx2d.moveTo(0, height / 2);
      ctx2d.lineTo(width, height / 2);
      for (let x = 24; x < width; x += 24) {
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, height);
      }
      ctx2d.stroke();

      const analyser = getSoundEngine().getAnalyserNode();
      let hasLiveAudio = false;

      if (analyser && !muted) {
        if (!dataArray || dataArray.length !== analyser.fftSize) {
          dataArray = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        }
        analyser.getByteTimeDomainData(dataArray);

        // Check whether signal deviates visibly from silence (128)
        for (let i = 0; i < dataArray.length; i++) {
          if (Math.abs((dataArray[i] ?? 128) - 128) > 1) {
            hasLiveAudio = true;
            break;
          }
        }
      }

      ctx2d.strokeStyle = beamColor;
      ctx2d.lineWidth = 1.75;
      ctx2d.shadowColor = beamColor;
      ctx2d.shadowBlur = crtIntensity === 'off' ? 0 : 6;
      ctx2d.beginPath();

      if (hasLiveAudio && dataArray) {
        const sliceWidth = width / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] ?? 128) / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
          x += sliceWidth;
        }
      } else {
        // Idle 60Hz cathode ripple (flatline in accessibility 'off' mode)
        const amplitude = crtIntensity === 'off' ? 0 : muted ? 1.5 : 3.2;
        phase += 0.14;
        for (let x = 0; x <= width; x += 2) {
          const angle = (x / width) * Math.PI * 6 + phase;
          const harmonic = Math.sin(angle * 2.5) * (amplitude * 0.25);
          const y = height / 2 + Math.sin(angle) * amplitude + harmonic;
          if (x === 0) ctx2d.moveTo(x, y);
          else ctx2d.lineTo(x, y);
        }
      }

      ctx2d.stroke();
      ctx2d.shadowBlur = 0;

      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [phosphorMode, crtIntensity, muted]);

  return (
    <div className="rounded-lg p-2 bg-[#050705] border border-[#2a2a2a]">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-neutral-500 mb-1">
        <span>Audio Oscilloscope</span>
        <span style={{ color: muted ? '#777' : 'var(--crt-accent)' }}>
          {muted ? 'MUTED' : '60Hz CATHODE'}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={260}
        height={52}
        className="w-full h-13 rounded border border-[#1a1f1a] block"
        aria-label="Live phosphor audio oscilloscope"
      />
    </div>
  );
}

