'use client';

import { useState, useEffect, useRef } from 'react';

interface BootSequenceProps {
  onComplete: () => void;
}

/** Modem dial-up boot lines — authentic BBS nostalgia */
const BOOT_LINES = [
  { text: '', delay: 180 },
  { text: 'NECRO-MUD BBS v0.1.0', delay: 80 },
  { text: 'Copyright (c) 2026 Zabdiel & Eke', delay: 80 },
  { text: '════════════════════════════════════════', delay: 140 },
  { text: '', delay: 100 },
  { text: 'Initializing modem...', delay: 250 },
  { text: 'ATZ', delay: 140 },
  { text: 'OK', delay: 200 },
  { text: 'ATDT *67 1-800-NECRO-MUD', delay: 300 },
  { text: '', delay: 140 },
  { text: '*** CARRIER DETECTED ***', delay: 260 },
  { text: 'CONNECT 2400/ARQ/V42bis', delay: 200 },
  { text: '', delay: 120 },
  { text: 'Establishing secure tunnel...........', delay: 320 },
  { text: 'Authenticating session...', delay: 240 },
  { text: 'Loading dungeon state...', delay: 260 },
  { text: '', delay: 80 },
  { text: '  ☠ Welcome to the underworld ☠', delay: 220 },
  { text: '', delay: 120 },
  { text: 'Entering terminal mode...', delay: 350 },
];

/**
 * BootSequence — Modem dial-up boot animation.
 *
 * Displays authentic BBS boot text with a typewriter effect,
 * then calls onComplete() to transition to the main terminal.
 */
export function BootSequence({ onComplete }: BootSequenceProps) {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines]);

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
        }, 400);
        return;
      }

      const line = BOOT_LINES[lineIdx]!;

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
        const snapshotLen = charIdx + 1;
        const snapshotLine = line.text.slice(0, snapshotLen);
        setDisplayedLines(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = snapshotLine;
          return updated;
        });
      }

      charIdx += 1;
      if (charIdx < line.text.length) {
        const charDelay = line.text[charIdx - 1] === '.' ? 55 : 18;
        timerId = setTimeout(step, charDelay);
      } else {
        lineIdx += 1;
        charIdx = 0;
        timerId = setTimeout(step, line.delay);
      }
    };

    timerId = setTimeout(step, 250);

    return () => {
      cancelled = true;
      if (timerId !== undefined) clearTimeout(timerId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[70vh] p-6 overflow-y-auto font-mono text-sm crt-glow relative"
      style={{ color: '#00FF41' }}
    >
      {displayedLines.map((line, i) => (
        <div key={i} className="leading-6 whitespace-pre">
          {line}
        </div>
      ))}

      {/* Blinking cursor */}
      {isTyping && <span className="boot-cursor" />}

      {/* Skip button */}
      <button
        type="button"
        className="absolute bottom-4 right-6 text-xs cursor-pointer hover:opacity-100 transition-opacity bg-transparent border-0 font-mono"
        style={{ color: '#00FF41', opacity: 0.6 }}
        onClick={onComplete}
      >
        [Skip boot sequence]
      </button>
    </div>
  );
}
