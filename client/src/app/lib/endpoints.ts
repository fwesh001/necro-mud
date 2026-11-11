/**
 * Endpoint Resolution Helpers
 *
 * Resolves the WebSocket URL from NEXT_PUBLIC_WS_URL and derives the
 * matching HTTP/HTTPS /api/health endpoint for Render cold-start wakeups.
 */

const DEFAULT_WS_URL = 'ws://localhost:4000';

/**
 * Resolve the configured WebSocket URL with a safe local default.
 */
export function resolveWsUrl(rawEnvUrl?: string): string {
  const trimmed = (rawEnvUrl ?? '').trim();
  if (!trimmed) return DEFAULT_WS_URL;
  return trimmed.replace(/\/+$/, '');
}

/**
 * Read NEXT_PUBLIC_WS_URL safely in browser or SSR contexts.
 */
export function getClientWsUrl(): string {
  return resolveWsUrl(process.env.NEXT_PUBLIC_WS_URL);
}

/**
 * Derive the HTTP(S) /api/health wake-up endpoint from a ws:// or wss:// URL.
 */
export function deriveHealthUrl(wsUrl: string): string {
  const normalized = resolveWsUrl(wsUrl);

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === 'wss:') {
      parsed.protocol = 'https:';
    } else if (parsed.protocol === 'ws:') {
      parsed.protocol = 'http:';
    }
    parsed.pathname = '/api/health';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    const httpBase = normalized
      .replace(/^wss:\/\//i, 'https://')
      .replace(/^ws:\/\//i, 'http://')
      .replace(/\/+$/, '');
    return `${httpBase}/api/health`;
  }
}

