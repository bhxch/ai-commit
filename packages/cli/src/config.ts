import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ResolvedConfig, RawConfigFile } from './types.js';

const ENV_VAR_MAP: Record<string, { primary: string; fallback?: string; path: string[] }> = {
  provider: { primary: 'AICOMMIT_PROVIDER', path: ['provider'] },
  model: { primary: 'AICOMMIT_MODEL', path: ['model'] },
  temperature: { primary: 'AICOMMIT_TEMPERATURE', path: ['temperature'] },
  language: { primary: 'AICOMMIT_LANGUAGE', path: ['language'] },
  prefix: { primary: 'AICOMMIT_PREFIX', path: ['prefix'] },
  promptFile: { primary: 'AICOMMIT_PROMPT_FILE', path: ['promptFile'] },
  stagedOnly: { primary: 'AICOMMIT_STAGED_ONLY', path: ['stagedOnly'] },
  gitmoji: { primary: 'AICOMMIT_GITMOJI', path: ['gitmoji'] },
  suppressFallbackWarning: { primary: 'AICOMMIT_SUPPRESS_FALLBACK_WARNING', path: ['suppressFallbackWarning'] },
  openai_apiKey: { primary: 'AICOMMIT_OPENAI_API_KEY', fallback: 'OPENAI_API_KEY', path: ['openai', 'apiKey'] },
  openai_baseUrl: { primary: 'AICOMMIT_OPENAI_BASE_URL', fallback: 'OPENAI_BASE_URL', path: ['openai', 'baseUrl'] },
  openai_apiVersion: { primary: 'AICOMMIT_AZURE_API_VERSION', fallback: 'AZURE_API_VERSION', path: ['openai', 'apiVersion'] },
  gemini_apiKey: { primary: 'AICOMMIT_GEMINI_API_KEY', fallback: 'GEMINI_API_KEY', path: ['gemini', 'apiKey'] },
  gemini_baseUrl: { primary: 'AICOMMIT_GEMINI_BASE_URL', fallback: 'GEMINI_BASE_URL', path: ['gemini', 'baseUrl'] },
  anthropic_apiKey: { primary: 'AICOMMIT_ANTHROPIC_API_KEY', fallback: 'ANTHROPIC_API_KEY', path: ['anthropic', 'apiKey'] },
  anthropic_baseUrl: { primary: 'AICOMMIT_ANTHROPIC_BASE_URL', fallback: 'ANTHROPIC_BASE_URL', path: ['anthropic', 'baseUrl'] },
};

const DEFAULTS: ResolvedConfig = {
  provider: 'openai',
  model: 'gpt-4o',
  temperature: 0.7,
  language: 'English',
  prefix: '',
  promptFile: undefined,
  stagedOnly: false,
  gitmoji: true,
  dryRun: false,
  yes: false,
  all: false,
  context: undefined,
  openai: { apiKey: '', baseUrl: '', apiVersion: '' },
  gemini: { apiKey: '', baseUrl: '' },
  anthropic: { apiKey: '', baseUrl: '' },
};

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

function readConfigFile(filePath: string): RawConfigFile {
  if (!existsSync(filePath)) return {};
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as RawConfigFile;
  } catch {
    return {};
  }
}

/** Find git root directory by walking up from cwd */
function findGitRoot(startDir?: string): string | undefined {
  let dir = startDir || process.cwd();
  for (let i = 0; i < 100; i++) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = join(dir, '..');
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

function parseBoolean(val: unknown): boolean | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return val === 'true';
  return undefined;
}

function parseNumber(val: unknown): number | undefined {
  if (val === undefined || val === null) return undefined;
  const n = Number(val);
  return isNaN(n) ? undefined : n;
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

export async function loadConfig(
  cliOpts: CLIOpts,
  projectDir?: string,
  onWarning?: (msg: string) => void,
): Promise<ResolvedConfig> {
  // Layer 1: Defaults
  const result: ResolvedConfig = { ...DEFAULTS, ...DEFAULTS.openai, ...DEFAULTS.gemini, ...DEFAULTS.anthropic };
  // Reset nested objects (spread flattened them)
  result.openai = { ...DEFAULTS.openai };
  result.gemini = { ...DEFAULTS.gemini };
  result.anthropic = { ...DEFAULTS.anthropic };

  // Layer 2: Global config file
  const globalConfig = readConfigFile(join(homedir(), '.aicommitrc.json'));

  // Layer 3: Project config file
  const projectRoot = projectDir || findGitRoot();
  const projectConfig = projectRoot
    ? readConfigFile(join(projectRoot, '.aicommitrc.json'))
    : {};

  // Determine suppressFallbackWarning: env var > project config > global config > default false
  const suppressWarning =
    parseBoolean(process.env.AICOMMIT_SUPPRESS_FALLBACK_WARNING) ??
    parseBoolean(projectConfig.suppressFallbackWarning) ??
    parseBoolean(globalConfig.suppressFallbackWarning) ??
    false;

  // Layer 4: Environment variables (primary + fallback)
  const envValues: Record<string, unknown> = {};
  for (const [, mapping] of Object.entries(ENV_VAR_MAP)) {
    const primaryVal = process.env[mapping.primary];
    if (primaryVal !== undefined) {
      envValues[mapping.path.join('.')] = primaryVal;
    } else if (mapping.fallback) {
      const fallbackVal = process.env[mapping.fallback];
      if (fallbackVal !== undefined) {
        envValues[mapping.path.join('.')] = fallbackVal;
        if (!suppressWarning && onWarning) {
          onWarning(
            `[warning] Using deprecated env var "${mapping.fallback}", please use "${mapping.primary}" instead.`,
          );
        }
      }
    }
  }

  // Merge: project config > global config
  const fileConfig: RawConfigFile = { ...globalConfig, ...projectConfig };

  // Apply file config values
  for (const [, mapping] of Object.entries(ENV_VAR_MAP)) {
    const fileVal = getNestedValue(fileConfig as unknown as Record<string, unknown>, mapping.path);
    if (fileVal !== undefined) {
      const key = mapping.path.join('.');
      if (!envValues[key]) {
        envValues[key] = fileVal;
      }
    }
  }

  // Apply env/file values to result
  const applyValue = (path: string[], value: unknown) => {
    if (path.length === 1) {
      const k = path[0] as keyof ResolvedConfig;
      if (k in result) {
        (result as Record<string, unknown>)[k] = value;
      }
    } else if (path.length === 2) {
      const section = path[0] as 'openai' | 'gemini' | 'anthropic';
      const key = path[1];
      if (section in result && result[section]) {
        (result[section] as Record<string, unknown>)[key] = value;
      }
    }
  };

  for (const [, mapping] of Object.entries(ENV_VAR_MAP)) {
    const key = mapping.path.join('.');
    const val = envValues[key];
    if (val !== undefined) {
      applyValue(mapping.path, val);
    }
  }

  // Layer 5: CLI args (highest priority)
  if (cliOpts.provider) result.provider = cliOpts.provider as ResolvedConfig['provider'];
  if (cliOpts.model) result.model = cliOpts.model;
  if (cliOpts.temperature !== undefined) result.temperature = cliOpts.temperature;
  if (cliOpts.language) result.language = cliOpts.language;
  if (cliOpts.prefix) result.prefix = cliOpts.prefix;
  if (cliOpts.promptFile) result.promptFile = cliOpts.promptFile;
  if (cliOpts.context) result.context = cliOpts.context;
  if (cliOpts.gitmoji !== undefined) result.gitmoji = cliOpts.gitmoji;
  if (cliOpts.stagedOnly !== undefined) result.stagedOnly = cliOpts.stagedOnly;
  if (cliOpts.dryRun !== undefined) result.dryRun = cliOpts.dryRun;
  if (cliOpts.yes !== undefined) result.yes = cliOpts.yes;
  if (cliOpts.all !== undefined) result.all = cliOpts.all;

  // Parse numeric/boolean env values
  result.temperature = parseNumber(result.temperature) ?? DEFAULTS.temperature;
  result.stagedOnly = parseBoolean(result.stagedOnly) ?? DEFAULTS.stagedOnly;
  result.gitmoji = parseBoolean(result.gitmoji) ?? DEFAULTS.gitmoji;
  result.dryRun = parseBoolean(result.dryRun) ?? DEFAULTS.dryRun;
  result.yes = parseBoolean(result.yes) ?? DEFAULTS.yes;
  result.all = parseBoolean(result.all) ?? DEFAULTS.all;

  return result;
}
