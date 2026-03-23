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
    const { writeFileSync, mkdtempSync, rmSync } = require('fs') as typeof import('fs');
    const { join } = require('path') as typeof import('path');
    const { tmpdir } = require('os') as typeof import('os');
    const tempDir = mkdtempSync(join(tmpdir(), 'aicommit-test-'));
    const promptPath = join(tempDir, 'custom-prompt.md');
    writeFileSync(promptPath, 'You are a helpful assistant. No emojis.');

    try {
      const messages = buildMessagesWithFile(promptPath, 'English', 'diff content');
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('helpful assistant');
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
