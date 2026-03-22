import { Command } from 'commander';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getCurrentSession } from '../lib/config.js';
import { getApiClient, assertOutputFormat } from '../lib/helpers.js';
import { formatOutput, formatStandings, formatStandingsWithMatches, formatTournamentList } from '../lib/formatters.js';
import { success, error, info, getErrorMessage } from '../lib/utils.js';
import {
  storeConfirmationCode,
  verifyConfirmationCode,
  clearConfirmationCode,
  generateConfirmationCode
} from '../lib/confirmation-codes.js';
import type { GlobalOptions, Tournament, TournamentSummary } from '../types/index.js';

// Types for tournament data
type Fixture = { id: number; tournamentId: number; cards?: unknown[] };
type Squad = { id: number; tournamentId: number; players?: unknown[] };
type FixtureLoadRow = Record<string, string>;
type FixtureImportRow = Record<string, string | number>;
type FixtureValidationCell = {
  value?: string | number;
  warnings?: Array<unknown>;
};
type FixtureValidationResult = {
  valid?: boolean;
  rows?: Array<FixtureLoadRow | Record<string, FixtureValidationCell>>;
  warnings?: Array<string | { message?: string; row?: number; column?: string }>;
  errors?: Array<string | { message?: string; row?: number; column?: string }>;
  stages?: string[] | Record<string, unknown>;
};
const FIXTURE_TSV_HEADERS = ['TIME', 'MATCH', 'CATEGORY', 'PITCH', 'TEAM1', 'STAGE', 'TEAM2', 'UMPIRES', 'DURATION'] as const;
const FIXTURE_IMPORT_FIELD_ORDER = ['TIME', 'MATCH', 'CATEGORY', 'PITCH', 'TEAM1', 'STAGE', 'TEAM2', 'UMPIRES', 'DURATION'] as const;

function normalizeFixtureTsv(tsvContent: string): string {
  const lines = tsvContent.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return tsvContent;
  }

  const rawHeaders = lines[0].split('\t').map((header) => header.trim().toUpperCase());
  const normalizedHeaders = rawHeaders.map((header) => {
    const matchedHeader = FIXTURE_TSV_HEADERS.find((expectedHeader) => expectedHeader === header);
    return matchedHeader ?? header;
  });

  const normalizedRows = lines.slice(1).map((line) => {
    const values = line.split('\t');
    return normalizedHeaders.map((_, index) => values[index]?.trim() ?? '').join('\t');
  });

  return [normalizedHeaders.join('\t'), ...normalizedRows].join('\n');
}

function getTournamentLoadConfirmationKey(tournamentId: string, tsvContent: string): string {
  const digest = createHash('sha256').update(tsvContent).digest('hex');
  return `tournament-load:${tournamentId}:${digest}`;
}

function formatFixtureValidationIssue(issue: string | { message?: string; row?: number; column?: string }): string {
  if (typeof issue === 'string') {
    return issue;
  }

  const locationParts: string[] = [];
  if (typeof issue.row === 'number') {
    locationParts.push(`row ${issue.row}`);
  }
  if (issue.column) {
    locationParts.push(`column ${issue.column}`);
  }

  return locationParts.length > 0
    ? `${locationParts.join(', ')}: ${issue.message ?? 'Unknown issue'}`
    : (issue.message ?? 'Unknown issue');
}

function printFixtureValidationIssues(
  label: string,
  issues: Array<string | { message?: string; row?: number; column?: string }> | undefined
): void {
  if (!issues || issues.length === 0) {
    return;
  }

  console.log(`${label}:`);
  issues.forEach((issue) => {
    console.log(`  - ${formatFixtureValidationIssue(issue)}`);
  });
  console.log('');
}

function printFixtureValidationSummary(validation: FixtureValidationResult): void {
  const rowCount = Array.isArray(validation.rows) ? validation.rows.length : 0;
  const stageCount = Array.isArray(validation.stages)
    ? validation.stages.length
    : (validation.stages && typeof validation.stages === 'object')
      ? Object.keys(validation.stages).length
      : 0;

  info(`Validated ${rowCount} fixture row(s)${stageCount > 0 ? ` across ${stageCount} stage(s)` : ''}.`);
  printFixtureValidationIssues('Warnings', validation.warnings);
  printFixtureValidationIssues('Errors', validation.errors);
}

function printFixtureLoadErrorDetails(err: unknown): void {
  if (!err || typeof err !== 'object' || !('details' in err)) {
    return;
  }

  const details = (err as { details?: unknown }).details;
  if (!details || typeof details !== 'object') {
    return;
  }

  const validation = details as FixtureValidationResult;
  if (Array.isArray(validation.errors) || Array.isArray(validation.warnings)) {
    printFixtureValidationIssues('Warnings', validation.warnings);
    printFixtureValidationIssues('Errors', validation.errors);
    return;
  }

  console.error('\nError details:');
  console.error(JSON.stringify(details, null, 2));
}

function flattenValidatedFixtureRows(
  rows: Array<FixtureLoadRow | Record<string, FixtureValidationCell>> | undefined
): FixtureImportRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const flattened: FixtureImportRow = {};

    for (const field of FIXTURE_IMPORT_FIELD_ORDER) {
      const rawValue = row[field];
      if (rawValue === undefined) {
        continue;
      }

      if (
        rawValue &&
        typeof rawValue === 'object' &&
        !Array.isArray(rawValue) &&
        'value' in rawValue
      ) {
        const cellValue = (rawValue as FixtureValidationCell).value;
        if (cellValue !== undefined) {
          flattened[field] = cellValue;
        }
      } else {
        flattened[field] = rawValue as string | number;
      }
    }

    return flattened;
  });
}

export function createTournamentCommands(): Command {
  const tournamentCmd = new Command('tournament')
    .aliases(['t', 'tournaments'])
    .description('Tournament management commands');

  tournamentCmd
    .command('list')
    .description('List all tournaments')
    .option('-s, --status <status>', 'Filter by status (draft, published, started, closed)')
    .option('-r, --region <region>', 'Filter by region')
    .option('--include-old-closed', 'Include closed/archived tournaments older than 1 month')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        let path = '/api/tournaments';
        if (options.status) {
          path = `/api/tournaments/by-status/${options.status}`;
        }

        const response = await client.get<TournamentSummary[] | { data?: TournamentSummary[] }>(path);
        
        // Handle both direct array responses and wrapped { data: [...] } responses
        const tournaments = Array.isArray(response) 
          ? response 
          : (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data))
            ? response.data
            : [];

        if (tournaments.length === 0) {
          info('No tournaments found');
          return;
        }

        const globalOpts = (global as unknown as { ppOpts?: GlobalOptions }).ppOpts;
        const format = globalOpts?.format ?? 'table';
        console.log(formatTournamentList(tournaments, {
          format: assertOutputFormat(format),
          includeOldClosed: options.includeOldClosed
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list tournaments';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('get <id>')
    .description('Get tournament details')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        const tournament = await client.get<Tournament>(`/api/tournaments/${id}`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(tournament, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get tournament';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('create')
    .description('Create a new tournament')
    .requiredOption('-n, --name <name>', 'Tournament name')
    .requiredOption('-d, --date <date>', 'Tournament date (YYYY-MM-DD)')
    .requiredOption('-l, --location <location>', 'Tournament location')
    .option('--region <region>', 'Region', 'Unknown')
    .option('--code-organizer <code>', 'Organizer access code')
    .option('--lat <latitude>', 'Latitude')
    .option('--lon <longitude>', 'Longitude')
    .option('--win-points <points>', 'Points for win', '2')
    .option('--draw-points <points>', 'Points for draw', '1')
    .option('--loss-points <points>', 'Points for loss', '0')
    .action(async (options) => {
      try {
        const { client, session } = await getApiClient();
        const userSession = await getCurrentSession(session);

        if (!userSession) {
          error('You must be logged in to create a tournament');
          process.exit(1);
        }

        const body = {
          userId: userSession.userId,
          title: options.name,
          date: options.date,
          location: options.location,
          region: options.region,
          codeOrganizer: options.codeOrganizer,
          lat: options.lat ? parseFloat(options.lat) : undefined,
          lon: options.lon ? parseFloat(options.lon) : undefined,
          winPoints: parseInt(options.winPoints, 10),
          drawPoints: parseInt(options.drawPoints, 10),
          lossPoints: parseInt(options.lossPoints, 10)
        };

        const tournament = await client.post<Tournament>('/api/tournaments', body);

        // Handle both API naming conventions (Title/title, Date/date)
        const title = (tournament as unknown as Record<string, string>).Title || tournament.title;
        const date = (tournament as unknown as Record<string, string>).Date || tournament.date;
        const location = (tournament as unknown as Record<string, string>).Location || tournament.location;

        success(`Created tournament "${title}"`);
        info(`ID: ${tournament.id}`);
        info(`Date: ${date}`);
        info(`Location: ${location}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create tournament';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('update <id>')
    .description('Update a tournament')
    .option('-n, --name <name>', 'Tournament name')
    .option('-d, --date <date>', 'Tournament date (YYYY-MM-DD)')
    .option('-l, --location <location>', 'Tournament location')
    .option('--region <region>', 'Region')
    .option('--code-organizer <code>', 'Organizer access code')
    .option('--lat <latitude>', 'Latitude')
    .option('--lon <longitude>', 'Longitude')
    .option('--win-points <points>', 'Points for win')
    .option('--draw-points <points>', 'Points for draw')
    .option('--loss-points <points>', 'Points for loss')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();

        const body: Record<string, unknown> = {};
        if (options.name) body.title = options.name;
        if (options.date) body.date = options.date;
        if (options.location) body.location = options.location;
        if (options.region) body.region = options.region;
        if (options.codeOrganizer) body.codeOrganizer = options.codeOrganizer;
        if (options.lat) body.lat = parseFloat(options.lat);
        if (options.lon) body.lon = parseFloat(options.lon);
        if (options.winPoints) body.winPoints = parseInt(options.winPoints, 10);
        if (options.drawPoints) body.drawPoints = parseInt(options.drawPoints, 10);
        if (options.lossPoints) body.lossPoints = parseInt(options.lossPoints, 10);

        const tournament = await client.put<Tournament>(`/api/tournaments/${id}`, body);

        success(`Updated tournament "${tournament.title}"`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update tournament';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('load <id>')
    .description('Validate and load fixtures for a tournament from a TSV file')
    .requiredOption('--input-file <path>', 'Path to the TSV file to load')
    .option('--confirmation-code <code>', 'Confirmation code from validation phase')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();
        const globalOpts = (global as unknown as { ppOpts?: GlobalOptions }).ppOpts;
        const format = assertOutputFormat(globalOpts?.format);
        const rawTsvContent = await readFile(options.inputFile, 'utf-8');
        const tsvContent = normalizeFixtureTsv(rawTsvContent);
        const confirmationKey = getTournamentLoadConfirmationKey(id, tsvContent);

        const validation = await client.post<FixtureValidationResult>(
          `/api/tournaments/${id}/validate-tsv`,
          { key: Buffer.from(tsvContent, 'utf-8').toString('base64') }
        );

        const validationFailed = validation.valid === false;
        if (validationFailed) {
          error(`Fixture validation failed for tournament ${id}`);
          printFixtureValidationSummary(validation);
          process.exit(1);
        }

        if (options.confirmationCode) {
          const isValid = await verifyConfirmationCode(confirmationKey, options.confirmationCode);
          if (!isValid) {
            error('Invalid or expired confirmation code. Please run without --confirmation-code to generate a new one.');
            process.exit(1);
          }

          const rows = flattenValidatedFixtureRows(validation.rows);
          const loadResult = await client.post<{ count?: number; message?: string }>(
            `/api/tournaments/${id}/fixtures`,
            rows
          );

          await clearConfirmationCode(confirmationKey);

          if (format !== 'table') {
            console.log(formatOutput({
              status: 'loaded',
              tournamentId: id,
              inputFile: options.inputFile,
              confirmationCode: options.confirmationCode,
              loadResult,
              validation
            }, { format }));
            return;
          }

          success(loadResult.message || `Loaded ${rows.length} fixture(s) into tournament ${id}`);
          if (typeof loadResult.count === 'number') {
            info(`Fixtures created: ${loadResult.count}`);
          }
          printFixtureValidationIssues('Warnings', validation.warnings);
          return;
        }

        const confirmationCode = generateConfirmationCode();
        await storeConfirmationCode(confirmationKey, confirmationCode);

        if (format !== 'table') {
          console.log(formatOutput({
            status: 'validated',
            tournamentId: id,
            inputFile: options.inputFile,
            confirmationCode,
            expiresInSeconds: 60,
            validation
          }, { format }));
          return;
        }

        success(`Fixtures validated successfully for tournament ${id}`);
        printFixtureValidationSummary(validation);
        console.log('To confirm fixture loading, run:\n');
        console.log(`  ppx tournaments load ${id} --input-file=${options.inputFile} --confirmation-code=${confirmationCode}\n`);
        console.log('This confirmation code is valid for 60 seconds.\n');
        info('No fixtures have been loaded yet. Review the validation output before proceeding.');
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to load fixtures');
        error(message);
        printFixtureLoadErrorDetails(err);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('delete <ids>')
    .description('Delete tournament(s) with confirmation (accepts single ID or comma-separated list)')
    .option('--confirmation-code <code>', 'Confirmation code from preview phase')
    .action(async (ids, options) => {
      try {
        const { client } = await getApiClient();

        // Parse IDs (support both single ID and comma-separated list)
        const idList = ids.split(',').map((id: string) => id.trim()).filter(Boolean);

        if (idList.length === 0) {
          error('No valid tournament IDs provided');
          process.exit(1);
        }

        // Check if this is a confirmation phase
        if (options.confirmationCode) {
          // Phase 2: Execute deletion with confirmation code
          // Verify confirmation code for all tournaments (sequential)
          for (const id of idList) {
            const isValid = await verifyConfirmationCode(id, options.confirmationCode);
            if (!isValid) {
              error('Invalid or expired confirmation code. Please run without --confirmation-code to generate a new one.');
              process.exit(1);
            }
          }

          // Execute deletion for all tournaments (sequential)
          const deleteResults: { id: string; status: 'fulfilled' | 'rejected'; reason?: unknown }[] = [];
          for (const id of idList) {
            try {
              await client.delete(`/api/tournaments/${id}`);
              deleteResults.push({ id, status: 'fulfilled' });
            } catch (err) {
              deleteResults.push({ id, status: 'rejected', reason: err });
            }
          }

          // Clear all confirmation codes (sequential)
          for (const id of idList) {
            await clearConfirmationCode(id);
          }

          // Report results
          const successful: string[] = [];
          const failed: { id: string; reason: string }[] = [];

          deleteResults.forEach((result, index) => {
            const id = idList[index];
            if (result.status === 'fulfilled') {
              successful.push(id);
            } else {
              const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
              failed.push({ id, reason });
            }
          });

          if (successful.length > 0) {
            success(`Deleted ${successful.length} tournament(s): ${successful.join(', ')}`);
          }

          if (failed.length > 0) {
            failed.forEach(({ id, reason }) => {
              error(`Failed to delete tournament ${id}: ${reason}`);
            });
            process.exit(1);
          }

          return;
        }

        // Phase 1: Show deletion preview and generate confirmation code for all tournaments
        const tournamentPreviews: { id: string; tournament: Tournament | null; fixtures: number; squads: number; players: number; cards: number; error: string | null }[] = [];
        for (const id of idList) {
          try {
            const tournament = await client.get<Tournament>(`/api/tournaments/${id}`);
            const fixtures = await client.get<Fixture[]>(`/api/tournaments/${id}/fixtures`).catch(() => [] as Fixture[]);
            const squads = await client.get<Squad[]>(`/api/tournaments/${id}/squads`).catch(() => [] as Squad[]);

            // Count players
            const playerCount = squads.reduce((total, squad) => {
              return total + (squad.players?.length || 0);
            }, 0);

            // Count cards across all fixtures
            let cardCount = 0;
            for (const fixture of fixtures) {
              try {
                const cards = await client.get<unknown[]>(`/api/tournaments/${id}/fixtures/${fixture.id}/cards`);
                cardCount += cards.length;
              } catch {
                // Skip fixtures that don't have cards
              }
            }

            tournamentPreviews.push({
              id,
              tournament,
              fixtures: fixtures.length,
              squads: squads.length,
              players: playerCount,
              cards: cardCount,
              error: null
            });
          } catch (err) {
            tournamentPreviews.push({
              id,
              tournament: null,
              fixtures: 0,
              squads: 0,
              players: 0,
              cards: 0,
              error: err instanceof Error ? err.message : 'Failed to fetch tournament'
            });
          }
        }

        // Check for any fetch errors
        const fetchErrors = tournamentPreviews.filter(p => p.error);
        if (fetchErrors.length > 0) {
          fetchErrors.forEach(p => {
            error(`Failed to fetch tournament ${p.id}: ${p.error}`);
          });
          if (fetchErrors.length === idList.length) {
            process.exit(1);
          }
        }

        // Generate a single confirmation code for all tournaments
        const confirmationCode = generateConfirmationCode();
        // Store the same code for all tournaments
        for (const id of idList) {
          await storeConfirmationCode(id, confirmationCode);
        }

        // Display deletion preview
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  ⚠️  TOURNAMENT DELETION PREVIEW  ⚠️');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const validPreviews = tournamentPreviews.filter(p => !p.error);
        
        console.log(`${validPreviews.length} tournament(s) will be deleted:\n`);

        let totalFixtures = 0;
        let totalSquads = 0;
        let totalPlayers = 0;
        let totalCards = 0;

        validPreviews.forEach((preview, index) => {
          // Handle both API naming conventions (Title/title, Date/date, Location/location)
          const t = preview.tournament as unknown as Record<string, string>;
          const title = t.Title || t.title || 'N/A';
          const date = t.Date || t.date || 'N/A';
          const location = t.Location || t.location || 'N/A';

          console.log(`  ${index + 1}. ${title}`);
          console.log(`     Date:      ${date}`);
          console.log(`     Location:  ${location}`);
          console.log(`     Region:    ${preview.tournament!.region}`);
          console.log(`     Status:    ${preview.tournament!.status}`);
          console.log(`     ID:        ${preview.id}`);
          console.log(`     Data:      ${preview.fixtures} fixtures, ${preview.squads} squads, ${preview.players} players, ${preview.cards} cards\n`);

          totalFixtures += preview.fixtures;
          totalSquads += preview.squads;
          totalPlayers += preview.players;
          totalCards += preview.cards;
        });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  TOTAL DATA TO BE PERMANENTLY DELETED');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`  📊 Fixtures:  ${totalFixtures}`);
        console.log(`  👥 Squads:    ${totalSquads}`);
        console.log(`  🏃 Players:   ${totalPlayers}`);
        console.log(`  🟨 Cards:     ${totalCards}\n`);

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  ⚠️  WARNING: THIS ACTION IS IRREVERSIBLE  ⚠️');
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log(`To confirm deletion, run:\n`);
        console.log(`  ppx tournament delete ${ids} --confirmation-code=${confirmationCode}\n`);
        console.log(`This confirmation code is valid for 60 seconds.\n`);

        info('No data has been deleted yet. Review the information above before proceeding.');

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete tournament';
        error(message);
        process.exit(1);
      }
    });

  // Tournament Lifecycle Commands
  tournamentCmd
    .command('publish <id>')
    .description('Publish a tournament')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.put(`/api/tournaments/${id}/status/published`);

        success(`Published tournament ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to publish tournament';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('start <id>')
    .description('Start a tournament (make it live)')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.put(`/api/tournaments/${id}/status/started`);

        success(`Started tournament ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start tournament';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('close <id>')
    .description('Close a tournament')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.put(`/api/tournaments/${id}/status/closed`);

        success(`Closed tournament ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to close tournament';
        error(message);
        
        // Show additional error details if available
        if (err && typeof err === 'object' && 'details' in err) {
          const details = (err as { details?: unknown }).details;
          if (details) {
            console.error('\nError details:');
            console.error(JSON.stringify(details, null, 2));
          }
        }
        
        process.exit(1);
      }
    });

  tournamentCmd
    .command('reset <id>')
    .description('Reset a tournament (clear all data)')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.post(`/api/tournaments/${id}/reset`);

        success(`Reset tournament ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reset tournament';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('overview <id>')
    .description('Get tournament overview')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        const overview = await client.get(`/api/tournaments/${id}/overview`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(overview, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get tournament overview';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('standings <id> [divisionGroup]')
    .description('Get tournament group standings')
    .option('-g, --group <group>', 'Group number')
    .action(async (id, divisionGroup, options) => {
      try {
        const { client } = await getApiClient();
        
        let path = `/api/tournaments/${id}/group-standings`;
        if (options.group) {
          // The API might support filtering by group
          path = `/api/tournaments/${id}/group-standings?group=${options.group}`;
        }
        
        const standings = await client.get(path);
        
        // Parse division/group filter if provided (e.g., "HURLING/1" or "MENS_SENIOR/Gp.1")
        let divisionFilter: string | undefined;
        let groupFilter: string | undefined;
        if (divisionGroup) {
          const parts = divisionGroup.split('/');
          if (parts.length === 2) {
            divisionFilter = parts[0];
            // Normalize group number (remove "Gp." prefix if present)
            groupFilter = parts[1].replace(/^Gp\.?/i, '');
          }
        }

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        const format = assertOutputFormat(opts.format);
        
        // Use custom formatter for table view, standard formatter for others
        if (format === 'table') {
          if (divisionFilter && groupFilter) {
            // Show detailed view with standings + matches
            const output = await formatStandingsWithMatches(
              standings as import('../types/index.js').TournamentStandings,
              id,
              divisionFilter,
              groupFilter,
              client
            );
            console.log(output);
          } else {
            console.log(formatStandings(standings as import('../types/index.js').TournamentStandings));
          }
        } else {
          console.log(formatOutput(standings, { format }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get standings';
        error(message);
        process.exit(1);
      }
    });

  tournamentCmd
    .command('brackets <id>')
    .description('Get tournament knockout brackets')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        const brackets = await client.get(`/api/tournaments/${id}/knockout-fixtures`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(brackets, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get brackets';
        error(message);
        process.exit(1);
      }
    });

  return tournamentCmd;
}
