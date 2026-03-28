import simpleGit from 'simple-git';

function getGit() {
  return simpleGit();
}

export async function getStagedDiff(): Promise<string> {
  return getGit().diff(['--staged']);
}

export async function stageAllChanges(): Promise<void> {
  await getGit().add(['-A']);
}

export async function gitCommit(message: string): Promise<void> {
  await getGit().commit(message);
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
