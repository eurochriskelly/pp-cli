import { Command } from 'commander';
import { getApiClient, assertOutputFormat } from '../lib/helpers.js';
import { formatOutput } from '../lib/formatters.js';
import { success, error, info } from '../lib/utils.js';
import type { GlobalOptions, Squad, Player } from '../types/index.js';

export function createSquadCommands(): Command {
  const squadCmd = new Command('squad')
    .alias('s')
    .description('Squad management commands');

  squadCmd
    .command('list <tournament-id>')
    .description('List all squads in a tournament')
    .action(async (tournamentId) => {
      try {
        const { client } = await getApiClient();
        const squads = await client.get<Squad[]>(`/api/tournaments/${tournamentId}/squads`);

        if (squads.length === 0) {
          info('No squads found in this tournament');
          return;
        }

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(squads, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list squads';
        error(message);
        process.exit(1);
      }
    });

  squadCmd
    .command('get <tournament-id> <squad-id>')
    .description('Get squad details')
    .action(async (tournamentId, squadId) => {
      try {
        const { client } = await getApiClient();
        const squad = await client.get<Squad>(`/api/tournaments/${tournamentId}/squads/${squadId}`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(squad, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get squad';
        error(message);
        process.exit(1);
      }
    });

  squadCmd
    .command('create <tournament-id>')
    .description('Create a new squad')
    .requiredOption('-n, --name <name>', 'Squad name')
    .option('-c, --category <category>', 'Category (e.g., Senior, U16, U14)')
    .option('--club-id <id>', 'Club ID')
    .action(async (tournamentId, options) => {
      try {
        const { client } = await getApiClient();

        const body = {
          teamName: options.name,
          category: options.category,
          clubId: options.clubId ? parseInt(options.clubId, 10) : undefined
        };

        const squad = await client.post<Squad>(`/api/tournaments/${tournamentId}/squads`, body);

        // Handle API naming conventions - API returns teamName
        const squadData = squad as unknown as Record<string, unknown>;
        const name = (squadData.teamName as string) || (squadData.Name as string) || (squadData.name as string) || options.name;

        success(`Created squad "${name}"`);
        info(`ID: ${squad.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create squad';
        error(message);
        process.exit(1);
      }
    });

  squadCmd
    .command('update <tournament-id> <squad-id>')
    .description('Update a squad')
    .option('-n, --name <name>', 'Squad name')
    .option('-c, --category <category>', 'Category')
    .action(async (tournamentId, squadId, options) => {
      try {
        const { client } = await getApiClient();

        const body: Record<string, unknown> = {};
        if (options.name) body.name = options.name;
        if (options.category) body.category = options.category;

        const squad = await client.put<Squad>(`/api/tournaments/${tournamentId}/squads/${squadId}`, body);

        success(`Updated squad "${squad.name}"`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update squad';
        error(message);
        process.exit(1);
      }
    });

  squadCmd
    .command('delete <tournament-id> <squad-id>')
    .description('Delete a squad')
    .action(async (tournamentId, squadId) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/tournaments/${tournamentId}/squads/${squadId}`);

        success(`Deleted squad ${squadId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete squad';
        error(message);
        process.exit(1);
      }
    });

  // Player management
  squadCmd
    .command('players <tournament-id> <squad-id>')
    .description('List all players in a squad')
    .action(async (tournamentId, squadId) => {
      try {
        const { client } = await getApiClient();
        const squad = await client.get<Squad>(`/api/tournaments/${tournamentId}/squads/${squadId}`);

        if (!squad.players || squad.players.length === 0) {
          info('No players in this squad');
          return;
        }

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(squad.players, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list players';
        error(message);
        process.exit(1);
      }
    });

  squadCmd
    .command('add-player <tournament-id> <squad-id>')
    .description('Add a player to a squad')
    .requiredOption('-n, --name <name>', 'Player name')
    .option('--number <number>', 'Player number')
    .action(async (tournamentId, squadId, options) => {
      try {
        const { client } = await getApiClient();

        const body = {
          name: options.name,
          number: options.number ? parseInt(options.number, 10) : undefined
        };

        const player = await client.post<Player>(`/api/tournaments/${tournamentId}/squads/${squadId}/players`, body);

        success(`Added player "${player.name}"`);
        info(`ID: ${player.id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add player';
        error(message);
        process.exit(1);
      }
    });

  squadCmd
    .command('remove-player <tournament-id> <squad-id> <player-id>')
    .description('Remove a player from a squad')
    .action(async (tournamentId, squadId, playerId) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/tournaments/${tournamentId}/squads/${squadId}/players/${playerId}`);

        success(`Removed player ${playerId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to remove player';
        error(message);
        process.exit(1);
      }
    });

  return squadCmd;
}
