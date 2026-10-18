import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  anthropicCreate: vi.fn(),
  openaiCreate: vi.fn(),
  geminiChatsCreate: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mocks.anthropicCreate };
    constructor(_opts: unknown) {}
  },
}));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mocks.openaiCreate } };
    constructor(_opts: unknown) {}
  },
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    chats = {
      create: (...args: unknown[]) => mocks.geminiChatsCreate(...args),
    };
    constructor(_opts: unknown) {}
  },
}));

const { AnthropicProvider } = await import('../src/providers/anthropic.js');
const { GeminiProvider } = await import('../src/providers/gemini.js');
const { OpenAIProvider } = await import('../src/providers/openai.js');
import type { GenerateOptions, ResolvedConfig } from '../src/types.js';

function makeConfig(provider: 'anthropic' | 'gemini' | 'openai'): ResolvedConfig {
  return {
    provider,
    model: 'test-model',
    temperature: 0.7,
    language: 'English',
    prefix: '',
    promptFile: undefined,
    stagedOnly: true,
    gitmoji: false,
    dryRun: false,
    yes: false,
    all: false,
    context: undefined,
    thinking: false,
    thinkingLevel: 'medium',
    proxy: '',
    noProxy: false,
    openai: { apiKey: 'sk-test', baseUrl: '', apiVersion: '' },
    gemini: { apiKey: 'test-key', baseUrl: '' },
    anthropic: { apiKey: 'sk-ant-test', baseUrl: '' },
  };
}

function makeOptions(overrides: Partial<GenerateOptions> = {}): GenerateOptions {
  return {
    model: 'test-model',
    temperature: 0.7,
    thinking: false,
    thinkingLevel: 'medium',
    ...overrides,
  };
}

const MESSAGES = [{ role: 'user' as const, content: 'generate a commit message' }];

beforeEach(() => {
  mocks.anthropicCreate.mockReset().mockResolvedValue({ content: [{ type: 'text', text: 'feat: x' }] });
  mocks.openaiCreate.mockReset().mockResolvedValue({ choices: [{ message: { content: 'feat: x' } }] });
  mocks.geminiChatsCreate.mockReset().mockReturnValue({
    sendMessage: async () => ({ text: 'feat: x' }),
  });
});

describe('AnthropicProvider thinking control', () => {
  it('sends temperature without thinking config when thinking is off', async () => {
    const provider = new AnthropicProvider(makeConfig('anthropic'));
    await provider.generate(MESSAGES, makeOptions({ thinking: false }));
    const args = mocks.anthropicCreate.mock.calls[0][0];
    expect(args.thinking).toBeUndefined();
    expect(args.temperature).toBe(0.7);
    expect(args.max_tokens).toBe(4096);
  });

  it.each([
    ['low', 2048, 6144],
    ['medium', 8192, 12288],
    ['high', 16384, 20480],
  ])('maps thinkingLevel %s to budget_tokens %i', async (level, budget, maxTokens) => {
    const provider = new AnthropicProvider(makeConfig('anthropic'));
    await provider.generate(MESSAGES, makeOptions({ thinking: true, thinkingLevel: level as 'low' }));
    const args = mocks.anthropicCreate.mock.calls[0][0];
    expect(args.thinking).toEqual({ type: 'enabled', budget_tokens: budget });
    expect(args.max_tokens).toBe(maxTokens);
    expect(args.temperature).toBeUndefined();
  });
});

describe('GeminiProvider thinking control', () => {
  it('omits thinkingConfig when thinking is off', async () => {
    const provider = new GeminiProvider(makeConfig('gemini'));
    await provider.generate(MESSAGES, makeOptions({ thinking: false }));
    const config = mocks.geminiChatsCreate.mock.calls[0][0].config;
    expect(config.thinkingConfig).toBeUndefined();
    expect(config.temperature).toBe(0.7);
  });

  it.each([
    ['low', 2048],
    ['medium', 8192],
    ['high', 24576],
  ])('maps thinkingLevel %s to thinkingBudget %i', async (level, budget) => {
    const provider = new GeminiProvider(makeConfig('gemini'));
    await provider.generate(MESSAGES, makeOptions({ thinking: true, thinkingLevel: level as 'low' }));
    const config = mocks.geminiChatsCreate.mock.calls[0][0].config;
    expect(config.thinkingConfig).toEqual({ thinkingBudget: budget });
  });
});

describe('OpenAIProvider thinking control', () => {
  it('sends temperature without reasoning_effort when thinking is off', async () => {
    const provider = new OpenAIProvider(makeConfig('openai'));
    await provider.generate(MESSAGES, makeOptions({ thinking: false }));
    const args = mocks.openaiCreate.mock.calls[0][0];
    expect(args.reasoning_effort).toBeUndefined();
    expect(args.temperature).toBe(0.7);
  });

  it.each(['low', 'medium', 'high'] as const)(
    'maps thinkingLevel %s to reasoning_effort and omits temperature',
    async (level) => {
      const provider = new OpenAIProvider(makeConfig('openai'));
      await provider.generate(MESSAGES, makeOptions({ thinking: true, thinkingLevel: level }));
      const args = mocks.openaiCreate.mock.calls[0][0];
      expect(args.reasoning_effort).toBe(level);
      expect(args.temperature).toBeUndefined();
    },
  );
});
