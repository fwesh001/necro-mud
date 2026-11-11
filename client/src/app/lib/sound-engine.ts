'use client';

import type { ServerEventType } from '@necro-mud/shared';

const STORAGE_MUTED_KEY = 'necro-mud:audio-muted';
const STORAGE_AMBIENT_KEY = 'necro-mud:audio-ambient';

/**
 * RetroSoundEngine — Zero-dependency procedural WebAudio synthesizer.
 *
 * Synthesizes 1980s modem handshakes, IBM Model M mechanical keystrokes,
 * CRT degauss coil discharges, 8-bit chiptune event cues, and a 60Hz hum.
 */
export class RetroSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private ambientEnabled: boolean = false;
  private ambientNodes: {
    osc60: OscillatorNode;
    oscSub: OscillatorNode;
    masterGain: GainNode;
  } | null = null;
  private activeHandshakeStop: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.muted = window.localStorage.getItem(STORAGE_MUTED_KEY) === 'true';
        this.ambientEnabled = window.localStorage.getItem(STORAGE_AMBIENT_KEY) === 'true';
      } catch {
        // Ignore storage access errors in restricted environments
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        // Autoplay restriction until user gesture — safe no-op
      });
    }

    return this.ctx;
  }

  /** Unlock audio context on first user click/keydown */
  unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && this.ambientEnabled && !this.muted && !this.ambientNodes) {
      this.startAmbientInternal(ctx);
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_MUTED_KEY, String(muted));
      } catch {
        // Ignore storage errors
      }
    }

    if (muted) {
      this.stopHandshake();
      this.stopAmbientInternal();
    } else if (this.ambientEnabled) {
      const ctx = this.ensureContext();
      if (ctx) this.startAmbientInternal(ctx);
    }
  }

  isAmbientEnabled(): boolean {
    return this.ambientEnabled;
  }

  /** Toggle continuous 60Hz CRT transformer hum + eerie sub-bass drone */
  toggleAmbientHum(force?: boolean): boolean {
    const next = force !== undefined ? force : !this.ambientEnabled;
    this.ambientEnabled = next;

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_AMBIENT_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
    }

    if (next && !this.muted) {
      const ctx = this.ensureContext();
      if (ctx) this.startAmbientInternal(ctx);
    } else {
      this.stopAmbientInternal();
    }

    return this.ambientEnabled;
  }

  private startAmbientInternal(ctx: AudioContext): void {
    if (this.ambientNodes) return;

    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.linearRampToValueAtTime(0.032, now + 0.35);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(160, now);

    const osc60 = ctx.createOscillator();
    osc60.type = 'sawtooth';
    osc60.frequency.setValueAtTime(60, now);

    const gain60 = ctx.createGain();
    gain60.gain.setValueAtTime(0.45, now);

    const oscSub = ctx.createOscillator();
    oscSub.type = 'triangle';
    oscSub.frequency.setValueAtTime(55, now);

    const gainSub = ctx.createGain();
    gainSub.gain.setValueAtTime(0.55, now);

    osc60.connect(gain60);
    gain60.connect(lowpass);
    oscSub.connect(gainSub);
    gainSub.connect(lowpass);
    lowpass.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc60.start(now);
    oscSub.start(now);

    this.ambientNodes = { osc60, oscSub, masterGain };
  }

  private stopAmbientInternal(): void {
    const nodes = this.ambientNodes;
    if (!nodes || !this.ctx) return;

    const now = this.ctx.currentTime;
    nodes.masterGain.gain.cancelScheduledValues(now);
    nodes.masterGain.gain.setValueAtTime(nodes.masterGain.gain.value, now);
    nodes.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.15);

    setTimeout(() => {
      try {
        nodes.osc60.stop();
        nodes.oscSub.stop();
        nodes.masterGain.disconnect();
      } catch {
        // Already stopped
      }
    }, 180);

    this.ambientNodes = null;
  }

  stopHandshake(): void {
    if (this.activeHandshakeStop) {
      this.activeHandshakeStop();
      this.activeHandshakeStop = null;
    }
  }

  /**
   * Play authentic 1980s modem handshake:
   * DTMF dialing tones → 2100Hz answer carrier → 2400 baud FSK warble + noise burst.
   */
  playModemHandshake(): () => void {
    this.stopHandshake();
    if (this.muted) return () => {};

    const ctx = this.ensureContext();
    if (!ctx) return () => {};

    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.11, now);
    master.connect(ctx.destination);

    const cleanupOscs: Array<{ stop: () => void }> = [];
    let stopped = false;

    const stopFn = () => {
      if (stopped) return;
      stopped = true;
      try {
        master.gain.setValueAtTime(0.0001, ctx.currentTime);
        master.disconnect();
      } catch {
        // Ignore
      }
      for (const node of cleanupOscs) {
        try {
          node.stop();
        } catch {
          // Ignore
        }
      }
    };

    this.activeHandshakeStop = stopFn;

    // Phase 1: DTMF dialing digits (7 tones)
    const dtmfPairs: Array<[number, number]> = [
      [697, 1209],
      [852, 1336],
      [697, 1477],
      [770, 1209],
      [770, 1477],
      [852, 1209],
      [941, 1336],
    ];

    let offset = 0.05;
    for (const [low, high] of dtmfPairs) {
      const toneGain = ctx.createGain();
      toneGain.gain.setValueAtTime(0.0001, now + offset);
      toneGain.gain.linearRampToValueAtTime(0.35, now + offset + 0.01);
      toneGain.gain.setValueAtTime(0.35, now + offset + 0.075);
      toneGain.gain.linearRampToValueAtTime(0.0001, now + offset + 0.09);
      toneGain.connect(master);

      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      o1.frequency.setValueAtTime(low, now + offset);
      o2.frequency.setValueAtTime(high, now + offset);
      o1.connect(toneGain);
      o2.connect(toneGain);
      o1.start(now + offset);
      o2.start(now + offset);
      o1.stop(now + offset + 0.095);
      o2.stop(now + offset + 0.095);
      cleanupOscs.push(o1, o2);

      offset += 0.125;
    }

    // Phase 2: 2100Hz V.25 answer tone
    const answerStart = now + offset + 0.18;
    const answerOsc = ctx.createOscillator();
    const answerGain = ctx.createGain();
    answerOsc.type = 'sine';
    answerOsc.frequency.setValueAtTime(2100, answerStart);
    answerGain.gain.setValueAtTime(0.0001, answerStart);
    answerGain.gain.linearRampToValueAtTime(0.45, answerStart + 0.03);
    answerGain.gain.setValueAtTime(0.45, answerStart + 0.45);
    answerGain.gain.linearRampToValueAtTime(0.0001, answerStart + 0.5);
    answerOsc.connect(answerGain);
    answerGain.connect(master);
    answerOsc.start(answerStart);
    answerOsc.stop(answerStart + 0.52);
    cleanupOscs.push(answerOsc);

    // Phase 3: 2400 baud FSK modulation + carrier white-noise burst
    const fskStart = answerStart + 0.54;
    const fskOsc = ctx.createOscillator();
    const fskGain = ctx.createGain();
    fskOsc.type = 'square';
    const fskFreqs = [1200, 2200, 1650, 2400, 1200, 1850, 2400, 1400, 2100, 1200];
    fskFreqs.forEach((freq, idx) => {
      fskOsc.frequency.setValueAtTime(freq, fskStart + idx * 0.055);
    });
    fskGain.gain.setValueAtTime(0.24, fskStart);
    fskGain.gain.linearRampToValueAtTime(0.0001, fskStart + 0.65);

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1800, fskStart);
    bandpass.Q.setValueAtTime(1.2, fskStart);

    fskOsc.connect(bandpass);
    bandpass.connect(fskGain);
    fskGain.connect(master);
    fskOsc.start(fskStart);
    fskOsc.stop(fskStart + 0.66);
    cleanupOscs.push(fskOsc);

    // Bandlimited static hiss
    const noiseLen = Math.floor(ctx.sampleRate * 0.65);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(2100, fskStart);
    noiseFilter.Q.setValueAtTime(2.0, fskStart);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, fskStart);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, fskStart + 0.64);
    noiseSrc.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noiseSrc.start(fskStart);
    noiseSrc.stop(fskStart + 0.65);
    cleanupOscs.push(noiseSrc);

    const totalMs = Math.ceil((fskStart - now + 0.7) * 1000);
    setTimeout(() => {
      if (this.activeHandshakeStop === stopFn) {
        this.activeHandshakeStop = null;
      }
      stopFn();
    }, totalMs);

    return stopFn;
  }

  /** Crisp IBM Model M mechanical bucking-spring keystroke */
  playKeystroke(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;

    // 1. Short high-pass click transient
    const clickSamples = Math.floor(ctx.sampleRate * 0.014);
    const buf = ctx.createBuffer(1, clickSamples, ctx.sampleRate);
    const channel = buf.getChannelData(0);
    for (let i = 0; i < clickSamples; i++) {
      channel[i] = (Math.random() * 2 - 1) * Math.exp(-i / (clickSamples * 0.3));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(2400, now);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.11, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

    noise.connect(hp);
    hp.connect(clickGain);
    clickGain.connect(ctx.destination);
    noise.start(now);

    // 2. Mechanical thud
    const thudOsc = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thudOsc.type = 'triangle';
    thudOsc.frequency.setValueAtTime(145, now);
    thudOsc.frequency.exponentialRampToValueAtTime(55, now + 0.022);
    thudGain.gain.setValueAtTime(0.06, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);
    thudOsc.start(now);
    thudOsc.stop(now + 0.026);
  }

  /** Heavy CRT magnetic degauss coil thump + decaying AC hum */
  playDegauss(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Capacitor thump
    const thumpOsc = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(135, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(42, now + 0.18);
    thumpGain.gain.setValueAtTime(0.28, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    thumpOsc.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.24);

    // 60Hz/120Hz coil ring decay
    const coilOsc = ctx.createOscillator();
    const coilGain = ctx.createGain();
    coilOsc.type = 'sawtooth';
    coilOsc.frequency.setValueAtTime(120, now);
    coilOsc.frequency.linearRampToValueAtTime(60, now + 0.75);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(420, now);

    coilGain.gain.setValueAtTime(0.16, now);
    coilGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.85);

    coilOsc.connect(lp);
    lp.connect(coilGain);
    coilGain.connect(ctx.destination);
    coilOsc.start(now);
    coilOsc.stop(now + 0.88);
  }

  /** Play 8-bit chiptune cues based on server event type */
  playEventSfx(event: ServerEventType): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;

    switch (event) {
      case 'combat-result': {
        this.playTone(ctx, 'square', 520, 140, now, 0.11, 0.07);
        this.playTone(ctx, 'sawtooth', 180, 70, now + 0.05, 0.12, 0.06);
        break;
      }
      case 'monster-spawned': {
        const notes = [220, 207.65, 196, 155.56];
        notes.forEach((freq, i) => {
          this.playTone(ctx, 'triangle', freq, freq, now + i * 0.08, 0.075, 0.07);
        });
        break;
      }
      case 'monster-slain': {
        const fanfare = [392, 523.25, 659.25, 783.99];
        fanfare.forEach((freq, i) => {
          this.playTone(
            ctx,
            'square',
            freq,
            freq,
            now + i * 0.085,
            i === fanfare.length - 1 ? 0.24 : 0.08,
            0.07,
          );
        });
        break;
      }
      case 'error': {
        this.playTone(ctx, 'sawtooth', 115, 95, now, 0.18, 0.08);
        break;
      }
      case 'player-joined':
      case 'room-description': {
        this.playTone(ctx, 'sine', 660, 880, now, 0.06, 0.035);
        break;
      }
      default:
        break;
    }
  }

  private playTone(
    ctx: AudioContext,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number,
    volume: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, startTime);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.015);
  }
}

let sharedSoundEngine: RetroSoundEngine | null = null;

export function getSoundEngine(): RetroSoundEngine {
  if (!sharedSoundEngine) {
    sharedSoundEngine = new RetroSoundEngine();
  }
  return sharedSoundEngine;
}

