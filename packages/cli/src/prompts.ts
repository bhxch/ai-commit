import { readFileSync } from 'fs';
import type { Message } from './types.js';

function buildPromptTemplate(language: string, gitmoji: boolean): string {
  const emojiFormat = gitmoji
    ? `<emoji> <type>(<scope>): <subject>`
    : `<type>(<scope>): <subject>`;

  const emojiFormatMulti = gitmoji
    ? `<emoji> <type>(<scope>): <subject>\n  <body of type 1>\n\n<emoji> <type>(<scope>): <subject>\n  <body of type 2>`
    : `<type>(<scope>): <subject>\n  <body of type 1>\n\n<type>(<scope>): <subject>\n  <body of type 2>`;

  const typeTableRows = [
    ['feat', gitmoji ? '✨' : '', 'New feature', 'user, payment'],
    ['fix', gitmoji ? '🐛' : '', 'Bug fix', 'auth, data'],
    ['docs', gitmoji ? '📝' : '', 'Documentation', 'README, API'],
    ['style', gitmoji ? '💄' : '', 'Code style', 'formatting'],
    ['refactor', gitmoji ? '♻️' : '', 'Code refactoring', 'utils, helpers'],
    ['perf', gitmoji ? '⚡️' : '', 'Performance', 'query, cache'],
    ['test', gitmoji ? '✅' : '', 'Testing', 'unit, e2e'],
    ['build', gitmoji ? '📦' : '', 'Build system', 'webpack, npm'],
    ['ci', gitmoji ? '👷' : '', 'CI config', 'Travis, Jenkins'],
    ['chore', gitmoji ? '🔧' : '', 'Other changes', 'scripts, config'],
    ['i18n', gitmoji ? '🌐' : '', 'Internationalization', 'locale, translation'],
  ];

  const headerRow = gitmoji
    ? '| Type     | Emoji | Description          | Example Scopes      |'
    : '| Type     | Description          | Example Scopes      |';

  const separatorRow = gitmoji
    ? '| -------- | ----- | -------------------- | ------------------- |'
    : '| -------- | -------------------- | ------------------- |';

  const tableRows = typeTableRows.map(([type, emoji, desc, scopes]) => {
    if (gitmoji) {
      return `| ${type.padEnd(8)} | ${emoji}    | ${desc.padEnd(20)} | ${scopes.padEnd(19)} |`;
    }
    return `| ${type.padEnd(8)} | ${desc.padEnd(20)} | ${scopes.padEnd(19)} |`;
  }).join('\n');

  return `# Git Commit Message Guide

## Role and Purpose

You will act as a git commit message generator. When receiving a git diff, you will ONLY output the commit message itself, nothing else. No explanations, no questions, no additional comments.

## Output Format

### Single Type Changes

\`\`\`
${emojiFormat}
  <body>
\`\`\`

### Multiple Type Changes

\`\`\`
${emojiFormatMulti}
...
\`\`\`

## Type Reference

${headerRow}
${separatorRow}
${tableRows}

## Writing Rules

### Subject Line

- Scope must be in English
- Imperative mood
- No capitalization
- No period at end
- Max 50 characters
- Must be in ${language}

### Body

- Bullet points with "-"
- Max 72 chars per line
- Explain what and why
- Must be in ${language}
- Use【】for different types

## Critical Requirements

1. Output ONLY the commit message
2. Write ONLY in ${language}
3. NO additional text or explanations
4. NO questions or comments
5. NO formatting instructions or metadata

## Additional Context

If provided, consider any additional context about the changes when generating the commit message. This context will be provided before the diff and should influence the final commit message while maintaining all other formatting rules.

## Examples

INPUT:

diff --git a/src/server.ts b/src/server.ts\n index ad4db42..f3b18a9 100644\n --- a/src/server.ts\n +++ b/src/server.ts\n @@ -10,7 +10,7 @@\n import {\n initWinstonLogger();
\n \n const app = express();
\n -const port = 7799;
\n +const PORT = 7799;
\n \n app.use(express.json());
\n \n @@ -34,6 +34,6 @@\n app.use((\\_, res, next) => {\n // ROUTES\n app.use(PROTECTED_ROUTER_URL, protectedRouter);
\n -app.listen(port, () => {\n - console.log(\x60Server listening on port $\x7Bport\x7D\x60);
\n +app.listen(process.env.PORT || PORT, () => {\n + console.log(\x60Server listening on port $\x7BPORT\x7D\x60);
\n });

OUTPUT:

${gitmoji ? '♻️' : ''} refactor(server): optimize server port configuration

- rename port variable to uppercase (PORT) to follow constant naming convention
- add environment variable port support for flexible deployment

Remember: All output MUST be in ${language} language. You are to act as a pure commit message generator. Your response should contain NOTHING but the commit message itself.`;
}

export function buildSystemPrompt(language: string, gitmoji: boolean): string {
  return buildPromptTemplate(language, gitmoji);
}

export function buildMessages(language: string, gitmoji: boolean, diff: string, context?: string): Message[] {
  const messages: Message[] = [
    { role: 'system', content: buildSystemPrompt(language, gitmoji) },
  ];
  if (context) {
    messages.push({ role: 'user', content: `## Additional Context\n\n${context}` });
  }
  messages.push({ role: 'user', content: diff });
  return messages;
}

export function buildMessagesWithFile(promptFilePath: string, language: string, diff: string, context?: string): Message[] {
  const content = readFileSync(promptFilePath, 'utf-8');
  const messages: Message[] = [
    { role: 'system', content },
  ];
  if (context) {
    messages.push({ role: 'user', content: `## Additional Context\n\n${context}` });
  }
  messages.push({ role: 'user', content: diff });
  return messages;
}
