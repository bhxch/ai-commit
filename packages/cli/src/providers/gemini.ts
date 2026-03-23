import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, Message, GenerateOptions, ResolvedConfig } from '../types.js';

export class GeminiProvider implements AIProvider {
  private config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
  }

  async generate(messages: Message[], options: GenerateOptions): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.config.gemini.apiKey);
    const modelOpts: any = { model: options.model };
    if (this.config.gemini.baseUrl) {
      modelOpts.baseUrl = this.config.gemini.baseUrl;
    }
    const model = genAI.getGenerativeModel(modelOpts);
    const chat = model.startChat({
      generationConfig: { temperature: options.temperature },
    });
    // Gemini SDK uses sendMessage with string content
    const result = await chat.sendMessage(messages.map(m => m.content).join('\n'));
    return result.response.text();
  }
}
