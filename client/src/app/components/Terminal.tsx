'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm, type ITheme } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  VGA_THEME,
  type CommandPacket,
  type CommandType,
  type ServerEventPacket,
} from '@necro-mud/shared';
import type { PhosphorMode } from './CrtBezel';
import type { ConnectionState } from './TacticalHud';
import { getClientWsUrl } from '../lib/endpoints';
import { getSoundEngine } from '../lib/sound-engine';

const PHOSPHOR_XTERM_THEMES: Record<PhosphorMode, ITheme> = {
  vga: { ...VGA_THEME },
  green: {
    ...VGA_THEME,
    background: '#020502',
    foreground: '#55FF55',
    cursor: '#00FF41',
    white: '#33CC33',
    brightWhite: '#77FF77',
    cyan: '#22BB44',
    brightCyan: '#00FF41',
    yellow: '#88DD22',
    brightYellow: '#AAFF44',
  },
  amber: {
    ...VGA_THEME,
    background: '#050300',
    foreground: '#FFB000',
    cursor: '#FFD066',
    white: '#DD8800',
    brightWhite: '#FFD277',
    cyan: '#CC7700',
    brightCyan: '#FFB000',
    green: '#EE9900',
    brightGreen: '#FFCC33',
    yellow: '#FFAA00',
    brightYellow: '#FFE066',
  },
  blood: {
    ...VGA_THEME,
    background: '#050002',
    foreground: '#FF6688',
    cursor: '#FF3366',
    white: '#CC4466',
    brightWhite: '#FF99B3',
    cyan: '#BB2255',
    brightCyan: '#FF3366',
    green: '#EE4477',
    brightGreen: '#FF5588',
    yellow: '#FF6644',
    brightYellow: '#FFAA88',
  },
};

interface TerminalProps {
  wsUrl?: string;
  phosphorMode: PhosphorMode;
  onServerEvent?: (packet: ServerEventPacket) => void;
  onConnectionChange?: (state: ConnectionState, latencyMs?: number | null) => void;
  onRegisterSender?: (sendFn: (rawCommand: string) => void) => void;
}

/**
 * Terminal — XTerm.js terminal component with WebSocket connection.
 *
 * Connects to NEXT_PUBLIC_WS_URL (default ws://localhost:4000), displays
 * 80x24 ANSI output, triggers WebAudio keystroke/event SFX, and forwards
 * Wave 3+ events to TacticalHud and PatchModal.
 */
export function Terminal({
  wsUrl,
  phosphorMode,
  onServerEvent,
  onConnectionChange,
  onRegisterSender,
}: TerminalProps) {
  const effectiveWsUrl = wsUrl ?? getClientWsUrl();
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<{ terminal: XTerm; fitAddon: FitAddon } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const playerIdRef = useRef<string>('pending');
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptShownRef = useRef(false);
  const unmountedRef = useRef(false);
  const commandBufferRef = useRef('');
  const lastCommandSentAtRef = useRef<number | null>(null);

  const onServerEventRef = useRef(onServerEvent);
  onServerEventRef.current = onServerEvent;

  const onConnectionChangeRef = useRef(onConnectionChange);
  onConnectionChangeRef.current = onConnectionChange;

  const onRegisterSenderRef = useRef(onRegisterSender);
  onRegisterSenderRef.current = onRegisterSender;

  const schedulePrompt = useCallback((terminal: XTerm) => {
    if (promptTimerRef.current) {
      clearTimeout(promptTimerRef.current);
    }
    promptTimerRef.current = setTimeout(() => {
      promptTimerRef.current = null;
      if (!promptShownRef.current) {
        terminal.write(`\x1b[1;33m> \x1b[0m${commandBufferRef.current}`);
        promptShownRef.current = true;
      }
    }, 30);
  }, []);

  const dispatchCommand = useCallback((rawInput: string, echoToTerminal: boolean) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return;

    const terminal = xtermRef.current?.terminal;
    const ws = wsRef.current;

    if (echoToTerminal && terminal) {
      if (promptShownRef.current) {
        terminal.write('\r\x1b[2K');
        promptShownRef.current = false;
      }
      terminal.writeln(`\x1b[1;33m> \x1b[0m${trimmed}`);
      commandBufferRef.current = '';
      terminal.focus();
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      const parts = trimmed.split(/\s+/);
      const packet: CommandPacket = {
        type: 'command',
        command: (parts[0] ?? '').toUpperCase() as CommandType,
        args: parts.slice(1),
        playerId: playerIdRef.current,
        timestamp: Date.now(),
      };
      lastCommandSentAtRef.current = performance.now();
      ws.send(JSON.stringify(packet));
    } else if (terminal) {
      terminal.writeln('\x1b[31mNot connected to server.\x1b[0m');
      terminal.write('\x1b[1;33m> \x1b[0m');
      promptShownRef.current = true;
    }
  }, []);

  // Register sender callback for TacticalHud & PatchModal
  useEffect(() => {
    onRegisterSenderRef.current?.((rawCmd: string) => {
      getSoundEngine().unlock();
      getSoundEngine().playKeystroke();
      dispatchCommand(rawCmd, true);
    });
  }, [dispatchCommand]);

  // Apply phosphor mode changes live to XTerm theme
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.terminal.options.theme = PHOSPHOR_XTERM_THEMES[phosphorMode];
    }
  }, [phosphorMode]);

  const scheduleReconnect = useCallback((terminal: XTerm, connectFn: (t: XTerm) => void) => {
    if (unmountedRef.current) return;
    const attempt = reconnectAttemptRef.current++;
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

    terminal.writeln(`\r\n\x1b[90mReconnecting in ${delay / 1000}s...\x1b[0m`);

    reconnectTimerRef.current = setTimeout(() => {
      if (!unmountedRef.current && containerRef.current) {
        connectFn(terminal);
      }
    }, delay);
  }, []);

  const connect = useCallback((terminal: XTerm) => {
    if (unmountedRef.current) return;
    onConnectionChangeRef.current?.('connecting', null);

    try {
      const ws = new WebSocket(effectiveWsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        promptShownRef.current = false;
        onConnectionChangeRef.current?.('connected', 0);
        terminal.writeln(`\r\n\x1b[1;32m✓ Connected to Necro-MUD (${effectiveWsUrl})\x1b[0m\r\n`);
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data as string) as ServerEventPacket;
          if (packet.type === 'event') {
            const payload = packet.payload;

            if (lastCommandSentAtRef.current !== null) {
              const rtt = Math.max(1, Math.round(performance.now() - lastCommandSentAtRef.current));
              lastCommandSentAtRef.current = null;
              onConnectionChangeRef.current?.('connected', rtt);
            }

            if (packet.event === 'welcome' && typeof payload.playerId === 'string') {
              playerIdRef.current = payload.playerId;
            }

            onServerEventRef.current?.(packet);
            getSoundEngine().playEventSfx(packet.event, payload);

            // Clear active prompt line if async output arrives mid-typing
            if (promptShownRef.current) {
              terminal.write('\r\x1b[2K');
              promptShownRef.current = false;
            }

            if (typeof payload.banner === 'string') {
              terminal.write(payload.banner);
            }

            if (packet.event === 'error' && typeof payload.message === 'string') {
              terminal.writeln(`\x1b[1;31m✗ ${payload.message}\x1b[0m`);
            } else if (typeof payload.message === 'string') {
              terminal.write(payload.message);
            }

            if (typeof payload.ansi === 'string') {
              terminal.write(payload.ansi);
            }

            schedulePrompt(terminal);
          }
        } catch {
          terminal.write(event.data as string);
        }
      };

      ws.onclose = () => {
        promptShownRef.current = false;
        onConnectionChangeRef.current?.('disconnected', null);
        if (!unmountedRef.current) {
          terminal.writeln('\r\n\x1b[1;31m✗ Disconnected from server\x1b[0m');
          scheduleReconnect(terminal, connect);
        }
      };

      ws.onerror = () => {
        // onclose handles reconnection
      };
    } catch {
      onConnectionChangeRef.current?.('disconnected', null);
      terminal.writeln('\r\n\x1b[1;31m✗ Failed to connect\x1b[0m');
      scheduleReconnect(terminal, connect);
    }
  }, [effectiveWsUrl, schedulePrompt, scheduleReconnect]);

  useEffect(() => {
    if (!containerRef.current || xtermRef.current) return;
    unmountedRef.current = false;

    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      theme: PHOSPHOR_XTERM_THEMES[phosphorMode],
      fontSize: 14,
      fontFamily: '"Courier New", "Lucida Console", Monaco, monospace',
      cols: 80,
      rows: 24,
      scrollback: 1000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    requestAnimationFrame(() => {
      fitAddon.fit();
      terminal.focus();
    });

    xtermRef.current = { terminal, fitAddon };

    const inputDisposable = terminal.onData((data) => {
      const sound = getSoundEngine();
      sound.unlock();

      const code = data.charCodeAt(0);

      // Enter key
      if (code === 13) {
        sound.playKeystroke();
        terminal.write('\r\n');
        promptShownRef.current = false;
        const rawInput = commandBufferRef.current.trim();
        commandBufferRef.current = '';

        if (rawInput) {
          dispatchCommand(rawInput, false);
        } else {
          terminal.write('\x1b[1;33m> \x1b[0m');
          promptShownRef.current = true;
        }
      }
      // Backspace
      else if (code === 127) {
        sound.playKeystroke();
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
          terminal.write('\b \b');
        }
      }
      // Printable ASCII characters
      else if (code >= 32 && code !== 127 && !data.startsWith('\x1b')) {
        sound.playKeystroke();
        commandBufferRef.current += data;
        terminal.write(data);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    connect(terminal);

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
      inputDisposable.dispose();
      window.removeEventListener('resize', handleResize);
      wsRef.current?.close();
      terminal.dispose();
      xtermRef.current = null;
    };
  }, [connect, dispatchCommand]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[68vh] p-2"
      style={{ background: 'transparent' }}
    />
  );
}
