import { loadConfig } from './config.js';
import type { CLIOpts } from './types.js';
import { createProvider, formatApiError } from './providers/index.js';
import { getStagedDiff, stageAllChanges, gitCommit, truncateDiff } from './git.js';
import { buildMessages, buildMessagesWithFile } from './prompts.js';
import { select, confirm, input } from '@inquirer/prompts';
import { writeFileSync, readFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import os from 'os';

export async function run(opts: CLIOpts & { [key: string]: any }) {
  // 1. Load config
  const config = await loadConfig(opts, undefined, (msg) => process.stderr.write(`${msg}\n`));

  // 2. Validate mutual exclusion: --all and --staged-only
  if (config.all && config.stagedOnly) {
    throw new Error('--all and --staged-only are mutually exclusive');
  }

  // 3. Create provider (validates API key)
  const provider = createProvider(config);

  // 4. Get staged diff
  let diff: string;
  if (config.all) {
    await stageAllChanges();
    diff = await getStagedDiff();
  } else if (config.stagedOnly) {
    diff = await getStagedDiff();
    if (!diff) {
      throw new Error('No staged changes found (staged-only mode)');
    }
  } else {
    diff = await getStagedDiff();
    if (!diff) {
      if (config.yes) {
        throw new Error('No staged changes found. Use --all to stage all changes.');
      }
      const shouldStageAll = await confirm({
        message: 'No staged changes found. Stage all changes?',
        default: false,
      });
      if (shouldStageAll) {
        await stageAllChanges();
        diff = await getStagedDiff();
      } else {
        return;
      }
    }
  }

  if (!diff) {
    return;
  }

  // 5. Truncate diff if too large
  const { diff: truncatedDiff, warning } = truncateDiff(diff);
  if (warning) {
    process.stderr.write(`${warning}\n`);
  }

  // 6. Build messages
  const buildAndGenerate = async (): Promise<string> => {
    let messages;
    if (config.promptFile) {
      messages = buildMessagesWithFile(config.promptFile, config.language, truncatedDiff, config.context);
    } else {
      messages = buildMessages(config.language, config.gitmoji, truncatedDiff, config.context);
    }

    let result: string;
    try {
      result = await provider.generate(messages, {
        model: config.model,
        temperature: config.temperature,
      });
    } catch (err) {
      throw new Error(`API error: ${formatApiError(err, config.provider)}`);
    }

    // Apply prefix
    return config.prefix ? `${config.prefix} ${result}` : result;
  };

  // 7. Generate commit message
  let message = await buildAndGenerate();

  // 8. Dry run
  if (config.dryRun) {
    process.stdout.write(`${message}\n`);
    return;
  }

  // 9. Yes mode - commit directly
  if (config.yes) {
    await gitCommit(message);
    process.stdout.write(`Committed: ${message}\n`);
    return;
  }

  // 10. Interactive loop
  while (true) {
    const action = await select({
      message: 'Generated commit message:',
      choices: [
        { name: `Accept: ${message}`, value: 'accept' },
        { name: 'Edit', value: 'edit' },
        { name: 'Regenerate', value: 'regenerate' },
        { name: 'Abort', value: 'abort' },
      ],
    });

    switch (action) {
      case 'accept':
        await gitCommit(message);
        process.stdout.write(`Committed: ${message}\n`);
        return;

      case 'edit': {
        // Write to temp file, open editor, read back
        const tmpDir = mkdtempSync(join(os.tmpdir(), 'aicommit-'));
        const tmpFile = join(tmpDir, 'commit-message.txt');
        writeFileSync(tmpFile, message, 'utf-8');
        const editor = process.env.EDITOR || 'vim';
        const editorArgs = editor.split(' ');
        execFileSync(editorArgs[0], [...editorArgs.slice(1), tmpFile], { stdio: 'inherit' });
        message = readFileSync(tmpFile, 'utf-8').trim();
        // Cleanup
        try {
          unlinkSync(tmpFile);
          os.rmdirSync(tmpDir);
        } catch { /* ignore cleanup errors */ }

        if (!message) {
          process.stderr.write('Empty commit message. Aborting.\n');
          return;
        }

        // After edit, ask to accept or continue
        const editAction = await select({
          message: `Edited message: ${message}`,
          choices: [
            { name: 'Accept', value: 'accept' },
            { name: 'Abort', value: 'abort' },
          ],
        });
        if (editAction === 'accept') {
          await gitCommit(message);
          process.stdout.write(`Committed: ${message}\n`);
          return;
        }
        return; // abort
      }

      case 'regenerate':
        message = await buildAndGenerate();
        continue;

      case 'abort':
        return;
    }
  }
}
