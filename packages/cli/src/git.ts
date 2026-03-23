import simpleGit from 'simple-git';

const git = simpleGit();

export async function getStagedDiff(): Promise<string> {
  return git.diff(['--staged']);
}

export async function stageAllChanges(): Promise<void> {
  await git.add(['-A']);
}

export async function gitCommit(message: string): Promise<void> {
  await git.commit(['-m', message]);
}

export function truncateDiff(diff: string, maxLines: number = 10000): { diff: string; warning?: string } {
  const lines = diff.split('\n');
  if (lines.length <= maxLines) {
    return { diff };
  }
  const truncated = lines.slice(0, maxLines).join('\n');
  const warning = `[warning] Diff is too large (${lines.length} lines), truncated to ${maxLines} lines. This may affect generation quality. Consider committing in smaller batches.`;
  return { diff: truncated, warning };
}
