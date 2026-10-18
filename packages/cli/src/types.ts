export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ThinkingLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface GenerateOptions {
  model: string;
  temperature: number;
  thinking: boolean;
  thinkingLevel: ThinkingLevel;
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
  thinking: boolean;
  thinkingLevel: ThinkingLevel;
  /** Resolved HTTP(S) proxy URL ('' = none). */
  proxy: string;
  /** When true, ignore proxy settings and connect directly. */
  noProxy: boolean;
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
  thinking?: boolean;
  thinkingLevel?: string;
  /** Proxy URL, or `false` (from `--no-proxy`) to force a direct connection. */
  proxy?: string | false;
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
  thinking?: boolean;
  thinkingLevel?: string;
  suppressFallbackWarning?: boolean;
  /** HTTP(S) proxy URL. */
  proxy?: string;
  /** When true, ignore proxy settings and connect directly. */
  noProxy?: boolean;
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
