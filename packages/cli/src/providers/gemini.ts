import { GoogleGenAI } from '@google/genai';
import type { AIProvider, Message, GenerateOptions, ResolvedConfig, ThinkingLevel } from '../types.js';

// thinkingBudget in tokens; 24576 is the upper bound for Gemini 2.5 Flash,
// 32768 for Gemini 2.5 Pro — the `max` tier therefore requires a Pro model.
const THINKING_BUDGET: Record<ThinkingLevel, number> = {
  low: 2048,
  medium: 8192,
  high: 16384,
  xhigh: 24576,
  max: 32768,
};

export class GeminiProvider implements AIProvider {
  private config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
  }

  async generate(messages: Message[], options: GenerateOptions): Promise<string> {
    const client = new GoogleGenAI({
      apiKey: this.config.gemini.apiKey,
      ...(this.config.gemini.baseUrl
        ? { httpOptions: { baseUrl: this.config.gemini.baseUrl } }
        : {}),
    });

    // Extract system messages for systemInstruction
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    if (nonSystemMessages.length === 0) {
      throw new Error('No user message provided to Gemini provider');
    }
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    const historyMessages = nonSystemMessages.slice(0, -1);

    const chat = client.chats.create({
      model: options.model,
      config: {
        ...(systemMessages.length > 0
          ? { systemInstruction: systemMessages.map(m => m.content).join('\n') }
          : {}),
        temperature: options.temperature,
        ...(options.thinking
          ? { thinkingConfig: { thinkingBudget: THINKING_BUDGET[options.thinkingLevel as ThinkingLevel] } }
          : {}),
      },
      history: historyMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
    });

    // Send the last message
    const response = await chat.sendMessage({ message: lastMessage.content });
    let content = response.text ?? '';
    content = content.replace(/<think[^>]*>([\s\S]*?)<\/think[^>]*>/gi, '').trim();
    return content;
  }
}
