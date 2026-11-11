'use client';

import { useState, useEffect, useRef } from 'react';
import { getSoundEngine } from '../lib/sound-engine';

interface BootSequenceProps {
  onComplete: () => void;
}

/** Modem dial-up boot lines — authentic BBS nostalgia */
const BOOT_LINES = [
  { text: '', delay: 160 },
  { text: 'NECRO-MUD BBS v0.1.0', delay: 75 },
  { text: 'Copyright (c) 2026 Zabdiel & Samkiel', delay: 75 },
  { text: '════════════════════════════════════════', delay: 120 },
  { text: '', delay: 90 },
  { text: 'Initializing modem...', delay: 220 },
  { text: 'ATZ', delay: 130 },
  { text: 'OK', delay: 180 },
  { text: 'ATDT *67 1-800-NECRO-MUD', delay: 280 },
  { text: '', delay: 130 },
  { text: '*** CARRIER DETECTED ***', delay: 240 },
  { text: 'CONNECT 2400/ARQ/V42bis', delay: 190 },
  { text: '', delay: 110 },
  { text: 'Establishing secure tunnel...........', delay: 280 },
  { text: 'Authenticating session...', delay: 220 },
  { text: 'Loading dungeon state...', delay: 240 },
  { text: '', delay: 80 },
  { text: '  ☠ Welcome to the underworld ☠', delay: 200 },
  { text: '', delay: 100 },
  { text: 'Entering terminal mode...', delay: 320 },
];

/**
 * BootSequence — Modem dial-up boot animation with optional WebAudio modem SFX.
 *
 * Displays authentic BBS boot text with a typewriter effect, triggers
 * synthesized DTMF/2400-baud modem handshakes, and transitions to Terminal.
 */
export function BootSequence({ onComplete }: BootSequenceProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const [audioStarted, setAudioStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const handshakePlayedRef = useRef(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines]);

  const handleEnableModemAudio = () => {
    const sound = getSoundEngine();
    sound.unlock();
    setAudioStarted(true);
    if (!handshakePlayedRef.current) {
      handshakePlayedRef.current = true;
      sound.playModemHandshake();
    }
  };

  // React 19 StrictMode-safe sequential typewriter loop
  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | undefined;
    let lineIdx = 0;
    let charIdx = 0;

    setDisplayedLines([]);
    setIsTyping(true);

    const step = () => {
      if (cancelled) return;

      if (lineIdx >= BOOT_LINES.length) {
        setIsTyping(false);
        timerId = setTimeout(() => {
          if (!cancelled) onCompleteRef.current();
        }, 380);
        return;
      }

      const line = BOOT_LINES[lineIdx]!;

      // Trigger modem handshake at ATDT dialing line if audio already unlocked
      if (line.text.startsWith('ATDT') && charIdx === 0 && !handshakePlayedRef.current) {
        const sound = getSoundEngine();
        if (!sound.isMuted()) {
          handshakePlayedRef.current = true;
          sound.playModemHandshake();
        }
      }

      if (line.text === '') {
        setDisplayedLines(prev => [...prev, '']);
        lineIdx += 1;
        charIdx = 0;
        timerId = setTimeout(step, line.delay);
        return;
      }

      if (charIdx === 0) {
        setDisplayedLines(prev => [...prev, line.text.slice(0, 1)]);
      } else {
        const snapshotLine = line.text.slice(0, charIdx + 1);
        setDisplayedLines(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = snapshotLine;
          return updated;
        });
      }

      charIdx += 1;
      if (charIdx < line.text.length) {
        const charDelay = line.text[charIdx - 1] === '.' ? 50 : 17;
        timerId = setTimeout(step, charDelay);
      } else {
        lineIdx += 1;
        charIdx = 0;
        timerId = setTimeout(step, line.delay);
      }
    };

    timerId = setTimeout(step, 220);

    return () => {
      cancelled = true;
      if (timerId !== undefined) clearTimeout(timerId);
      getSoundEngine().stopHandshake();
    };
  }, []);

  const handleSkip = () => {
    getSoundEngine().unlock();
    getSoundEngine().stopHandshake();
    onComplete();
  };

  return (
    <div
      ref={containerRef}
      onClick={handleEnableModemAudio}
      className="w-full h-full min-h-[68vh] p-6 overflow-y-auto font-mono text-sm crt-glow relative cursor-pointer"
      style={{ color: 'var(--crt-accent)' }}
    >
      {displayedLines.map((line, i) => (
        <div key={i} className="leading-6 whitespace-pre">
          {line}
        </div>
      ))}

      {/* Blinking cursor */}
      {isTyping && <span className="boot-cursor" />}

      {/* Bottom controls */}
      <div className="absolute bottom-4 right-6 flex items-center gap-4">
        {!audioStarted && (
          <button
            type="button"
            className="text-xs cursor-pointer hover:opacity-100 transition-opacity bg-transparent border px-2 py-0.5 rounded font-mono"
            style={{
              color: 'var(--crt-accent)',
              borderColor: 'var(--crt-accent-dim)',
              opacity: 0.75,
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleEnableModemAudio();
            }}
          >
            [Dial Modem SFX]
          </button>
        )}

        <button
          type="button"
          className="text-xs cursor-pointer hover:opacity-100 transition-opacity bg-transparent border-0 font-mono"
          style={{ color: 'var(--crt-accent)', opacity: 0.65 }}
          onClick={(e) => {
            e.stopPropagation();
            handleSkip();
          }}
        >
          [Skip boot sequence]
        </button>
      </div>
    </div>
  );
}
