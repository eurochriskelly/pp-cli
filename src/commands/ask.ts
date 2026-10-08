import { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { addAskAttachments, createAskSession, loadAskSession, saveAskSession } from '../ask/session-store.js';
import { runAskTurn } from '../ask/agent.js';
import { error, info } from '../lib/utils.js';
import type { GlobalOptions } from '../types/index.js';

const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash';

type AskOptions = {
  sessionId?: string;
  file?: string[];
  model?: string;
  maxSteps: string;
};

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

async function readPipedInput(): Promise<string> {
  let value = '';
  input.setEncoding('utf8');
  for await (const chunk of input) value += chunk;
  return value.trim();
}

export function createAskCommand(): Command {
  return new Command('ask')
    .description('Use an AI agent to operate ppx through visible, auditable commands')
    .argument('[prompt...]', 'Request in natural language')
    .option('-s, --session-id <id>', 'Continue an existing ask session')
    .option('--file <path>', 'Attach a file to the session (repeatable)', collect, [])
    .option('--model <id>', 'OpenRouter model id')
    .option('--max-steps <count>', 'Maximum model/tool rounds per turn', '8')
    .action(async (promptParts: string[], options: AskOptions) => {
      try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error('Set OPENROUTER_API_KEY before running ppx ask.');
        const requestedModel = options.model || process.env.PPX_ASK_MODEL || DEFAULT_MODEL;
        const session = options.sessionId
          ? await loadAskSession(options.sessionId)
          : await createAskSession(requestedModel);
        if (options.model && options.model !== session.model) {
          session.model = options.model;
          await saveAskSession(session);
        }
        await addAskAttachments(session, options.file || []);
        const maxSteps = Number.parseInt(options.maxSteps, 10);
        if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 20) {
          throw new Error('--max-steps must be between 1 and 20');
        }

        info(`Ask session: ${session.id}`);
        info(`Model: ${session.model}`);
        const globalOptions = (global as unknown as { ppOpts?: GlobalOptions }).ppOpts || {};
        const run = async (prompt: string): Promise<void> => {
          const result = await runAskTurn({
            session,
            prompt,
            apiKey,
            globalOptions,
            maxSteps,
            onCommand: (command) => console.log(`\n$ ${command}`),
          });
          console.log(`\n${result.text}\n`);
          info(`Turn: ${result.steps} model call(s), ${result.usage.totalTokens} tokens (${result.usage.promptTokens} in / ${result.usage.completionTokens} out)`);
          info(`Session total: ${session.usage.totalTokens} tokens`);
        };

        let initialPrompt = promptParts.join(' ').trim();
        if (!initialPrompt && !input.isTTY) initialPrompt = await readPipedInput();
        if (initialPrompt) await run(initialPrompt);

        if (input.isTTY && promptParts.length === 0) {
          const terminal = createInterface({ input, output });
          try {
            while (true) {
              const prompt = (await terminal.question('you> ')).trim();
              if (!prompt) continue;
              if (['/exit', '/quit'].includes(prompt.toLowerCase())) break;
              await run(prompt);
            }
          } finally {
            terminal.close();
          }
        } else if (!initialPrompt) {
          throw new Error('Provide a prompt as arguments or on stdin.');
        }
      } catch (err) {
        error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
}
