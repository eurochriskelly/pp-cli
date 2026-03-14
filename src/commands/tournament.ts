import { Command } from 'commander';
import { getCurrentSession } from '../lib/config.js';
import { getApiClient, assertOutputFormat } from '../lib/helpers.js';
import { formatOutput } from '../lib/formatters.js';
import { success, error, info } from '../lib/utils.js';
import type { GlobalOptions, Tournament, TournamentSummary } from '../types/index.js';

export function createTournamentCommands(): Command {
  const tournamentCmd = new Command('tournament')
    .alias('t')
    .description('Tournament management commands');

  tournamentCmd
    .command('list')
    .description('List all tournaments')
    .option('-s, --status <status>', 'Filter by status (draft, published, started, closed)')
    .option('-r, --region <region>', 'Filter by region')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        let path = '/api/tournaments';
        if (options.status) {
          path = `/api/tournaments/by-status/${options.status}`;
        }

        const tournaments = await client.get<TournamentSummary[]>(path);

        if (tournaments.length === 0) {
          info('No tournaments found');
          return;
        }

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(tournaments, { format: assertOutputFormat(opts.format) }));
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
    .command('delete <id>')
    .description('Delete a tournament')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/tournaments/${id}`);

        success(`Deleted tournament ${id}`);
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
    .command('standings <id>')
    .description('Get tournament group standings')
    .option('-g, --group <group>', 'Group number')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();
        
        let path = `/api/tournaments/${id}/group-standings`;
        if (options.group) {
          // The API might support filtering by group
          path = `/api/tournaments/${id}/group-standings?group=${options.group}`;
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
