import { Command } from 'commander';
import { assertOutputFormat, getApiClient } from '../lib/helpers.js';
import { formatOutput } from '../lib/formatters.js';
import { error, info, success, getErrorMessage } from '../lib/utils.js';
import type { GlobalOptions } from '../types/index.js';

const REQUIRED_API_CONTRACT_VERSION = '1.0.0';

type ApiCapabilities = {
  contractVersion?: string;
  api?: { name?: string };
  workflows?: Record<string, unknown>;
};

type DoctorCheck = {
  ok: boolean;
  value?: unknown;
  error?: string;
};

async function check(promise: Promise<unknown>): Promise<DoctorCheck> {
  try {
    return { ok: true, value: await promise };
  } catch (err) {
    return { ok: false, error: getErrorMessage(err, 'Request failed') };
  }
}

function getFormat(): 'table' | 'json' | 'yaml' | 'csv' {
  const opts = (global as unknown as { ppOpts?: GlobalOptions }).ppOpts;
  return assertOutputFormat(opts?.format);
}

export function createSystemCommands(): Command {
  const systemCmd = new Command('system').description('Inspect API capabilities and runtime mode');

  systemCmd
    .command('capabilities')
    .description('Show the machine-readable API contract and safe CLI workflows')
    .action(async () => {
      try {
        const { client } = await getApiClient();
        const capabilities = await client.get<ApiCapabilities>('/api/system/capabilities');
        const format = getFormat();

        if (format !== 'table') {
          console.log(formatOutput(capabilities, { format }));
          return;
        }

        info(`API: ${capabilities.api?.name ?? 'PitchPerfect API'}`);
        info(`Contract version: ${capabilities.contractVersion ?? 'unknown'}`);
        info(`Workflows: ${Object.keys(capabilities.workflows ?? {}).join(', ') || 'none'}`);
        info('For the complete contract, run: ppx system capabilities --format json');
      } catch (err) {
        error(getErrorMessage(err, 'Failed to read API capabilities'));
        process.exit(1);
      }
    });

  systemCmd
    .command('mode')
    .description('Show whether the API is using a database or in-memory mock mode')
    .action(async () => {
      try {
        const { client } = await getApiClient();
        const mode = await client.get('/api/system/mode');
        console.log(formatOutput(mode, { format: getFormat() }));
      } catch (err) {
        error(getErrorMessage(err, 'Failed to read API mode'));
        process.exit(1);
      }
    });

  return systemCmd;
}

export function createDoctorCommand(): Command {
  return new Command('doctor')
    .description('Check API reachability, runtime mode, and CLI/API contract compatibility')
    .action(async () => {
      try {
        const format = getFormat();
        const { client } = await getApiClient();
        const [health, mode, capabilities] = await Promise.all([
          check(client.get('/api/system/health')),
          check(client.get('/api/system/mode')),
          check(client.get<ApiCapabilities>('/api/system/capabilities')),
        ]);
        const contractVersion = capabilities.ok
          ? (capabilities.value as ApiCapabilities).contractVersion
          : undefined;
        const contractCompatible = contractVersion === REQUIRED_API_CONTRACT_VERSION;
        const report = {
          cli: {
            name: 'ppx',
            requiredApiContractVersion: REQUIRED_API_CONTRACT_VERSION,
          },
          api: {
            reachable: health.ok,
            health,
            mode,
            capabilities,
            contract: {
              version: contractVersion ?? null,
              compatible: contractCompatible,
            },
          },
          ok: health.ok && mode.ok && capabilities.ok && contractCompatible,
        };

        if (format !== 'table') {
          console.log(formatOutput(report, { format }));
        } else if (report.ok) {
          success(`API is reachable and compatible with contract ${REQUIRED_API_CONTRACT_VERSION}.`);
        } else {
          error('API diagnostics found a connection or contract compatibility problem.');
          if (!health.ok) info(`Health check: ${health.error}`);
          if (!mode.ok) info(`Mode check: ${mode.error}`);
          if (!capabilities.ok) info(`Capabilities check: ${capabilities.error}`);
          if (capabilities.ok && !contractCompatible) {
            info(`Expected contract ${REQUIRED_API_CONTRACT_VERSION}; API reports ${contractVersion ?? 'none'}.`);
          }
        }

        if (!report.ok) {
          process.exitCode = 2;
        }
      } catch (err) {
        error(getErrorMessage(err, 'Failed to run API diagnostics'));
        process.exit(1);
      }
    });
}
