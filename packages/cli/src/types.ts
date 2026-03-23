export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  model: string;
  temperature: number;
}

export interface AIProvider {
  generate(messages: Message[], options: GenerateOptions): Promise<string>;
}

export interface ResolvedConfig {
  provider: 'openai' | 'gemini' | 'anthropic';
  model: string;
  temperature: number;
  language: string;
  prefix: string;
  promptFile: string | undefined;
  stagedOnly: boolean;
  gitmoji: boolean;
  dryRun: boolean;
  yes: boolean;
  all: boolean;
  context: string | undefined;
  openai: {
    apiKey: string;
    baseUrl: string;
    apiVersion: string;
  };
  gemini: {
    apiKey: string;
    baseUrl: string;
  };
  anthropic: {
    apiKey: string;
    baseUrl: string;
  };
}

export interface CLIOpts {
  provider?: string;
  model?: string;
  temperature?: number;
  language?: string;
  prefix?: string;
  context?: string;
  promptFile?: string;
  gitmoji?: boolean;
  stagedOnly?: boolean;
  all?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

export interface RawConfigFile {
  provider?: string;
  model?: string;
  temperature?: number;
  language?: string;
  prefix?: string;
  promptFile?: string;
  stagedOnly?: boolean;
  gitmoji?: boolean;
  suppressFallbackWarning?: boolean;
  openai?: {
    apiKey?: string;
    baseUrl?: string;
    apiVersion?: string;
  };
  gemini?: {
    apiKey?: string;
    baseUrl?: string;
  };
  anthropic?: {
    apiKey?: string;
    baseUrl?: string;
  };
}
