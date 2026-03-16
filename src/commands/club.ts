import { Command } from 'commander';
import { getApiClient, assertOutputFormat } from '../lib/helpers.js';
import { formatOutput } from '../lib/formatters.js';
import { success, error, info } from '../lib/utils.js';
import type { GlobalOptions, Club, Team } from '../types/index.js';

// Format teams list with custom column selection and ordering
function formatTeamsList(teams: Team[]): string {
  if (teams.length === 0) {
    return 'No teams found';
  }

  // Define columns: ID, NAME, COMPETITION, CLUBS
  const headers = ['ID', 'NAME', 'COMPETITION', 'CLUBS'];
  
  // Calculate column widths
  const widths: number[] = headers.map(h => h.length);
  
  const rows = teams.map(t => {
    const tObj = t as unknown as Record<string, unknown>;
    
    // Format contributing clubs
    let clubsStr = '-';
    const contributingClubs = tObj.contributingClubs || tObj.ContributingClubs;
    if (Array.isArray(contributingClubs) && contributingClubs.length > 0) {
      // Try to extract club names or IDs
      const clubNames = contributingClubs.map((club: unknown) => {
        if (typeof club === 'object' && club !== null) {
          const clubObj = club as Record<string, unknown>;
          return String(clubObj.name || clubObj.Name || clubObj.id || clubObj.Id || '?');
        }
        return String(club);
      });
      clubsStr = clubNames.join(', ');
    }
    
    const row = [
      String(tObj.id || tObj.Id || '-'),
      String(tObj.name || tObj.Name || '-'),
      String(tObj.competition || tObj.Competition || '-'),
      clubsStr
    ];
    
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i], cell.length);
    });
    
    return row;
  });
  
  // Build output
  const lines: string[] = [];
  
  // Header row
  const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join('  ');
  lines.push(headerRow);
  
  // Separator line
  const separator = headers.map((_, i) => '-'.repeat(widths[i])).join('  ');
  lines.push(separator);
  
  // Data rows
  for (const row of rows) {
    const line = row.map((cell, i) => cell.padEnd(widths[i])).join('  ');
    lines.push(line);
  }
  
  return lines.join('\n');
}

export function createClubCommands(): Command {
  const clubCmd = new Command('club')
    .alias('cl')
    .description('Club management commands');

  clubCmd
    .command('list')
    .description('List all clubs')
    .option('-r, --region <region>', 'Filter by region')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        let path = '/api/clubs';
        if (options.region) {
          path += `?region=${encodeURIComponent(options.region)}`;
        }

        const clubs = await client.get<Club[]>(path);

        if (clubs.length === 0) {
          info('No clubs found');
          return;
        }

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(clubs, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list clubs';
        error(message);
        process.exit(1);
      }
    });

  clubCmd
    .command('get <id>')
    .description('Get club details')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        const club = await client.get<Club>(`/api/clubs/${id}`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(club, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get club';
        error(message);
        process.exit(1);
      }
    });

  clubCmd
    .command('create')
    .description('Create a new club')
    .requiredOption('-n, --name <name>', 'Club name')
    .requiredOption('-r, --region <region>', 'Region')
    .option('--logo <path>', 'Path to logo file')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        const body = {
          name: options.name,
          region: options.region
        };

        const club = await client.post<Club>('/api/clubs', body);

        success(`Created club "${club.name}"`);
        info(`ID: ${club.id}`);

        // Upload logo if provided
        if (options.logo) {
          const fs = await import('fs');
          const logoData = fs.readFileSync(options.logo);
          
          await client.post(`/api/clubs/${club.id}/logo`, logoData, {
            headers: {
              'Content-Type': 'application/octet-stream'
            }
          });
          
          info('Logo uploaded successfully');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create club';
        error(message);
        process.exit(1);
      }
    });

  clubCmd
    .command('update <id>')
    .description('Update a club')
    .option('-n, --name <name>', 'Club name')
    .option('-r, --region <region>', 'Region')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();

        const body: Record<string, unknown> = {};
        if (options.name) body.name = options.name;
        if (options.region) body.region = options.region;

        await client.put<Club>(`/api/clubs/${id}`, body);

        success(`Updated club ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update club';
        error(message);
        process.exit(1);
      }
    });

  clubCmd
    .command('delete <id>')
    .description('Delete a club')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/clubs/${id}`);

        success(`Deleted club ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete club';
        error(message);
        process.exit(1);
      }
    });

  return clubCmd;
}

export function createTeamCommands(): Command {
  const teamCmd = new Command('team')
    .alias('tm')
    .description('Team management commands');

  teamCmd
    .command('list <tournament-id>')
    .description('List all teams in a tournament')
    .option('-c, --club <club-id>', 'Filter by club')
    .action(async (tournamentId, options) => {
      try {
        const { client } = await getApiClient();

        let path = `/api/tournaments/${tournamentId}/teams`;
        if (options.club) {
          path += `?clubId=${options.club}`;
        }

        const teams = await client.get<Team[]>(path);

        if (teams.length === 0) {
          info('No teams found');
          return;
        }

        console.log(formatTeamsList(teams));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list teams';
        error(message);
        process.exit(1);
      }
    });

  teamCmd
    .command('get <id>')
    .description('Get team details')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        const team = await client.get<Team>(`/api/teams/${id}`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(team, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get team';
        error(message);
        process.exit(1);
      }
    });

  teamCmd
    .command('create')
    .description('Create a new team')
    .requiredOption('-n, --name <name>', 'Team name')
    .requiredOption('-c, --club-id <id>', 'Club ID')
    .option('--logo <path>', 'Path to logo file')
    .action(async (options) => {
      try {
        const { client } = await getApiClient();

        const body = {
          name: options.name,
          clubId: parseInt(options.clubId, 10)
        };

        const team = await client.post<Team>('/api/teams', body);

        success(`Created team "${team.name}"`);
        info(`ID: ${team.id}`);

        // Upload logo if provided
        if (options.logo) {
          const fs = await import('fs');
          const logoData = fs.readFileSync(options.logo);
          
          await client.post(`/api/teams/${team.id}/logo`, logoData, {
            headers: {
              'Content-Type': 'application/octet-stream'
            }
          });
          
          info('Logo uploaded successfully');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create team';
        error(message);
        process.exit(1);
      }
    });

  teamCmd
    .command('update <id>')
    .description('Update a team')
    .option('-n, --name <name>', 'Team name')
    .action(async (id, options) => {
      try {
        const { client } = await getApiClient();

        const body: Record<string, unknown> = {};
        if (options.name) body.name = options.name;

        await client.put<Team>(`/api/teams/${id}`, body);

        success(`Updated team ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update team';
        error(message);
        process.exit(1);
      }
    });

  teamCmd
    .command('delete <id>')
    .description('Delete a team')
    .action(async (id) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/teams/${id}`);

        success(`Deleted team ${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete team';
        error(message);
        process.exit(1);
      }
    });

  return teamCmd;
}
