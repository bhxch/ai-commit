import { describe, it, expect, afterEach } from 'vitest';
import { resolveProxySettings, setupProxy } from '../src/proxy.js';

describe('resolveProxySettings', () => {
  it('is disabled by noProxy even when a proxy URL is set (kill switch)', () => {
    expect(resolveProxySettings({ proxy: 'http://x:8080', noProxy: true })).toEqual({
      enabled: false,
      reason: 'disabled',
    });
  });

  it('is disabled when the proxy URL is empty', () => {
    expect(resolveProxySettings({ proxy: '', noProxy: false })).toEqual({
      enabled: false,
      reason: 'no-url',
    });
  });

  it('is disabled when the proxy URL is only whitespace', () => {
    expect(resolveProxySettings({ proxy: '   ', noProxy: false })).toEqual({
      enabled: false,
      reason: 'no-url',
    });
  });

  it('is active with a trimmed URL when a proxy is set', () => {
    expect(resolveProxySettings({ proxy: '  http://x:8080  ', noProxy: false })).toEqual({
      enabled: true,
      url: 'http://x:8080',
    });
  });
});

describe('setupProxy', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    // Restore the global fetch so proxy state never leaks between tests.
    globalThis.fetch = originalFetch;
  });

  it('leaves globalThis.fetch untouched when noProxy is set', async () => {
    const before = globalThis.fetch;
    const settings = await setupProxy({ proxy: 'http://x:8080', noProxy: true });
    expect(settings.enabled).toBe(false);
    expect(globalThis.fetch).toBe(before);
  });

  it('leaves globalThis.fetch untouched when no proxy URL is configured', async () => {
    const before = globalThis.fetch;
    const settings = await setupProxy({ proxy: '', noProxy: false });
    expect(settings.enabled).toBe(false);
    expect(globalThis.fetch).toBe(before);
  });

  it('overrides globalThis.fetch and reports active when a proxy URL is set', async () => {
    const before = globalThis.fetch;
    const infos: string[] = [];
    const settings = await setupProxy(
      { proxy: 'http://127.0.0.1:9', noProxy: false },
      (m) => infos.push(m),
    );
    expect(settings).toEqual({ enabled: true, url: 'http://127.0.0.1:9' });
    expect(globalThis.fetch).not.toBe(before); // replaced with undici fetch bound to a ProxyAgent
    expect(infos).toHaveLength(1);
    expect(infos[0]).toContain('http://127.0.0.1:9');
  });
});
