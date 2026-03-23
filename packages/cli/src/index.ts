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
