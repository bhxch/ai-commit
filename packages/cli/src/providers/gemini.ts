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

    // Extract system messages for systemInstruction
    const systemMessages = messages.filter(m => m.role === 'system');
    const nonSystemMessages = messages.filter(m => m.role !== 'system');

    if (systemMessages.length > 0) {
      modelOpts.systemInstruction = systemMessages.map(m => m.content).join('\n');
    }

    if (this.config.gemini.baseUrl) {
      modelOpts.baseUrl = this.config.gemini.baseUrl;
    }
    const model = genAI.getGenerativeModel(modelOpts);

    // Build history from non-system messages, excluding the last user message
    const history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    const historyMessages = nonSystemMessages.slice(0, -1);

    for (const msg of historyMessages) {
      history.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const chat = model.startChat({
      history,
      generationConfig: { temperature: options.temperature },
    });

    // Send the last message
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  }
}
