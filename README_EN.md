# aicommit

AI-powered conventional commit message generator for the terminal.

Uses OpenAI, Gemini, or Anthropic to analyze your staged git diff and generate well-formatted [Conventional Commits](https://www.conventionalcommits.org/) messages.

**[中文](README.md)**

## Features

- Three AI providers: OpenAI (incl. Azure/DeepSeek), Gemini, Anthropic
- Conventional Commits format out of the box
- Gitmoji support (optional)
- Multi-language commit messages
- Interactive workflow: accept, edit, regenerate, or abort
- 4-layer configuration: CLI args > env vars > project config > global config
- Custom prompt file support
- Dry-run mode
- Zero config defaults — just set an API key and go

## Quick Start

```bash
# Run instantly without installing
npx @bhxch/aicommit
```

Requirements: Node.js >= 18, a git repository with staged changes, and an API key.

## Installation

```bash
# Use directly with npx
npx @bhxch/aicommit

# Or install globally
npm install -g @bhxch/aicommit
aicommit
```

## Usage

### Basic

```bash
# Stage your changes first
git add .

# Generate and interactively confirm
aicommit
```

The tool reads your staged diff, sends it to an AI model, and presents the generated commit message. You can then:

- **Accept** — commit as-is
- **Edit** — open in `$EDITOR` to modify
- **Regenerate** — generate a new message
- **Abort** — cancel without committing

### CLI Options

| Option | Description |
|--------|-------------|
| `-y, --yes` | Skip confirmation, commit directly |
| `-a, --all` | Stage all changes (`git add -A`) before generating |
| `--staged-only` | Only use staged changes; error if nothing staged |
| `--dry-run` | Generate message without committing |
| `-c, --context <text>` | Provide extra context for the AI |
| `-p, --prompt <file>` | Use a custom prompt file |
| `--prefix <text>` | Prepend text to the commit message |
| `--no-gitmoji` | Disable gitmoji emoji prefixes |
| `-l, --lang <language>` | Commit message language (default: `English`) |
| `--provider <provider>` | AI provider: `openai`, `gemini`, `anthropic` |
| `--model <model>` | Model name (e.g. `gpt-4o`, `gemini-2.0-flash`) |
| `--temperature <number>` | Sampling temperature, 0–2 (default: `0.7`) |

### Examples

```bash
# Auto-commit with no prompts
aicommit -y

# Preview the message without committing
aicommit --dry-run

# Stage everything and commit
aicommit -a -y

# Use Anthropic with a specific model
aicommit --provider anthropic --model claude-sonnet-4-20250514

# Generate a Chinese commit message
aicommit -l "简体中文"

# Add context about what you changed
aicommit -c "Refactored the auth module to use JWT"

# Prepend a ticket number
aicommit --prefix "PROJ-123"
```

## Configuration

Configuration is resolved in priority order (highest wins):

1. **CLI arguments**
2. **Environment variables** (`AICOMMIT_*` prefix)
3. **Project config** (`.aicommitrc.json` in git root)
4. **Global config** (`~/.aicommitrc.json`)
5. **Defaults**

### Config File

Create `.aicommitrc.json` in your project root or home directory:

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "temperature": 0.7,
  "language": "English",
  "gitmoji": true,
  "prefix": "",
  "promptFile": "",
  "openai": {
    "apiKey": "sk-xxx",
    "baseUrl": "https://api.openai.com/v1",
    "apiVersion": ""
  },
  "gemini": {
    "apiKey": "xxx",
    "baseUrl": ""
  },
  "anthropic": {
    "apiKey": "sk-ant-xxx",
    "baseUrl": ""
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AICOMMIT_OPENAI_API_KEY` | OpenAI API key |
| `AICOMMIT_OPENAI_BASE_URL` | OpenAI base URL (for Azure/DeepSeek) |
| `AICOMMIT_AZURE_API_VERSION` | Azure OpenAI API version |
| `AICOMMIT_GEMINI_API_KEY` | Gemini API key |
| `AICOMMIT_GEMINI_BASE_URL` | Gemini base URL |
| `AICOMMIT_ANTHROPIC_API_KEY` | Anthropic API key |
| `AICOMMIT_ANTHROPIC_BASE_URL` | Anthropic base URL |
| `AICOMMIT_PROVIDER` | Default provider |
| `AICOMMIT_MODEL` | Default model |
| `AICOMMIT_LANGUAGE` | Default language |
| `AICOMMIT_TEMPERATURE` | Default temperature |
| `AICOMMIT_PREFIX` | Default prefix |
| `AICOMMIT_PROMPT_FILE` | Custom prompt file path |
| `AICOMMIT_GITMOJI` | Enable gitmoji (`true`/`false`) |
| `AICOMMIT_STAGED_ONLY` | Only use staged changes (`true`/`false`) |

> **Note:** The tool also reads standard env vars like `OPENAI_API_KEY`, `GEMINI_API_KEY`, and `ANTHROPIC_API_KEY` as fallbacks (with a warning). Prefer the `AICOMMIT_*` prefixed versions.

### Custom Prompts

Use `-p` to supply your own system prompt file:

```bash
aicommit -p ./my-prompt.md
```

The file content replaces the built-in prompt template entirely.

## Provider Setup

### OpenAI

```bash
export AICOMMIT_OPENAI_API_KEY="sk-xxx"
aicommit --provider openai --model gpt-4o
```

For Azure OpenAI or DeepSeek, set `baseUrl` and optionally `apiVersion`:

```bash
export AICOMMIT_OPENAI_BASE_URL="https://your-resource.openai.azure.com/"
export AICOMMIT_AZURE_API_VERSION="2024-02-15-preview"
```

### Gemini

```bash
export AICOMMIT_GEMINI_API_KEY="xxx"
aicommit --provider gemini --model gemini-2.0-flash
```

### Anthropic

```bash
export AICOMMIT_ANTHROPIC_API_KEY="sk-ant-xxx"
aicommit --provider anthropic --model claude-sonnet-4-20250514
```

## Development

```bash
cd packages/cli
npm install
npm run build    # Build with tsup
npm run dev      # Run with tsx (development)
npm test         # Run tests with vitest
npm run lint     # Type-check
```

## Acknowledgements

This CLI tool is derived from [ai-commit-ext](./ai-commit-ext) (the AI Commit VSCode extension), extracting its core AI commit generation capability into a standalone command-line tool.

## License

MIT
