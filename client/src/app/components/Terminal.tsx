'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  VGA_THEME,
  type CommandPacket,
  type CommandType,
  type ServerEventPacket,
} from '@necro-mud/shared';

interface TerminalProps {
  wsUrl: string;
}

/**
 * Terminal — XTerm.js terminal component with WebSocket connection.
 *
 * Connects to the Necro-MUD server, displays ANSI output,
 * and sends typed CommandPackets. Includes exponential-backoff reconnection.
 */
export function Terminal({ wsUrl }: TerminalProps) {
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

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
        promptShownRef.current = false;
        terminal.writeln('\r\n\x1b[1;32m✓ Connected to Necro-MUD server\x1b[0m\r\n');
      };

      ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data as string) as ServerEventPacket;
          if (packet.type === 'event') {
            const payload = packet.payload;

            if (packet.event === 'welcome' && typeof payload.playerId === 'string') {
              playerIdRef.current = payload.playerId;
            }

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
        if (!unmountedRef.current) {
          terminal.writeln('\r\n\x1b[1;31m✗ Disconnected from server\x1b[0m');
          scheduleReconnect(terminal, connect);
        }
      };

      ws.onerror = () => {
        // onclose will handle reconnection
      };
    } catch {
      terminal.writeln('\r\n\x1b[1;31m✗ Failed to connect\x1b[0m');
      scheduleReconnect(terminal, connect);
    }
  }, [wsUrl, schedulePrompt, scheduleReconnect]);

  useEffect(() => {
    if (!containerRef.current || xtermRef.current) return;
    unmountedRef.current = false;

    const terminal = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      theme: { ...VGA_THEME },
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
    });

    xtermRef.current = { terminal, fitAddon };

    const inputDisposable = terminal.onData((data) => {
      const code = data.charCodeAt(0);

      // Enter key
      if (code === 13) {
        terminal.write('\r\n');
        promptShownRef.current = false;
        const rawInput = commandBufferRef.current.trim();
        commandBufferRef.current = '';

        if (rawInput && wsRef.current?.readyState === WebSocket.OPEN) {
          const parts = rawInput.split(/\s+/);
          const packet: CommandPacket = {
            type: 'command',
            command: (parts[0] ?? '').toUpperCase() as CommandType,
            args: parts.slice(1),
            playerId: playerIdRef.current,
            timestamp: Date.now(),
          };
          wsRef.current.send(JSON.stringify(packet));
        } else if (rawInput) {
          terminal.writeln('\x1b[31mNot connected to server.\x1b[0m');
          terminal.write('\x1b[1;33m> \x1b[0m');
          promptShownRef.current = true;
        } else {
          terminal.write('\x1b[1;33m> \x1b[0m');
          promptShownRef.current = true;
        }
      }
      // Backspace
      else if (code === 127) {
        if (commandBufferRef.current.length > 0) {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
          terminal.write('\b \b');
        }
      }
      // Printable ASCII characters
      else if (code >= 32 && code !== 127 && !data.startsWith('\x1b')) {
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
  }, [connect]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[70vh] p-2"
      style={{ background: 'transparent' }}
    />
  );
}
