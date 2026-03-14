import { Command } from 'commander';
import { getApiClient, assertOutputFormat } from '../lib/helpers.js';
import { formatOutput } from '../lib/formatters.js';
import { success, error, info } from '../lib/utils.js';
import type { GlobalOptions, Fixture } from '../types/index.js';

function formatFixturesByPitch(fixtures: Fixture[]): string {
  const lines: string[] = [];
  
  // Group fixtures by pitch
  const byPitch = new Map<string, Fixture[]>();
  for (const fixture of fixtures) {
    const pitch = fixture.pitch || 'Unknown';
    if (!byPitch.has(pitch)) {
      byPitch.set(pitch, []);
    }
    byPitch.get(pitch)!.push(fixture);
  }
  
  // Sort pitches
  const sortedPitches = Array.from(byPitch.keys()).sort();
  
  for (const pitch of sortedPitches) {
    lines.push(`\n## Pitch: ${pitch}\n`);
    
    const pitchFixtures = byPitch.get(pitch)!.sort((a, b) => {
      return (a.time || '').localeCompare(b.time || '');
    });
    
    // Define columns (without pitch)
    const headers = ['Time', 'Category', 'Match', 'Team 1', 'Team 2', 'Umpires', 'Status'];
    
    // Calculate column widths
    const widths: number[] = headers.map((h, i) => {
      const maxDataWidth = Math.max(...pitchFixtures.map(f => {
        const values = [
          f.time || '-',
          f.category || '-',
          f.match || '-',
          f.team1 || '-',
          f.team2 || '-',
          f.umpires || '-',
          f.status || '-'
        ];
        return String(values[i]).length;
      }));
      return Math.max(h.length, maxDataWidth);
    });
    
    // Header row
    const headerRow = headers.map((h, i) => h.toUpperCase().padEnd(widths[i])).join('  ');
    lines.push(headerRow);
    
    // Separator
    lines.push(headers.map((_, i) => '-'.repeat(widths[i])).join('  '));
    
    // Data rows
    for (const fixture of pitchFixtures) {
      const row = [
        fixture.time || '-',
        fixture.category || '-',
        fixture.match || '-',
        fixture.team1 || '-',
        fixture.team2 || '-',
        fixture.umpires || '-',
        fixture.status || '-'
      ].map((val, i) => String(val).padEnd(widths[i])).join('  ');
      lines.push(row);
    }
  }
  
  return lines.join('\n');
}

function formatFixturesByCategory(fixtures: Fixture[]): string {
  const lines: string[] = [];
  
  // Group fixtures by category
  const byCategory = new Map<string, Fixture[]>();
  for (const fixture of fixtures) {
    const category = fixture.category || 'Uncategorized';
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(fixture);
  }
  
  // Sort categories
  const sortedCategories = Array.from(byCategory.keys()).sort();
  
  for (const category of sortedCategories) {
    lines.push(`\n## Category: ${category}\n`);
    
    const categoryFixtures = byCategory.get(category)!.sort((a, b) => {
      // Sort by pitch first, then time
      const pitchCompare = (a.pitch || '').localeCompare(b.pitch || '');
      if (pitchCompare !== 0) return pitchCompare;
      return (a.time || '').localeCompare(b.time || '');
    });
    
    // Define columns
    const headers = ['Time', 'Pitch', 'Match', 'Team 1', 'Team 2', 'Umpires', 'Status'];
    
    // Calculate column widths
    const widths: number[] = headers.map((h, i) => {
      const maxDataWidth = Math.max(...categoryFixtures.map(f => {
        const values = [
          f.time || '-',
          f.pitch || '-',
          f.match || '-',
          f.team1 || '-',
          f.team2 || '-',
          f.umpires || '-',
          f.status || '-'
        ];
        return String(values[i]).length;
      }));
      return Math.max(h.length, maxDataWidth);
    });
    
    // Header row
    const headerRow = headers.map((h, i) => h.toUpperCase().padEnd(widths[i])).join('  ');
    lines.push(headerRow);
    
    // Separator
    lines.push(headers.map((_, i) => '-'.repeat(widths[i])).join('  '));
    
    // Data rows
    for (const fixture of categoryFixtures) {
      const row = [
        fixture.time || '-',
        fixture.pitch || '-',
        fixture.match || '-',
        fixture.team1 || '-',
        fixture.team2 || '-',
        fixture.umpires || '-',
        fixture.status || '-'
      ].map((val, i) => String(val).padEnd(widths[i])).join('  ');
      lines.push(row);
    }
  }
  
  return lines.join('\n');
}

function formatFixturesNext(fixtures: Fixture[]): string {
  const lines: string[] = [];
  
  // Filter to pending or live fixtures
  const relevantFixtures = fixtures.filter(f => {
    return f.status === 'pending' || f.status === 'live';
  });
  
  if (relevantFixtures.length === 0) {
    return 'No upcoming or live fixtures found.';
  }
  
  // Sort by time
  relevantFixtures.sort((a, b) => {
    return (a.time || '').localeCompare(b.time || '');
  });
  
  // Define columns
  const headers = ['Time', 'Pitch', 'Category', 'Match', 'Team 1', 'Team 2', 'Umpires', 'Status'];
  
  // Calculate column widths
  const widths: number[] = headers.map((h, i) => {
    const maxDataWidth = Math.max(...relevantFixtures.map(f => {
      const values = [
        f.time || '-',
        f.pitch || '-',
        f.category || '-',
        f.match || '-',
        f.team1 || '-',
        f.team2 || '-',
        f.umpires || '-',
        f.status || '-'
      ];
      return String(values[i]).length;
    }));
    return Math.max(h.length, maxDataWidth);
  });
  
  // Header row
  const headerRow = headers.map((h, i) => h.toUpperCase().padEnd(widths[i])).join('  ');
  lines.push(headerRow);
  
  // Separator
  lines.push(headers.map((_, i) => '-'.repeat(widths[i])).join('  '));
  
  // Data rows
  for (const fixture of relevantFixtures) {
    const row = [
      fixture.time || '-',
      fixture.pitch || '-',
      fixture.category || '-',
      fixture.match || '-',
      fixture.team1 || '-',
      fixture.team2 || '-',
      fixture.umpires || '-',
      fixture.status || '-'
    ].map((val, i) => String(val).padEnd(widths[i])).join('  ');
    lines.push(row);
  }
  
  return lines.join('\n');
}

export function createFixtureCommands(): Command {
  const fixtureCmd = new Command('fixture')
    .alias('f')
    .description('Fixture and match management commands');

  fixtureCmd
    .command('list <tournament-id>')
    .description('List all fixtures in a tournament')
    .option('-p, --pitch <pitch>', 'Filter by pitch')
    .option('-c, --category <category>', 'Filter by category')
    .option('-r, --report <type>', 'Report type: by-pitch, by-category, next')
    .action(async (tournamentId, options) => {
      try {
        const { client } = await getApiClient();
        
        let path = `/api/tournaments/${tournamentId}/fixtures`;
        const params = new URLSearchParams();
        if (options.pitch) params.append('pitch', options.pitch);
        if (options.category) params.append('category', options.category);
        if (params.toString()) {
          path += `?${params.toString()}`;
        }
        
        const fixtures = await client.get<Fixture[]>(path);

        if (fixtures.length === 0) {
          info('No fixtures found in this tournament');
          return;
        }

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        const format = assertOutputFormat(opts.format);
        
        // Use report formatting for table output
        if (format === 'table' && options.report) {
          let output: string;
          switch (options.report) {
            case 'by-pitch':
              output = formatFixturesByPitch(fixtures);
              break;
            case 'by-category':
              output = formatFixturesByCategory(fixtures);
              break;
            case 'next':
              output = formatFixturesNext(fixtures);
              break;
            default:
              error(`Unknown report type: ${options.report}. Use 'by-pitch', 'by-category', or 'next'.`);
              process.exit(1);
          }
          console.log(output);
        } else {
          console.log(formatOutput(fixtures, { format }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list fixtures';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('get <tournament-id> <fixture-id>')
    .description('Get fixture details')
    .action(async (tournamentId, fixtureId) => {
      try {
        const { client } = await getApiClient();
        const fixture = await client.get<Fixture>(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(fixture, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to get fixture';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('generate <tournament-id>')
    .description('Generate fixtures from TSV file')
    .requiredOption('-f, --file <file>', 'TSV file path')
    .action(async (tournamentId, options) => {
      try {
        const { client } = await getApiClient();
        
        // Read file and convert to fixtures array
        const fs = await import('fs');
        const content = fs.readFileSync(options.file, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        // Parse TSV - assuming header row
        const headers = lines[0].split('\t');
        const fixtures = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split('\t');
          const fixture: Record<string, string> = {};
          headers.forEach((header, index) => {
            fixture[header.trim()] = values[index]?.trim() || '';
          });
          fixtures.push(fixture);
        }

        await client.post(`/api/tournaments/${tournamentId}/fixtures`, fixtures);

        success(`Generated ${fixtures.length} fixtures`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate fixtures';
        error(message);
        process.exit(1);
      }
    });

  // Match lifecycle commands
  fixtureCmd
    .command('start <tournament-id> <fixture-id>')
    .description('Start a fixture (make it live)')
    .action(async (tournamentId, fixtureId) => {
      try {
        const { client } = await getApiClient();
        
        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/start`);

        success(`Started fixture ${fixtureId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start fixture';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('score <tournament-id> <fixture-id>')
    .description('Update fixture score')
    .requiredOption('--home-points <points>', 'Home team points')
    .requiredOption('--away-points <points>', 'Away team points')
    .option('--home-goals <goals>', 'Home team goals')
    .option('--away-goals <goals>', 'Away team goals')
    .action(async (tournamentId, fixtureId, options) => {
      try {
        const { client } = await getApiClient();

        // API uses goals1/points1 and goals2/points2 field names
        const body: Record<string, number> = {
          points1: parseInt(options.homePoints, 10),
          points2: parseInt(options.awayPoints, 10)
        };
        
        if (options.homeGoals) body.goals1 = parseInt(options.homeGoals, 10);
        if (options.awayGoals) body.goals2 = parseInt(options.awayGoals, 10);

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/score`, body);

        success(`Updated score for fixture ${fixtureId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update score';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('end <tournament-id> <fixture-id>')
    .description('End a fixture')
    .action(async (tournamentId, fixtureId) => {
      try {
        const { client } = await getApiClient();
        
        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/end`);

        success(`Ended fixture ${fixtureId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to end fixture';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('reschedule <tournament-id> <fixture-id>')
    .description('Reschedule a fixture')
    .option('-t, --time <time>', 'New time (HH:MM)')
    .option('-p, --pitch <pitch>', 'New pitch')
    .action(async (tournamentId, fixtureId, options) => {
      try {
        const { client } = await getApiClient();

        const body: Record<string, unknown> = {};
        if (options.time) body.time = options.time;
        if (options.pitch) body.pitch = options.pitch;

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/reschedule`, body);

        success(`Rescheduled fixture ${fixtureId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reschedule fixture';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('rewind <tournament-id> <fixture-id>')
    .description('Rewind a fixture (undo end)')
    .action(async (tournamentId, fixtureId) => {
      try {
        const { client } = await getApiClient();
        await client.put(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/rewind`);

        success(`Rewound fixture ${fixtureId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to rewind fixture';
        error(message);
        process.exit(1);
      }
    });

  // Card commands
  fixtureCmd
    .command('cards <tournament-id> <fixture-id>')
    .description('List all cards in a fixture')
    .action(async (tournamentId, fixtureId) => {
      try {
        const { client } = await getApiClient();
        const cards = await client.get(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/cards`);

        const opts = (global as unknown as { ppOpts: GlobalOptions }).ppOpts;
        console.log(formatOutput(cards, { format: assertOutputFormat(opts.format) }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to list cards';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('card <tournament-id> <fixture-id>')
    .description('Issue a card to a player')
    .requiredOption('-p, --player <name>', 'Player name')
    .requiredOption('-c, --color <color>', 'Card color (yellow, red, black)')
    .option('-r, --reason <reason>', 'Reason for card')
    .action(async (tournamentId, fixtureId, options) => {
      try {
        const { client } = await getApiClient();

        const body = {
          playerName: options.player,
          color: options.color,
          reason: options.reason || 'Unsporting behavior'
        };

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/cards`, body);

        success(`Issued ${options.color} card to ${options.player}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to issue card';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('delete-card <tournament-id> <fixture-id> <card-id>')
    .description('Delete a card from a fixture')
    .action(async (tournamentId, fixtureId, cardId) => {
      try {
        const { client } = await getApiClient();
        await client.delete(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/cards/${cardId}`);

        success(`Deleted card ${cardId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete card';
        error(message);
        process.exit(1);
      }
    });

  return fixtureCmd;
}
