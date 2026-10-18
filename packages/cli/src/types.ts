export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ThinkingLevel = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/**
 * How the thinking level reaches Anthropic: `budget` maps it to explicit
 * `thinking.budget_tokens` (works on every extended-thinking model), `effort`
 * passes it through natively as `output_config.effort` (Opus 4.6+ only).
 * Gemini and OpenAI ignore this setting.
 */
export type ThinkingMode = 'budget' | 'effort';

export interface GenerateOptions {
  model: string;
  temperature: number;
  thinking: boolean;
  thinkingLevel: ThinkingLevel;
  thinkingMode: ThinkingMode;
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
  thinkingMode: ThinkingMode;
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
  thinkingMode?: string;
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
  thinkingMode?: string;
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
