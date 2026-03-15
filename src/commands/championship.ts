import { Command } from 'commander';
import { getApiClient, assertOutputFormat } from '../lib/helpers.js';
import { formatOutput, formatSeriesList } from '../lib/formatters.js';
import { success, error, info } from '../lib/utils.js';
import type { GlobalOptions, Championship, Series, Entrant } from '../types/index.js';

export function createChampionshipCommands(): Command {
  const championshipCmd = new Command('championship')
    .alias('c')
    .description('Championship management commands');

  championshipCmd
    .command('list')
    .description('List all championships')
    .option('-s, --series <series-id>', 'Filter by series')
    .option('-y, --year <year>', 'Filter by year')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        let path = '/api/championships';
        const params = new URLSearchParams();
        if (options.series) params.append('seriesId', options.series);
        if (options.year) params.append('year', options.year);
        if (params.toString()) {
          path += `?${params.toString()}`;
        }

        const championships = await client.get<Championship[]>(path);

        if (championships.length === 0) {
          info('No championships found');
          return;
        }

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(championships, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list championships';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('get <id>')
    .description('Get championship details')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        const championship = await client.get<Championship>(`/api/championships/${id}`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(championship, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get championship';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('create')
    .description('Create a new championship')
    .requiredOption('-s, --series-id <id>', 'Series ID')
    .requiredOption('-y, --year <year>', 'Year')
    .option('-r, --rounds <count>', 'Number of rounds', '1')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        const body = {
          seriesId: parseInt(options.seriesId, 10),
          year: parseInt(options.year, 10),
          rounds: parseInt(options.rounds, 10)
        };

        const championship = await client.post<Championship>('/api/championships', body);

        success(`Created championship for year ${championship.year}`);
        info(`ID: ${championship.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create championship';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('update <id>')
    .description('Update a championship')
    .option('-y, --year <year>', 'Year')
    .option('-r, --rounds <count>', 'Number of rounds')
    .option('--status <status>', 'Status (draft, open, in-progress, completed, archived)')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();

        const body: Record<string, unknown> = {};
        if (options.year) body.year = parseInt(options.year, 10);
        if (options.rounds) body.rounds = parseInt(options.rounds, 10);
        if (options.status) body.status = options.status;

        await client.put<Championship>(`/api/championships/${id}`, body);

        success(`Updated championship ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update championship';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('delete <id>')
    .description('Delete a championship')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/championships/${id}`);

        success(`Deleted championship ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete championship';
        error(message);
        process.exit(1);
      }
    });

  // Lifecycle commands
  championshipCmd
    .command('open <id>')
    .description('Open championship for registrations')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.post(`/api/championships/${id}/open`);

        success(`Opened championship ${id} for registrations`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to open championship';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('start <id>')
    .description('Start championship (begin competition)')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.post(`/api/championships/${id}/start`);

        success(`Started championship ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start championship';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('complete <id>')
    .description('Mark championship as completed')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.post(`/api/championships/${id}/complete`);

        success(`Completed championship ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to complete championship';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('archive <id>')
    .description('Archive a championship')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.post(`/api/championships/${id}/archive`);

        success(`Archived championship ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to archive championship';
        error(message);
        process.exit(1);
      }
    });

  // Entrant management
  championshipCmd
    .command('entrants <id>')
    .description('List all entrants in a championship')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        const entrants = await client.get<Entrant[]>(`/api/championships/${id}/entrants`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(entrants, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list entrants';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('register <id>')
    .description('Register a club as an entrant')
    .requiredOption('-c, --club-id <id>', 'Club ID')
    .option('-n, --name <name>', 'Display name for the competition')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();

        const body = {
          clubId: parseInt(options.clubId, 10),
          displayName: options.name
        };

        const entrant = await client.post<Entrant>(`/api/championships/${id}/entrants`, body);

        success(`Registered entrant "${entrant.displayName}"`);
        info(`ID: ${entrant.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to register entrant';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('register-amalgamation <id>')
    .description('Register an amalgamation as an entrant')
    .requiredOption('-n, --name <name>', 'Display name')
    .requiredOption('--clubs <ids>', 'Comma-separated club IDs')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();

        const clubIds = options.clubs.split(',').map((id: string) => parseInt(id.trim(), 10));

        const body = {
          displayName: options.name,
          isAmalgamation: true,
          clubs: clubIds
        };

        const entrant = await client.post<Entrant>(`/api/championships/${id}/entrants`, body);

        success(`Registered amalgamation "${entrant.displayName}"`);
        info(`ID: ${entrant.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to register amalgamation';
        error(message);
        process.exit(1);
      }
    });

  championshipCmd
    .command('unregister <id> <entrant-id>')
    .description('Remove an entrant from a championship')
    .action(async (id, entrantId) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/championships/${id}/entrants/${entrantId}`);

        success(`Removed entrant ${entrantId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove entrant';
        error(message);
        process.exit(1);
      }
    });

  // Standings
  championshipCmd
    .command('standings <id>')
    .description('Get championship standings')
    .option('-r, --round <round>', 'Round number')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();

        let path = `/api/championships/${id}/standings`;
        if (options.round) {
          path += `?round=${options.round}`;
        }

        const standings = await client.get(path);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(standings, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get standings';
        error(message);
        process.exit(1);
      }
    });

  return championshipCmd;
}

export function createSeriesCommands(): Command {
  const seriesCmd = new Command('series')
    .alias('sr')
    .description('Series management commands');

  seriesCmd
    .command('list')
    .description('List all series')
    .option('-s, --sport <sport>', 'Filter by sport')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        let path = '/api/series';
        if (options.sport) {
          path += `?sport=${encodeURIComponent(options.sport)}`;
        }

        const [series, championships] = await Promise.all([
          client.get<Series[]>(path),
          client.get<Championship[]>('/api/championships')
        ]);

        if (series.length === 0) {
          info('No series found');
          return;
        }

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatSeriesList(series, { 
          format: assertOutputFormat(opts.format),
          championships 
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list series';
        error(message);
        process.exit(1);
      }
    });

  seriesCmd
    .command('get <id>')
    .description('Get series details')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        const series = await client.get<Series>(`/api/series/${id}`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        const format = assertOutputFormat(opts.format);

        if (format === 'table') {
          // For table format, show series details and championships separately
          console.log(formatOutput(series, { format }));

          // Fetch and display championships for this series
          const championships = await client.get<Championship[]>('/api/championships');
          const seriesChampionships = championships.filter(c => c.seriesId === parseInt(id, 10));

          if (seriesChampionships.length > 0) {
            console.log('\nChampionships:');
            console.log(formatOutput(seriesChampionships, { format }));
          }
        } else {
          // For other formats, include championships in the output
          const championships = await client.get<Championship[]>('/api/championships');
          const seriesChampionships = championships.filter(c => c.seriesId === parseInt(id, 10));

          const output = {
            ...series,
            championships: seriesChampionships
          };
          console.log(formatOutput(output, { format }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get series';
        error(message);
        process.exit(1);
      }
    });

  seriesCmd
    .command('create')
    .description('Create a new series')
    .requiredOption('-n, --name <name>', 'Series name')
    .option('-s, --sport <sport>', 'Sport type')
    .option('--squad-size <size>', 'Default squad size')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        const body: Record<string, unknown> = {
          name: options.name
        };
        if (options.sport) body.sport = options.sport;
        if (options.squadSize) body.squadSize = parseInt(options.squadSize, 10);

        const series = await client.post<Series>('/api/series', body);

        success(`Created series "${series.name}"`);
        info(`ID: ${series.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create series';
        error(message);
        process.exit(1);
      }
    });

  seriesCmd
    .command('update <id>')
    .description('Update a series')
    .option('-n, --name <name>', 'Series name')
    .option('-s, --sport <sport>', 'Sport type')
    .option('--squad-size <size>', 'Default squad size')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();

        const body: Record<string, unknown> = {};
        if (options.name) body.name = options.name;
        if (options.sport) body.sport = options.sport;
        if (options.squadSize) body.squadSize = parseInt(options.squadSize, 10);

        const series = await client.put<Series>(`/api/series/${id}`, body);

        success(`Updated series "${series.name}"`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update series';
        error(message);
        process.exit(1);
      }
    });

  seriesCmd
    .command('delete <id>')
    .description('Delete a series')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/series/${id}`);

        success(`Deleted series ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete series';
        error(message);
        process.exit(1);
      }
    });

  return seriesCmd;
}
