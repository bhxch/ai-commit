import type { AIProvider, ResolvedConfig } from '../types.js';
import { OpenAIProvider } from './openai.js';
import { GeminiProvider } from './gemini.js';
import { AnthropicProvider } from './anthropic.js';

export { OpenAIProvider } from './openai.js';
export { GeminiProvider } from './gemini.js';
export { AnthropicProvider } from './anthropic.js';

export function createProvider(config: ResolvedConfig): AIProvider {
  switch (config.provider) {
    case 'openai':
      if (!config.openai.apiKey)
        throw new Error(
          'OpenAI API key is required. Set AICOMMIT_OPENAI_API_KEY or OPENAI_API_KEY.'
        );
      return new OpenAIProvider(config);
    case 'gemini':
      if (!config.gemini.apiKey)
        throw new Error(
          'Gemini API key is required. Set AICOMMIT_GEMINI_API_KEY or GEMINI_API_KEY.'
        );
      return new GeminiProvider(config);
    case 'anthropic':
      if (!config.anthropic.apiKey)
        throw new Error(
          'Anthropic API key is required. Set AICOMMIT_ANTHROPIC_API_KEY or ANTHROPIC_API_KEY.'
        );
      return new AnthropicProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export function formatApiError(error: unknown, provider: string): string {
  const err = error as any;
  if (err?.status) {
    switch (err.status) {
      case 401:
        return `[${provider}] 认证失败: API key 无效或已过期。请检查 ${provider.toUpperCase()}_API_KEY 环境变量。`;
      case 429:
        return `[${provider}] 速率限制: 请求过于频繁，请稍后重试。`;
      case 500:
        return `[${provider}] 服务端错误: AI 服务暂时不可用，请稍后重试。`;
      case 503:
        return `[${provider}] 服务不可用: AI 服务维护中，请稍后重试。`;
      default:
        return `[${provider}] API 错误 (${err.status}): ${err.message}`;
    }
  }
  if (err instanceof Error) return `[${provider}] ${err.message}`;
  return `[${provider}] 未知错误: ${String(error)}`;
}
