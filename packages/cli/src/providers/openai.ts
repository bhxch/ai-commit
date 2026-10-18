import OpenAI from 'openai';
import type { AIProvider, Message, GenerateOptions, ResolvedConfig } from '../types.js';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    const opts: {
      apiKey: string;
      baseURL?: string;
      defaultQuery?: Record<string, string>;
      defaultHeaders?: Record<string, string>;
    } = {
      apiKey: config.openai.apiKey,
    };
    if (config.openai.baseUrl) {
      opts.baseURL = config.openai.baseUrl;
      if (config.openai.apiVersion) {
        opts.defaultQuery = { 'api-version': config.openai.apiVersion };
        opts.defaultHeaders = { 'api-key': config.openai.apiKey };
      }
    }
    this.client = new OpenAI(opts);
    this.config = config;
  }

  async generate(messages: Message[], options: GenerateOptions): Promise<string> {
    // reasoning_effort only applies to reasoning models; o-series rejects
    // non-default temperature, so temperature is only sent when thinking is off.
    const completion = await this.client.chat.completions.create({
      model: options.model,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      ...(options.thinking
        ? { reasoning_effort: options.thinkingLevel }
        : { temperature: options.temperature }),
    });
    let content = completion.choices[0]?.message?.content || '';
    content = content.replace(/<think[^>]*>([\s\S]*?)<\/think[^>]*>/gi, '').trim();
    return content;
  }
}
