import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, Message, GenerateOptions, ResolvedConfig } from '../types.js';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    const opts: { apiKey: string; baseURL?: string } = {
      apiKey: config.anthropic.apiKey,
    };
    if (config.anthropic.baseUrl) {
      opts.baseURL = config.anthropic.baseUrl;
    }
    this.client = new Anthropic(opts);
    this.config = config;
  }

  async generate(messages: Message[], options: GenerateOptions): Promise<string> {
    // Separate system message from user/assistant messages
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: 4096,
      temperature: options.temperature,
      system: systemMsg,
      messages: chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const textBlock = response.content.find(b => b.type === 'text');
    return textBlock ? textBlock.text : '';
  }
}
