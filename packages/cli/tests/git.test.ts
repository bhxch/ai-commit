import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGitMethods } = vi.hoisted(() => ({
  mockGitMethods: {
    diff: vi.fn(),
    add: vi.fn(),
    commit: vi.fn(),
    raw: vi.fn(),
  },
}));

// Mock simple-git to return a shared mock object
vi.mock('simple-git', () => ({
  default: () => mockGitMethods,
}));

import { getStagedDiff, stageAllChanges, gitCommit, truncateDiff } from '../src/git.js';

describe('getStagedDiff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns staged diff content', async () => {
    mockGitMethods.diff = vi.fn().mockResolvedValue('diff --git a/file.txt b/file.txt\n+new line');
    const result = await getStagedDiff();
    expect(result).toBe('diff --git a/file.txt b/file.txt\n+new line');
  });

  it('throws on git error', async () => {
    mockGitMethods.diff = vi.fn().mockRejectedValue(new Error('not a git repo'));
    await expect(getStagedDiff()).rejects.toThrow('not a git repo');
  });
});

describe('stageAllChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls git add with correct args', async () => {
    mockGitMethods.add = vi.fn().mockResolvedValue(undefined);
    await stageAllChanges();
    expect(mockGitMethods.add).toHaveBeenCalledWith(['-A']);
  });
});

describe('gitCommit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls git commit with the message', async () => {
    mockGitMethods.commit = vi.fn().mockResolvedValue(undefined);
    await gitCommit('feat: test commit');
    expect(mockGitMethods.commit).toHaveBeenCalledWith('feat: test commit');
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
