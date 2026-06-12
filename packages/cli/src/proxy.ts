import type { ResolvedConfig } from './types.js';

export interface ProxySettings {
  enabled: boolean;
  url?: string;
  /** Why the proxy is inactive, for diagnostics. */
  reason?: 'disabled' | 'no-url';
}

/**
 * Decide whether a proxy should be used, given the resolved config.
 * `noProxy` (force-direct) wins even when a proxy URL is present — this is
 * the kill switch requested for ignoring proxy settings and going direct.
 */
export function resolveProxySettings(
  config: Pick<ResolvedConfig, 'proxy' | 'noProxy'>,
): ProxySettings {
  if (config.noProxy) return { enabled: false, reason: 'disabled' };
  const url = config.proxy?.trim();
  if (!url) return { enabled: false, reason: 'no-url' };
  return { enabled: true, url };
}

/**
 * Apply the resolved proxy by routing the process-wide `fetch` through
 * undici's ProxyAgent. This covers every provider — openai, anthropic and
 * gemini all call the global `fetch` (verified: the Stainless shims return
 * `globalThis.fetch`, and gemini offers no custom fetch hook).
 *
 * No-op when the proxy is disabled or unset, leaving the default direct
 * connection untouched. Must run before any SDK client is constructed so the
 * clients bind to the proxied fetch.
 */
export async function setupProxy(
  config: Pick<ResolvedConfig, 'proxy' | 'noProxy'>,
  onInfo?: (msg: string) => void,
): Promise<ProxySettings> {
  const settings = resolveProxySettings(config);
  if (!settings.enabled || !settings.url) return settings;

  const { ProxyAgent, setGlobalDispatcher, fetch: undiciFetch } = await import('undici');
  setGlobalDispatcher(new ProxyAgent(settings.url));
  globalThis.fetch = undiciFetch as unknown as typeof globalThis.fetch;

  onInfo?.(`[info] Routing API requests through proxy: ${settings.url}`);
  return settings;
}
