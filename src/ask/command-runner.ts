import { spawn } from 'node:child_process';

const ALLOWED_COMMANDS = new Set([
  'auth', 'doctor', 'system', 'tournament', 'tournaments', 't', 'fixture',
  'squad', 'championship', 'series', 'club', 'team', 'help',
]);
const OUTPUT_LIMIT = 16_000;
const RESTRICTED_GLOBAL_OPTIONS = [
  '--api-url', '--profile', '--verbose', '--format', '-u', '-v', '-f',
] as const;

export type CommandResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function quote(arg: string): string {
  return /^[a-zA-Z0-9_./:=,@+-]+$/.test(arg) ? arg : `'${arg.replaceAll("'", "'\\''")}'`;
}

export function displayPpxCommand(args: string[]): string {
  const redacted = args.map((arg, index) => (
    index > 0 && args[index - 1] === '--password' ? '<redacted>' : arg
  ));
  return `ppx ${redacted.map(quote).join(' ')}`;
}

function isRestrictedGlobalOption(arg: string, index: number): boolean {
  if (RESTRICTED_GLOBAL_OPTIONS.includes(arg as typeof RESTRICTED_GLOBAL_OPTIONS[number])) {
    return true;
  }
  if (
    arg.startsWith('--api-url=') || arg.startsWith('--profile=') ||
    arg.startsWith('--verbose=') || arg.startsWith('--format=') ||
    arg.startsWith('-u') || arg.startsWith('-v') || arg.startsWith('-f')
  ) {
    return true;
  }
  // `-p` is also used by some subcommands. It can only override the global
  // profile before a subcommand has been selected.
  return index === 1 && (arg === '-p' || arg.startsWith('-p'));
}

function appendBounded(value: string, chunk: string): string {
  if (value.length >= OUTPUT_LIMIT) return value;
  const remaining = OUTPUT_LIMIT - value.length;
  if (chunk.length <= remaining) return value + chunk;
  return value + chunk.slice(0, remaining);
}

function bounded(value: string, truncated = false): string {
  if (!truncated && value.length <= OUTPUT_LIMIT) return value;
  return `${value.slice(0, OUTPUT_LIMIT)}\n[output truncated after ${OUTPUT_LIMIT} characters]`;
}

export async function runPpxCommand(args: string[], inheritedArgs: string[] = []): Promise<CommandResult> {
  if (args.length === 0) throw new Error('A ppx command is required');
  if (!ALLOWED_COMMANDS.has(args[0]) || args[0] === 'ask') {
    throw new Error(`The ask agent may not run ppx ${args[0]}`);
  }
  if (args[0] === 'auth' && ['login', 'logout'].includes(args[1] || '')) {
    throw new Error('Authentication changes must be performed directly by the user');
  }
  if (args.some((arg) => arg.includes('\0') || arg.includes('\n'))) {
    throw new Error('Command arguments may not contain control characters');
  }
  if (args.some(isRestrictedGlobalOption)) {
    throw new Error('The ask agent may not override ppx global connection, profile, verbosity, or output options');
  }

  const cliArgs = [...inheritedArgs, '--format', 'json', ...args];
  const executableArgs = [...process.execArgv, process.argv[1], ...cliArgs];

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, executableArgs, {
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      stdoutTruncated ||= stdout.length + chunk.length > OUTPUT_LIMIT;
      stdout = appendBounded(stdout, chunk);
    });
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      stderrTruncated ||= stderr.length + chunk.length > OUTPUT_LIMIT;
      stderr = appendBounded(stderr, chunk);
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, 45_000);
    child.on('error', reject);
    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      resolve({
        exitCode,
        stdout: bounded(stdout, stdoutTruncated),
        stderr: bounded(stderr, stderrTruncated),
        timedOut,
      });
    });
  });
}
