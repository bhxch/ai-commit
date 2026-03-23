import { describe, it, expect } from 'vitest';
import { createProvider, formatApiError } from '../src/providers/index.js';

describe('createProvider', () => {
  it('creates OpenAI provider with required config', () => {
    const provider = createProvider({
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      language: 'en',
      prefix: '',
      promptFile: undefined,
      stagedOnly: true,
      gitmoji: false,
      dryRun: false,
      yes: false,
      all: false,
      context: undefined,
      openai: { apiKey: 'sk-test', baseUrl: '', apiVersion: '' },
      gemini: { apiKey: '', baseUrl: '' },
      anthropic: { apiKey: '', baseUrl: '' },
    });
    expect(provider).toBeDefined();
    expect(provider.constructor.name).toContain('OpenAI');
  });

  it('creates Gemini provider with required config', () => {
    const provider = createProvider({
      provider: 'gemini',
      model: 'gemini-pro',
      temperature: 0.7,
      language: 'en',
      prefix: '',
      promptFile: undefined,
      stagedOnly: true,
      gitmoji: false,
      dryRun: false,
      yes: false,
      all: false,
      context: undefined,
      openai: { apiKey: '', baseUrl: '', apiVersion: '' },
      gemini: { apiKey: 'test-key', baseUrl: '' },
      anthropic: { apiKey: '', baseUrl: '' },
    });
    expect(provider).toBeDefined();
  });

  it('creates Anthropic provider with required config', () => {
    const provider = createProvider({
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      temperature: 0.7,
      language: 'en',
      prefix: '',
      promptFile: undefined,
      stagedOnly: true,
      gitmoji: false,
      dryRun: false,
      yes: false,
      all: false,
      context: undefined,
      openai: { apiKey: '', baseUrl: '', apiVersion: '' },
      gemini: { apiKey: '', baseUrl: '' },
      anthropic: { apiKey: 'sk-ant-test', baseUrl: '' },
    });
    expect(provider).toBeDefined();
  });

  it('throws when OpenAI API key is missing', () => {
    expect(() =>
      createProvider({
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.7,
        language: 'en',
        prefix: '',
        promptFile: undefined,
        stagedOnly: true,
        gitmoji: false,
        dryRun: false,
        yes: false,
        all: false,
        context: undefined,
        openai: { apiKey: '', baseUrl: '', apiVersion: '' },
        gemini: { apiKey: '', baseUrl: '' },
        anthropic: { apiKey: '', baseUrl: '' },
      }),
    ).toThrow('OpenAI API key');
  });

  it('throws when Gemini API key is missing', () => {
    expect(() =>
      createProvider({
        provider: 'gemini',
        model: 'gemini-pro',
        temperature: 0.7,
        language: 'en',
        prefix: '',
        promptFile: undefined,
        stagedOnly: true,
        gitmoji: false,
        dryRun: false,
        yes: false,
        all: false,
        context: undefined,
        openai: { apiKey: '', baseUrl: '', apiVersion: '' },
        gemini: { apiKey: '', baseUrl: '' },
        anthropic: { apiKey: '', baseUrl: '' },
      }),
    ).toThrow('Gemini API key');
  });

  it('throws when Anthropic API key is missing', () => {
    expect(() =>
      createProvider({
        provider: 'anthropic',
        model: 'claude-3-sonnet',
        temperature: 0.7,
        language: 'en',
        prefix: '',
        promptFile: undefined,
        stagedOnly: true,
        gitmoji: false,
        dryRun: false,
        yes: false,
        all: false,
        context: undefined,
        openai: { apiKey: '', baseUrl: '', apiVersion: '' },
        gemini: { apiKey: '', baseUrl: '' },
        anthropic: { apiKey: '', baseUrl: '' },
      }),
    ).toThrow('Anthropic API key');
  });
});

describe('formatApiError', () => {
  it('handles 401 errors', () => {
    const err = { status: 401, message: 'Unauthorized' } as any;
    expect(formatApiError(err, 'openai')).toContain('认证失败');
  });

  it('handles 429 errors', () => {
    const err = { status: 429, message: 'Rate limit' } as any;
    expect(formatApiError(err, 'openai')).toContain('速率限制');
  });

  it('handles 500 errors', () => {
    const err = { status: 500, message: 'Internal' } as any;
    expect(formatApiError(err, 'openai')).toContain('服务端错误');
  });

  it('handles unknown errors', () => {
    const err = new Error('network timeout');
    expect(formatApiError(err, 'openai')).toContain('network timeout');
  });
});
