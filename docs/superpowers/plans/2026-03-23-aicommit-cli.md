# @bhxch/aicommit CLI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone CLI tool (`npx @bhxch/aicommit`) that uses AI to generate Conventional Commits from Git staged changes.

**Architecture:** Independent TypeScript CLI project at `packages/cli/`. Three AI providers (OpenAI-compatible, Gemini, Anthropic) behind a unified interface. Config via CLI args > env vars > config files. Interactive confirmation with accept/edit/regenerate flow.

**Tech Stack:** TypeScript, commander, @inquirer/prompts, simple-git, openai, @google/generative-ai, @anthropic-ai/sdk, tsup, tsx, vitest

**Spec:** `docs/superpowers/specs/2026-03-23-aicommit-cli-design.md`

---

## File Structure

```
packages/cli/
├── src/
│   ├── index.ts              # CLI entry point (bin)
│   ├── cli.ts                # Main orchestration flow
│   ├── git.ts                # Git operations (diff, add, commit)
│   ├── config.ts             # Config loading & merging (4-layer priority)
│   ├── prompts.ts            # Prompt templates (with/without gitmoji)
│   ├── providers/
│   │   ├── index.ts          # AIProvider interface + factory + error handling
│   │   ├── openai.ts         # OpenAI-compatible provider
│   │   ├── gemini.ts         # Gemini provider
│   │   └── anthropic.ts      # Anthropic provider
│   └── types.ts              # All type definitions
├── tests/
│   ├── config.test.ts        # Config loading & env var tests
│   ├── prompts.test.ts       # Prompt template tests
│   ├── providers.test.ts     # Provider factory & error handling tests
│   └── git.test.ts           # Git operations tests
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/tsup.config.ts`
- Create: `packages/cli/vitest.config.ts`
- Create: `packages/cli/.gitignore`
- Create: `packages/cli/src/types.ts`

- [x] **Step 1: Create `packages/cli/package.json`**

```json
{
  "name": "@bhxch/aicommit",
  "version": "0.1.0",
  "description": "AI-powered conventional commit message generator for the terminal",
  "type": "module",
  "bin": {
    "aicommit": "./dist/index.js"
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "build": "tsup",
    "dev": "tsx src/index.ts",
    "test": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "@inquirer/prompts": "^5.0.0",
    "simple-git": "^3.27.0",
    "openai": "^4.14.2",
    "@google/generative-ai": "^0.21.0",
    "@anthropic-ai/sdk": "^0.30.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "vitest": "^2.0.0",
    "@types/node": "^20.0.0"
  }
}
```

- [x] **Step 2: Create `packages/cli/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [x] **Step 3: Create `packages/cli/tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  dts: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});
```

- [x] **Step 4: Create `packages/cli/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
  },
});
```

- [x] **Step 5: Create `packages/cli/.gitignore`**

```
node_modules/
dist/
*.tsbuildinfo
```

- [x] **Step 6: Create `packages/cli/src/types.ts`**

```typescript
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
```

- [x] **Step 7: Create minimal `packages/cli/src/index.ts` (entry placeholder)**

```typescript
#!/usr/bin/env node
console.log('aicommit');
```

- [x] **Step 8: Install dependencies and verify build**

Run: `cd packages/cli && npm install && npm run build`
Expected: Build succeeds, `dist/index.js` exists

- [x] **Step 9: Commit**

```bash
git add packages/cli/
git commit -m "chore(cli): scaffold project structure with package.json, tsconfig, tsup, vitest"
```

---

### Task 2: Config Module

**Files:**
- Create: `packages/cli/src/config.ts`
- Create: `packages/cli/tests/config.test.ts`

Reference: Spec sections "配置管理", "环境变量", "Fallback Warning 控制"
Reference: `ai-commit-ext/src/config.ts` for config pattern

- [x] **Step 1: Write tests for config loading**

Create `packages/cli/tests/config.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../src/config.js';
import type { ResolvedConfig } from '../src/types.js';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(process.cwd(), '.temp/test-config');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

function writeConfigFile(path: string, content: object) {
  writeFileSync(path, JSON.stringify(content, null, 2));
}

describe('loadConfig', () => {
  it('returns defaults when no config sources exist', async () => {
    const config = await loadConfig({ provider: undefined });
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o');
    expect(config.temperature).toBe(0.7);
    expect(config.language).toBe('English');
    expect(config.prefix).toBe('');
    expect(config.gitmoji).toBe(true);
    expect(config.dryRun).toBe(false);
    expect(config.yes).toBe(false);
    expect(config.all).toBe(false);
  });

  it('CLI args override everything', async () => {
    const config = await loadConfig({ provider: 'gemini' });
    expect(config.provider).toBe('gemini');
  });

  it('reads project-level config file', async () => {
    const rcPath = join(TEST_DIR, '.aicommitrc.json');
    writeConfigFile(rcPath, { provider: 'anthropic', language: 'Simplified Chinese' });
    const config = await loadConfig({}, TEST_DIR);
    expect(config.provider).toBe('anthropic');
    expect(config.language).toBe('Simplified Chinese');
  });

  it('reads env vars with AICOMMIT_ prefix', async () => {
    process.env.AICOMMIT_PROVIDER = 'gemini';
    process.env.AICOMMIT_LANGUAGE = 'Japanese';
    try {
      const config = await loadConfig({});
      expect(config.provider).toBe('gemini');
      expect(config.language).toBe('Japanese');
    } finally {
      delete process.env.AICOMMIT_PROVIDER;
      delete process.env.AICOMMIT_LANGUAGE;
    }
  });

  it('falls back to unprefixed env vars with warning', async () => {
    delete process.env.AICOMMIT_OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-fallback';
    try {
      const warnings: string[] = [];
      const config = await loadConfig({}, undefined, (w) => warnings.push(w));
      expect(config.openai.apiKey).toBe('sk-fallback');
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('OPENAI_API_KEY');
    } finally {
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('AICOMMIT_ prefix takes precedence over unprefixed fallback', async () => {
    process.env.AICOMMIT_OPENAI_API_KEY = 'sk-primary';
    process.env.OPENAI_API_KEY = 'sk-fallback';
    try {
      const warnings: string[] = [];
      const config = await loadConfig({}, undefined, (w) => warnings.push(w));
      expect(config.openai.apiKey).toBe('sk-primary');
      expect(warnings.length).toBe(0);
    } finally {
      delete process.env.AICOMMIT_OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
    }
  });

  it('suppresses fallback warnings when configured', async () => {
    delete process.env.AICOMMIT_OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'sk-fallback';
    process.env.AICOMMIT_SUPPRESS_FALLBACK_WARNING = 'true';
    try {
      const warnings: string[] = [];
      const config = await loadConfig({}, undefined, (w) => warnings.push(w));
      expect(config.openai.apiKey).toBe('sk-fallback');
      expect(warnings.length).toBe(0);
    } finally {
      delete process.env.OPENAI_API_KEY;
      delete process.env.AICOMMIT_SUPPRESS_FALLBACK_WARNING;
    }
  });

  it('CLI args override env vars override config file override defaults', async () => {
    const rcPath = join(TEST_DIR, '.aicommitrc.json');
    writeConfigFile(rcPath, { provider: 'gemini', temperature: 0.5 });
    process.env.AICOMMIT_PROVIDER = 'anthropic';
    try {
      const config = await loadConfig({ temperature: 1.0 }, TEST_DIR);
      // CLI arg wins for temperature
      expect(config.temperature).toBe(1.0);
      // Env var wins for provider (CLI didn't specify)
      expect(config.provider).toBe('anthropic');
    } finally {
      delete process.env.AICOMMIT_PROVIDER;
    }
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && npx vitest run tests/config.test.ts`
Expected: FAIL — `../src/config.js` not found

- [x] **Step 3: Implement `packages/cli/src/config.ts`**

```typescript
import { readFileSync, existsSync } from 'fs';
import { join, homedir } from 'path';
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
  // (read early so fallback warnings below can reference it)
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
```

- [x] **Step 4: Run tests**

Run: `cd packages/cli && npx vitest run tests/config.test.ts`
Expected: All tests PASS

- [x] **Step 5: Commit**

```bash
git add packages/cli/src/config.ts packages/cli/tests/config.test.ts
git commit -m "feat(cli): add config module with 4-layer priority loading and env var fallback warnings"
```

---

### Task 3: Prompt Templates

**Files:**
- Create: `packages/cli/src/prompts.ts`
- Create: `packages/cli/tests/prompts.test.ts`

Reference: `ai-commit-ext/src/prompts.ts`, `ai-commit-ext/prompt/with_gitmoji.md`, `ai-commit-ext/prompt/without_gitmoji.md`

- [x] **Step 1: Write tests for prompt generation**

Create `packages/cli/tests/prompts.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildMessages, buildMessagesWithFile } from '../src/prompts.js';

describe('buildSystemPrompt', () => {
  it('generates prompt with gitmoji by default', () => {
    const prompt = buildSystemPrompt('English', true);
    expect(prompt).toContain('<emoji>');
    expect(prompt).toContain('✨');
    expect(prompt).toContain('🐛');
    expect(prompt).toContain('English');
  });

  it('generates prompt without gitmoji', () => {
    const prompt = buildSystemPrompt('English', false);
    expect(prompt).not.toContain('<emoji>');
    expect(prompt).not.toContain('✨');
    expect(prompt).toContain('English');
  });

  it('injects language into all language placeholders', () => {
    const prompt = buildSystemPrompt('Simplified Chinese', true);
    expect(prompt).toContain('Simplified Chinese');
  });

  it('contains all 11 conventional commit types', () => {
    const prompt = buildSystemPrompt('English', true);
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'i18n'];
    for (const type of types) {
      expect(prompt).toContain(type);
    }
  });
});

describe('buildMessages', () => {
  it('returns system + diff messages', () => {
    const messages = buildMessages('English', true, 'some diff content');
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toBe('some diff content');
  });

  it('includes additional context before diff when provided', () => {
    const messages = buildMessages('English', true, 'diff', 'extra context');
    expect(messages).toHaveLength(3);
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('extra context');
    expect(messages[2].content).toBe('diff');
  });
});

describe('buildMessagesWithFile', () => {
  it('reads custom prompt file and uses it as system message', () => {
    const { resolve } = await import('path');
    const promptPath = resolve(process.cwd(), 'ai-commit-ext/prompt/without_gitmoji.md');
    const messages = buildMessagesWithFile(promptPath, 'English', 'diff content');
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).not.toContain('<emoji>');
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && npx vitest run tests/prompts.test.ts`
Expected: FAIL

- [x] **Step 3: Implement `packages/cli/src/prompts.ts`**

Port the prompt template from `ai-commit-ext/src/prompts.ts` `INIT_MAIN_PROMPT` function. Provide two variants: one with gitmoji (emoji prefix in format), one without. The template should contain:
- Role definition
- Output format (single/multiple type changes)
- Type reference table (11 types with optional emojis)
- Writing rules (subject line, body)
- Critical requirements
- Language injection via template literal
- Example input/output

Also implement `buildMessagesWithFile()` that reads a custom `.md` file and uses it as the system prompt.

- [x] **Step 4: Run tests**

Run: `cd packages/cli && npx vitest run tests/prompts.test.ts`
Expected: All tests PASS

- [x] **Step 5: Commit**

```bash
git add packages/cli/src/prompts.ts packages/cli/tests/prompts.test.ts
git commit -m "feat(cli): add prompt templates with gitmoji toggle and custom prompt file support"
```

---

### Task 4: AI Providers

**Files:**
- Create: `packages/cli/src/providers/index.ts`
- Create: `packages/cli/src/providers/openai.ts`
- Create: `packages/cli/src/providers/gemini.ts`
- Create: `packages/cli/src/providers/anthropic.ts`
- Create: `packages/cli/tests/providers.test.ts`

Reference: `ai-commit-ext/src/openai-utils.ts`, `ai-commit-ext/src/gemini-utils.ts`
Reference: Spec section "AI Provider 架构"

- [x] **Step 1: Write tests for provider factory and error handling**

Create `packages/cli/tests/providers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createProvider, formatApiError } from '../src/providers/index.js';

describe('createProvider', () => {
  it('creates OpenAI provider with required config', () => {
    const provider = createProvider({
      provider: 'openai',
      openai: { apiKey: 'sk-test', baseUrl: '', apiVersion: '' },
      gemini: { apiKey: '', baseUrl: '' },
      anthropic: { apiKey: '', baseUrl: '' },
    });
    expect(provider).toBeDefined();
    expect(provider.constructor.name).toContain('OpenAI');
  });

  it('creates Gemini provider with required config', () => {
    const provider = createProvider({
      provider: 'gemini',
      openai: { apiKey: '', baseUrl: '', apiVersion: '' },
      gemini: { apiKey: 'test-key', baseUrl: '' },
      anthropic: { apiKey: '', baseUrl: '' },
    });
    expect(provider).toBeDefined();
  });

  it('creates Anthropic provider with required config', () => {
    const provider = createProvider({
      provider: 'anthropic',
      openai: { apiKey: '', baseUrl: '', apiVersion: '' },
      gemini: { apiKey: '', baseUrl: '' },
      anthropic: { apiKey: 'sk-ant-test', baseUrl: '' },
    });
    expect(provider).toBeDefined();
  });

  it('throws when OpenAI API key is missing', () => {
    expect(() =>
      createProvider({
        provider: 'openai',
        openai: { apiKey: '', baseUrl: '', apiVersion: '' },
        gemini: { apiKey: '', baseUrl: '' },
        anthropic: { apiKey: '', baseUrl: '' },
      }),
    ).toThrow('OpenAI API key');
  });

  it('throws when Gemini API key is missing', () => {
    expect(() =>
      createProvider({
        provider: 'gemini',
        openai: { apiKey: '', baseUrl: '', apiVersion: '' },
        gemini: { apiKey: '', baseUrl: '' },
        anthropic: { apiKey: '', baseUrl: '' },
      }),
    ).toThrow('Gemini API key');
  });

  it('throws when Anthropic API key is missing', () => {
    expect(() =>
      createProvider({
        provider: 'anthropic',
        openai: { apiKey: '', baseUrl: '', apiVersion: '' },
        gemini: { apiKey: '', baseUrl: '' },
        anthropic: { apiKey: '', baseUrl: '' },
      }),
    ).toThrow('Anthropic API key');
  });
});

describe('formatApiError', () => {
  it('handles 401 errors', () => {
    const err = { status: 401, message: 'Unauthorized' } as any;
    expect(formatApiError(err, 'openai')).toContain('认证失败');
  });

  it('handles 429 errors', () => {
    const err = { status: 429, message: 'Rate limit' } as any;
    expect(formatApiError(err, 'openai')).toContain('速率限制');
  });

  it('handles 500 errors', () => {
    const err = { status: 500, message: 'Internal' } as any;
    expect(formatApiError(err, 'openai')).toContain('服务端错误');
  });

  it('handles unknown errors', () => {
    const err = new Error('network timeout');
    expect(formatApiError(err, 'openai')).toContain('network timeout');
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && npx vitest run tests/providers.test.ts`
Expected: FAIL

- [x] **Step 3: Implement `packages/cli/src/providers/openai.ts`**

Create OpenAI-compatible provider using `openai` SDK v4. Support `baseUrl` for Azure/DeepSeek/Ollama. When `apiVersion` is set, add `defaultQuery` and `defaultHeaders` for Azure compatibility. Map `Message[]` to OpenAI `ChatCompletionMessageParam[]`.

Reference: `ai-commit-ext/src/openai-utils.ts` for the Azure config pattern and API call structure.

- [x] **Step 4: Implement `packages/cli/src/providers/gemini.ts`**

Create Gemini provider using `@google/generative-ai`. Support `baseUrl` via `requestOptions`. Map `Message[]` by extracting `content` from each message (Gemini SDK uses `sendMessage` with string array). Apply `temperature` via `generationConfig`.

Reference: `ai-commit-ext/src/gemini-utils.ts` for the chat session pattern.

- [x] **Step 5: Implement `packages/cli/src/providers/anthropic.ts`**

Create Anthropic provider using `@anthropic-ai/sdk`. Support `baseUrl`. Map `Message[]` to Anthropic format (system as separate param, user/assistant messages). Apply `temperature` and `max_tokens`.

- [x] **Step 6: Implement `packages/cli/src/providers/index.ts`**

```typescript
export { OpenAIProvider } from './openai.js';
export { GeminiProvider } from './gemini.js';
export { AnthropicProvider } from './anthropic.js';

export function createProvider(config: { ... }): AIProvider { ... }
export function formatApiError(error: unknown, provider: string): string { ... }
```

Factory validates API key exists for the selected provider, throws descriptive error if missing. `formatApiError` classifies by HTTP status code.

- [x] **Step 7: Run tests**

Run: `cd packages/cli && npx vitest run tests/providers.test.ts`
Expected: All tests PASS

- [x] **Step 8: Commit**

```bash
git add packages/cli/src/providers/
git commit -m "feat(cli): add AI providers (OpenAI, Gemini, Anthropic) with factory and error handling"
```

---

### Task 5: Git Module

**Files:**
- Create: `packages/cli/src/git.ts`
- Create: `packages/cli/tests/git.test.ts`

Reference: `ai-commit-ext/src/git-utils.ts`

- [x] **Step 1: Write tests for git operations**

Create `packages/cli/tests/git.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStagedDiff, stageAllChanges, gitCommit, truncateDiff } from '../src/git.js';

// Mock simple-git
vi.mock('simple-git', () => ({
  default: () => ({
    diff: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    raw: vi.fn(),
  }),
}));

import simpleGit from 'simple-git';

const mockGit = simpleGit as unknown as ReturnType<typeof simpleGit>;

describe('getStagedDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns staged diff content', async () => {
    mockGit.diff = vi.fn().mockResolvedValue('diff --git a/file.txt b/file.txt\n+new line');
    const result = await getStagedDiff();
    expect(result).toBe('diff --git a/file.txt b/file.txt\n+new line');
  });

  it('throws on git error', async () => {
    mockGit.diff = vi.fn().mockRejectedValue(new Error('not a git repo'));
    await expect(getStagedDiff()).rejects.toThrow('not a git repo');
  });
});

describe('stageAllChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls git add with correct args', async () => {
    mockGit.add = vi.fn().mockResolvedValue(undefined);
    await stageAllChanges();
    expect(mockGit.add).toHaveBeenCalledWith(['-A']);
  });
});

describe('gitCommit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls git commit with the message', async () => {
    mockGit.commit = vi.fn().mockResolvedValue(undefined);
    await gitCommit('feat: test commit');
    expect(mockGit.commit).toHaveBeenCalledWith(['-m', 'feat: test commit']);
  });
});

describe('truncateDiff', () => {
  it('does not truncate small diffs', () => {
    const lines = Array(100).fill('line').join('\n');
    const result = truncateDiff(lines, 10000);
    expect(result.diff).toBe(lines);
    expect(result.warning).toBeUndefined();
  });

  it('truncates large diffs and returns warning', () => {
    const lines = Array(10001).fill('line').join('\n');
    const { diff, warning } = truncateDiff(lines, 10000);
    expect(diff.split('\n').length).toBeLessThanOrEqual(10000);
    expect(warning).toBeDefined();
    expect(warning).toContain('large');
  });

  it('returns empty diff unchanged', () => {
    const result = truncateDiff('', 10000);
    expect(result.diff).toBe('');
    expect(result.warning).toBeUndefined();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd packages/cli && npx vitest run tests/git.test.ts`
Expected: FAIL

- [x] **Step 3: Implement `packages/cli/src/git.ts`**

Implement using `simple-git`:
- `getStagedDiff()`: execute `git diff --staged`, return diff string
- `stageAllChanges()`: execute `git add -A`
- `gitCommit(message: string)`: execute `git commit -m <message>`
- `truncateDiff(diff, maxLines)`: count lines, if over threshold slice and return warning string

Reference: `ai-commit-ext/src/git-utils.ts` for the `simpleGit` pattern.

- [x] **Step 4: Run tests**

Run: `cd packages/cli && npx vitest run tests/git.test.ts`
Expected: All tests PASS

- [x] **Step 5: Commit**

```bash
git add packages/cli/src/git.ts packages/cli/tests/git.test.ts
git commit -m "feat(cli): add git operations module with diff truncation"
```

---

### Task 6: Main CLI Flow

**Files:**
- Create: `packages/cli/src/cli.ts`
- Modify: `packages/cli/src/index.ts` (replace placeholder)

Reference: Spec section "主流程"

- [x] **Step 1: Implement `packages/cli/src/cli.ts`**

Main orchestration function `run(cliOpts)`:

1. Load config via `loadConfig(cliOpts)`
2. Validate `--all` and `--staged-only` mutual exclusion → print `Error: --all and --staged-only are mutually exclusive` to stderr, exit code 1
3. Create provider via `createProvider(config)`
4. Get staged diff:
   - `--all` → `stageAllChanges()` then `getStagedDiff()`
   - `--staged-only` → `getStagedDiff()`, empty → print `Error: No staged changes found (staged-only mode)` to stderr, exit code 1
   - Default → `getStagedDiff()`, empty → ask user (unless `--yes`, then print `Error: No staged changes found. Use --all to stage all changes.` to stderr, exit code 1)
5. Truncate diff if too large, print warning
6. Build messages via `buildMessages()` or `buildMessagesWithFile()`
7. Call `provider.generate(messages, { model, temperature })`
8. Apply `--prefix` to front of message
9. If `--dry-run` → print message and exit
10. If `--yes` → `gitCommit(message)`, print success, exit
11. Interactive loop using `@inquirer/prompts`:
    - Display generated message
    - Options: Accept, Edit, Regenerate, Abort
    - Accept → `gitCommit(message)`
    - Edit → write to temp file, open `$EDITOR`, read back, then `gitCommit`
    - Regenerate → go back to step 7
    - Abort → exit

Error handling: wrap in try/catch, print `formatApiError()` to stderr, exit code 1.

- [x] **Step 2: Implement `packages/cli/src/index.ts`**

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { run } from './cli.js';

const program = new Command();

program
  .name('aicommit')
  .description('AI-powered conventional commit message generator')
  .version('0.1.0')
  .option('-y, --yes', 'skip confirmation, commit directly')
  .option('--prefix <text>', 'prepend text to commit message')
  .option('-a, --all', 'stage all changes before committing')
  .option('--staged-only', 'only commit staged changes, error if none staged')
  .option('-c, --context <text>', 'additional context for the commit')
  .option('-p, --prompt <file>', 'custom prompt file path')
  .option('--no-gitmoji', 'disable gitmoji in commit message')
  .option('-l, --lang <language>', 'commit message language', 'English')
  .option('--provider <provider>', 'AI provider (openai/gemini/anthropic)')
  .option('--model <model>', 'AI model name')
  .option('--temperature <number>', 'temperature (0-2)', parseFloat)
  .option('--dry-run', 'generate message without committing')
  .action(async (opts) => {
    try {
      await run(opts);
    } catch (error) {
      process.stderr.write(`${error}\n`);
      process.exit(1);
    }
  });

program.parse();
```

- [x] **Step 3: Build and verify**

Run: `cd packages/cli && npm run build`
Expected: Build succeeds

- [x] **Step 4: Test `--help`**

Run: `cd packages/cli && node dist/index.js --help`
Expected: Shows help text with all options

- [x] **Step 5: Test `--dry-run` in a real git repo** (requires manual API key)

Create a test repo with staged changes, set API key, run:
```bash
cd /tmp/test-repo
git init && echo "test" > file.txt && git add .
AICOMMIT_OPENAI_API_KEY=sk-xxx node /path/to/packages/cli/dist/index.js --dry-run
```
Expected: Attempts to call API (will fail without valid key, but flow is correct)

- [x] **Step 6: Commit**

```bash
git add packages/cli/src/cli.ts packages/cli/src/index.ts
git commit -m "feat(cli): add main CLI flow with commander, interactive prompts, and full workflow"
```

---

### Task 7: Integration Testing & Polish

**Files:**
- Modify: `packages/cli/package.json` (if needed)

- [x] **Step 1: Run all tests**

Run: `cd packages/cli && npx vitest run`
Expected: All tests PASS

- [x] **Step 2: Test `--all` and `--staged-only` mutual exclusion**

Run: `cd packages/cli && node dist/index.js --all --staged-only`
Expected: Error message about mutual exclusion

- [x] **Step 3: Test no staged changes default behavior** (requires manual API key)

Run in a clean git repo with no changes:
```bash
cd packages/cli && node dist/index.js
```
Expected: Message about no staged changes, prompt to add all

- [x] **Step 4: Test `--prefix` formatting** (requires manual API key)

Run with a valid API key and staged changes:
```bash
node dist/index.js --dry-run --prefix "PROJ-123"
```
Expected: Output starts with `PROJ-123 ` followed by commit message

- [x] **Step 5: Test fallback warning**

Run without `AICOMMIT_` prefix, only `OPENAI_API_KEY`:
```bash
OPENAI_API_KEY=sk-test node dist/index.js --dry-run
```
Expected: Warning about deprecated env var

- [x] **Step 6: Test warning suppression**

Run with `AICOMMIT_SUPPRESS_FALLBACK_WARNING=true`:
```bash
AICOMMIT_SUPPRESS_FALLBACK_WARNING=true OPENAI_API_KEY=sk-test node dist/index.js --dry-run
```
Expected: No warning output

- [x] **Step 7: Final commit** (fixes committed individually)

```bash
git add -A
git commit -m "chore(cli): integration testing and final polish"
```

---

## Verification Checklist

1. `cd packages/cli && npm install && npm run build` — build succeeds
2. `npx vitest run` — all tests pass
3. `node dist/index.js --help` — help shows all options
4. Manual test with real API key + staged changes + `--dry-run`
5. Manual test of interactive flow (accept/edit/regenerate/abort)
6. Manual test of `--prefix`, `--no-gitmoji`, `--all`, `--staged-only`
7. Manual test of all 3 providers (openai, gemini, anthropic)
8. Fallback warning prints and can be suppressed
