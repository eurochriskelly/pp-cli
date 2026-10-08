import type { GlobalOptions } from '../types/index.js';
import { inspectAttachment } from './attachments.js';
import { displayPpxCommand, runPpxCommand } from './command-runner.js';
import { completeWithOpenRouter, type AskToolDefinition } from './openrouter.js';
import { saveAskSession } from './session-store.js';
import type { AskMessage, AskSession, AskToolCall, AskUsage } from './types.js';

const MAX_CONTEXT_CHARACTERS = 80_000;
const CONTEXT_TRUNCATION_NOTICE = '\n[message content truncated to stay within the ask context budget]';

const TOOLS: AskToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'run_ppx',
      description: 'Run one PitchPerfect CLI command. Pass argv exactly, without the leading ppx. This is not a shell.',
      parameters: {
        type: 'object',
        properties: {
          args: { type: 'array', items: { type: 'string' }, minItems: 1 },
        },
        required: ['args'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inspect_attachment',
      description: 'Inspect a user attachment by its session attachment id. Text tables return a bounded preview.',
      parameters: {
        type: 'object',
        properties: { attachment_id: { type: 'string' } },
        required: ['attachment_id'],
        additionalProperties: false,
      },
    },
  },
];

function systemPrompt(session: AskSession): AskMessage {
  const attachments = session.attachments.length === 0
    ? 'none'
    : session.attachments.map((item) => `${item.id}: ${item.originalName} (${item.size} bytes)`).join('\n');
  return {
    role: 'system',
    content: `You are the PitchPerfect tournament operations agent inside ppx ask.
Use run_ppx to inspect and operate the connected system. Never invent IDs or command results.
Start unfamiliar workflows with "system capabilities" or targeted "<command> --help". Prefer one useful call over exploratory repetition.
The tool is argv-based: never include "ppx", shell syntax, redirects, pipes, or quoted argument wrappers.
Before irreversible deletion, reset, or applying a validated fixture import, explain the impact and ask the user for confirmation unless their current message explicitly confirms it.
Use machine-readable output. If a command fails, use its error to correct the call; do not blindly retry.
Resolve relative dates from ${new Date().toISOString().slice(0, 10)}. Ask only for information that cannot be safely inferred.
Keep the final answer concise and say exactly what changed or what you still need.
Session attachments:\n${attachments}`,
  };
}

function contextMessages(session: AskSession): AskMessage[] {
  const turns: AskMessage[][] = [];
  for (const message of session.messages) {
    if (message.role === 'user' || turns.length === 0) turns.push([]);
    turns.at(-1)?.push(message);
  }
  const system = systemPrompt(session);
  // Reserve room for the enclosing array plus separators between the system
  // message and selected turn messages.
  const contextBudget = Math.max(0, MAX_CONTEXT_CHARACTERS - JSON.stringify(system).length - 16);
  const selectedTurns: AskMessage[][] = [];
  let size = 0;
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turnSize = JSON.stringify(turns[index]).length;
    if (size + turnSize <= contextBudget) {
      selectedTurns.unshift(turns[index]);
      size += turnSize;
      continue;
    }
    if (selectedTurns.length === 0) {
      selectedTurns.unshift(fitMessagesToBudget(turns[index], contextBudget));
    }
    break;
  }
  return [system, ...selectedTurns.flat()];
}

function fitMessagesToBudget(messages: AskMessage[], budget: number): AskMessage[] {
  const fitted = messages.map((message) => ({ ...message }));
  if (JSON.stringify(fitted).length <= budget) return fitted;

  const contentIndexes = fitted
    .map((message, index) => (typeof message.content === 'string' ? index : -1))
    .filter((index) => index >= 0);
  if (contentIndexes.length === 0) return fitted;

  const skeleton = fitted.map((message) => ({
    ...message,
    content: typeof message.content === 'string' ? '' : message.content,
  }));
  let remainingBudget = Math.max(0, budget - JSON.stringify(skeleton).length);
  let remainingContents = contentIndexes.length;

  for (const index of contentIndexes) {
    const message = fitted[index];
    const content = message.content as string;
    const allocation = Math.floor(remainingBudget / remainingContents);
    const truncated = content.length > allocation
      ? allocation <= CONTEXT_TRUNCATION_NOTICE.length
        ? CONTEXT_TRUNCATION_NOTICE.slice(0, allocation)
        : `${content.slice(0, allocation - CONTEXT_TRUNCATION_NOTICE.length)}${CONTEXT_TRUNCATION_NOTICE}`
      : content;
    message.content = truncated;
    remainingBudget -= truncated.length;
    remainingContents -= 1;
  }

  return fitted;
}

function usageFromResponse(response: Awaited<ReturnType<typeof completeWithOpenRouter>>): AskUsage {
  return {
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
    totalTokens: response.usage?.total_tokens || 0,
  };
}

function addUsage(target: AskUsage, addition: AskUsage): void {
  target.promptTokens += addition.promptTokens;
  target.completionTokens += addition.completionTokens;
  target.totalTokens += addition.totalTokens;
}

function parseArguments(call: AskToolCall): Record<string, unknown> {
  try {
    return JSON.parse(call.function.arguments) as Record<string, unknown>;
  } catch {
    throw new Error(`Model returned invalid JSON for ${call.function.name}`);
  }
}

function highImpactAction(args: string[]): string | null {
  const [family, operation] = args;
  const isTournament = ['tournament', 'tournaments', 't'].includes(family);
  const hasConfirmationCode = args.some((arg) => arg === '--confirmation-code' || arg.startsWith('--confirmation-code='));

  if (isTournament && operation === 'load' && hasConfirmationCode) return 'fixture import';
  if (isTournament && operation === 'delete' && hasConfirmationCode) return 'tournament deletion';
  if (isTournament && operation === 'reset' && hasConfirmationCode) return 'tournament reset';
  if (family === 'fixture' && operation === 'delete-card') return 'card deletion';
  if (family === 'squad' && ['delete', 'remove-player'].includes(operation)) return 'squad or player deletion';
  if (!isTournament && operation === 'delete') return 'deletion';
  return null;
}

function hasExplicitApproval(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  if (/\b(do not|don't|dont|never|without|cancel|stop|no)\b/.test(normalized)) {
    return false;
  }
  return /\b(confirm|confirmed|approve|approved|proceed|yes|apply)\b|go ahead|do it/i.test(normalized);
}

async function executeTool(
  call: AskToolCall,
  session: AskSession,
  globalOptions: GlobalOptions,
  userPrompt: string,
  onCommand: (command: string) => void,
): Promise<string> {
  const input = parseArguments(call);
  if (call.function.name === 'run_ppx') {
    if (!Array.isArray(input.args) || !input.args.every((arg) => typeof arg === 'string')) {
      throw new Error('run_ppx args must be an array of strings');
    }
    const args = input.args as string[];
    const action = highImpactAction(args);
    if (action && !hasExplicitApproval(userPrompt)) {
      throw new Error(`User confirmation is required in a new message before ${action} can run`);
    }
    const inherited: string[] = [];
    if (globalOptions.profile) inherited.push('--profile', globalOptions.profile);
    if (globalOptions.apiUrl) inherited.push('--api-url', globalOptions.apiUrl);
    const visibleArgs = [
      ...inherited,
      ...(args.includes('--format') || args.includes('-f') ? [] : ['--format', 'json']),
      ...args,
    ];
    onCommand(displayPpxCommand(visibleArgs));
    return JSON.stringify(await runPpxCommand(args, inherited));
  }
  if (call.function.name === 'inspect_attachment') {
    const attachment = session.attachments.find((item) => item.id === input.attachment_id);
    if (!attachment) throw new Error(`Unknown attachment id: ${String(input.attachment_id)}`);
    return JSON.stringify(await inspectAttachment(attachment));
  }
  throw new Error(`Unknown tool: ${call.function.name}`);
}

export type AskTurnResult = {
  text: string;
  usage: AskUsage;
  steps: number;
};

export async function runAskTurn(input: {
  session: AskSession;
  prompt: string;
  apiKey: string;
  globalOptions: GlobalOptions;
  maxSteps: number;
  onCommand: (command: string) => void;
}): Promise<AskTurnResult> {
  input.session.messages.push({ role: 'user', content: input.prompt });
  const turnUsage: AskUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  await saveAskSession(input.session);

  for (let step = 1; step <= input.maxSteps; step += 1) {
    const response = await completeWithOpenRouter({
      apiKey: input.apiKey,
      model: input.session.model,
      messages: contextMessages(input.session),
      tools: TOOLS,
    });
    const responseUsage = usageFromResponse(response);
    addUsage(turnUsage, responseUsage);
    addUsage(input.session.usage, responseUsage);
    const assistant = response.choices?.[0]?.message;
    if (!assistant) {
      await saveAskSession(input.session);
      throw new Error('OpenRouter returned no assistant message');
    }
    input.session.messages.push(assistant);
    await saveAskSession(input.session);

    if (!assistant.tool_calls || assistant.tool_calls.length === 0) {
      const text = assistant.content?.trim() || 'Done.';
      await saveAskSession(input.session);
      return { text, usage: turnUsage, steps: step };
    }

    for (const call of assistant.tool_calls) {
      let content: string;
      try {
        content = await executeTool(call, input.session, input.globalOptions, input.prompt, input.onCommand);
      } catch (err) {
        content = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
      }
      input.session.messages.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content });
    }
    await saveAskSession(input.session);
  }

  await saveAskSession(input.session);
  throw new Error(`Agent stopped after ${input.maxSteps} tool rounds. Continue with --session-id ${input.session.id}.`);
}
