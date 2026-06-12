import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';
import type { ResolvedConfig } from '../src/types.js';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), '.temp/test-config');

const AICOMMIT_ENV_KEYS = [
  'AICOMMIT_PROVIDER', 'AICOMMIT_MODEL', 'AICOMMIT_TEMPERATURE', 'AICOMMIT_LANGUAGE',
  'AICOMMIT_PREFIX', 'AICOMMIT_PROMPT_FILE', 'AICOMMIT_STAGED_ONLY', 'AICOMMIT_GITMOJI',
  'AICOMMIT_SUPPRESS_FALLBACK_WARNING',
  'AICOMMIT_OPENAI_API_KEY', 'AICOMMIT_OPENAI_BASE_URL', 'AICOMMIT_AZURE_API_VERSION',
  'AICOMMIT_GEMINI_API_KEY', 'AICOMMIT_GEMINI_BASE_URL',
  'AICOMMIT_ANTHROPIC_API_KEY', 'AICOMMIT_ANTHROPIC_BASE_URL',
  'OPENAI_API_KEY', 'OPENAI_BASE_URL', 'AZURE_API_VERSION',
  'GEMINI_API_KEY', 'GEMINI_BASE_URL',
  'ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL',
  'AICOMMIT_PROXY', 'AICOMMIT_NO_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY',
];
let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
  savedEnv = {};
  for (const key of AICOMMIT_ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  for (const key of AICOMMIT_ENV_KEYS) {
    if (savedEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = savedEnv[key];
    }
  }
});

function writeConfigFile(path: string, content: object) {
  writeFileSync(path, JSON.stringify(content, null, 2));
}

describe('loadConfig', () => {
  it('returns defaults when no config sources exist', async () => {
    const config = await loadConfig({ provider: undefined });
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o');
    expect(config.temperature).toBe(0.7);
    expect(config.language).toBe('English');
    expect(config.prefix).toBe('');
    expect(config.gitmoji).toBe(true);
    expect(config.dryRun).toBe(false);
    expect(config.yes).toBe(false);
    expect(config.all).toBe(false);
  });

  it('CLI args override everything', async () => {
    const config = await loadConfig({ provider: 'gemini' });
    expect(config.provider).toBe('gemini');
  });

  it('reads project-level config file', async () => {
    const rcPath = join(TEST_DIR, '.aicommitrc.json');
    writeConfigFile(rcPath, { provider: 'anthropic', language: 'Simplified Chinese' });
    const config = await loadConfig({}, TEST_DIR);
    expect(config.provider).toBe('anthropic');
    expect(config.language).toBe('Simplified Chinese');
  });

  it('reads env vars with AICOMMIT_ prefix', async () => {
    process.env.AICOMMIT_PROVIDER = 'gemini';
    process.env.AICOMMIT_LANGUAGE = 'Japanese';
    try {
      const config = await loadConfig({});
      expect(config.provider).toBe('gemini');
      expect(config.language).toBe('Japanese');
    } finally {
      delete process.env.AICOMMIT_PROVIDER;
      delete process.env.AICOMMIT_LANGUAGE;
    }
  });

  it('falls back to unprefixed env vars with warning', async () => {
    delete process.env.AICOMMIT_OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-fallback';
    try {
      const warnings: string[] = [];
      const config = await loadConfig({}, undefined, (w) => warnings.push(w));
      expect(config.openai.apiKey).toBe('sk-fallback');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('OPENAI_API_KEY');
    } finally {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('AICOMMIT_ prefix takes precedence over unprefixed fallback', async () => {
    process.env.AICOMMIT_OPENAI_API_KEY = 'sk-primary';
    process.env.OPENAI_API_KEY = 'sk-fallback';
    try {
      const warnings: string[] = [];
      const config = await loadConfig({}, undefined, (w) => warnings.push(w));
      expect(config.openai.apiKey).toBe('sk-primary');
      expect(warnings.length).toBe(0);
    } finally {
      delete process.env.AICOMMIT_OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('suppresses fallback warnings when configured', async () => {
    delete process.env.AICOMMIT_OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-fallback';
    process.env.AICOMMIT_SUPPRESS_FALLBACK_WARNING = 'true';
    try {
      const warnings: string[] = [];
      const config = await loadConfig({}, undefined, (w) => warnings.push(w));
      expect(config.openai.apiKey).toBe('sk-fallback');
      expect(warnings.length).toBe(0);
    } finally {
      delete process.env.OPENAI_API_KEY;
      delete process.env.AICOMMIT_SUPPRESS_FALLBACK_WARNING;
    }
  });

  it('CLI args override env vars override config file override defaults', async () => {
    const rcPath = join(TEST_DIR, '.aicommitrc.json');
    writeConfigFile(rcPath, { provider: 'gemini', temperature: 0.5 });
    process.env.AICOMMIT_PROVIDER = 'anthropic';
    try {
      const config = await loadConfig({ temperature: 1.0 }, TEST_DIR);
      // CLI arg wins for temperature
      expect(config.temperature).toBe(1.0);
      // Env var wins for provider (CLI didn't specify)
      expect(config.provider).toBe('anthropic');
    } finally {
      delete process.env.AICOMMIT_PROVIDER;
    }
  });

  it('proxy: AICOMMIT_PROXY beats config and standard env', async () => {
    process.env.AICOMMIT_PROXY = 'http://aicommit:8080';
    process.env.HTTPS_PROXY = 'http://standard:8080';
    const rcPath = join(TEST_DIR, '.aicommitrc.json');
    writeConfigFile(rcPath, { proxy: 'http://config:8080' });
    try {
      const config = await loadConfig({}, TEST_DIR);
      expect(config.proxy).toBe('http://aicommit:8080');
      expect(config.noProxy).toBe(false);
    } finally {
      delete process.env.AICOMMIT_PROXY;
      delete process.env.HTTPS_PROXY;
    }
  });

  it('proxy: config beats standard env when AICOMMIT_PROXY unset', async () => {
    process.env.HTTPS_PROXY = 'http://standard:8080';
    const rcPath = join(TEST_DIR, '.aicommitrc.json');
    writeConfigFile(rcPath, { proxy: 'http://config:8080' });
    try {
      const config = await loadConfig({}, TEST_DIR);
      expect(config.proxy).toBe('http://config:8080');
    } finally {
      delete process.env.HTTPS_PROXY;
    }
  });

  it('proxy: falls back to standard HTTPS_PROXY then HTTP_PROXY', async () => {
    process.env.HTTPS_PROXY = 'http://https-env:8080';
    process.env.HTTP_PROXY = 'http://http-env:8080';
    try {
      let config = await loadConfig({});
      expect(config.proxy).toBe('http://https-env:8080'); // HTTPS_PROXY wins over HTTP_PROXY
      delete process.env.HTTPS_PROXY;
      config = await loadConfig({});
      expect(config.proxy).toBe('http://http-env:8080');
    } finally {
      delete process.env.HTTPS_PROXY;
      delete process.env.HTTP_PROXY;
    }
  });

  it('proxy: CLI --proxy takes highest precedence', async () => {
    process.env.AICOMMIT_PROXY = 'http://env:8080';
    try {
      const config = await loadConfig({ proxy: 'http://cli:8080' });
      expect(config.proxy).toBe('http://cli:8080');
    } finally {
      delete process.env.AICOMMIT_PROXY;
    }
  });

  it('noProxy kill switch via AICOMMIT_NO_PROXY ignores a set HTTPS_PROXY', async () => {
    process.env.HTTPS_PROXY = 'http://standard:8080';
    process.env.AICOMMIT_NO_PROXY = 'true';
    try {
      const config = await loadConfig({});
      expect(config.noProxy).toBe(true);
      // URL is still resolved; noProxy is applied at proxy-application time
      expect(config.proxy).toBe('http://standard:8080');
    } finally {
      delete process.env.HTTPS_PROXY;
      delete process.env.AICOMMIT_NO_PROXY;
    }
  });

  it('noProxy: CLI --no-proxy (proxy === false) forces direct even with HTTPS_PROXY', async () => {
    process.env.HTTPS_PROXY = 'http://standard:8080';
    try {
      const config = await loadConfig({ proxy: false });
      expect(config.noProxy).toBe(true);
    } finally {
      delete process.env.HTTPS_PROXY;
    }
  });

  it('reads proxy and noProxy from config file', async () => {
    const rcPath = join(TEST_DIR, '.aicommitrc.json');
    writeConfigFile(rcPath, { proxy: 'http://config:8080', noProxy: true });
    const config = await loadConfig({}, TEST_DIR);
    expect(config.proxy).toBe('http://config:8080');
    expect(config.noProxy).toBe(true);
  });
});
