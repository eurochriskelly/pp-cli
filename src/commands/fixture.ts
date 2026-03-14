import { Command } from 'commander';
import { getApiClient, assertOutputFormat } from '../lib/helpers.js';
import { formatOutput } from '../lib/formatters.js';
import { success, error, info } from '../lib/utils.js';
import type { GlobalOptions, Fixture } from '../types/index.js';

function formatStage(stage: string | undefined, groupNumber: number | undefined): string {
  if (!stage) return '-';

  // Group stage
  if (stage === 'group') {
    return `Gp.${groupNumber ?? 1}`;
  }

  // Elimination stages: bracket_match format
  const parts = stage.split('_');
  if (parts.length !== 2) return stage.toUpperCase();

  const [bracket, match] = parts;
  const bracketUpper = bracket.toUpperCase();

  switch (match) {
    case 'finals':
      return `${bracketUpper}.FIN`;
    case 'semis':
      return `${bracketUpper}.SF${groupNumber ?? ''}`;
    case 'quarters':
      return `${bracketUpper}.QF${groupNumber ?? ''}`;
    case '3rd4th':
      return `${bracketUpper}.3/4`;
    case '4th5th':
      return `${bracketUpper}.4/5`;
    default:
      return `${bracketUpper}.${match.toUpperCase()}`;
  }
}

function abbreviateCategory(category: string | undefined): string {
  if (!category) return '';

  // Split by spaces, underscores, and hyphens
  const words = category.split(/[\s_-]+/);

  return words.map(word => {
    // Extract leading letters and trailing numbers
    const match = word.match(/^([a-zA-Z]+)(\d*)$/);
    if (match) {
      return match[1][0].toUpperCase() + match[2];
    }
    // If word starts with letter, take first letter
    if (word.match(/^[a-zA-Z]/)) {
      return word[0].toUpperCase();
    }
    return word;
  }).join('');
}

async function resolveFixtureId(
  client: { get: <T>(path: string) => Promise<T> },
  tournamentId: string,
  fixtureRef: string
): Promise<string> {
  // If it's a pure number, use it directly
  if (/^\d+$/.test(fixtureRef)) {
    return fixtureRef;
  }

  // Check if it's in abbreviated format (e.g., "D1.01", "MJ.15")
  const match = fixtureRef.match(/^([A-Z]+\d*)\.(\d+)$/i);
  if (!match) {
    // Not in abbreviated format, assume it's a full ID
    return fixtureRef;
  }

  const [_, abbrev, idSuffix] = match;
  const abbrevUpper = abbrev.toUpperCase();

  // Fetch all fixtures and find the matching one
  const fixtures = await client.get<Fixture[]>(`/api/tournaments/${tournamentId}/fixtures`);

  const matchingFixtures = fixtures.filter(f => {
    const fx = f as unknown as Record<string, unknown>;
    const fixtureAbbrev = abbreviateCategory(fx.category as string);
    const fixtureIdSuffix = String(fx.id).slice(-2);
    return fixtureAbbrev === abbrevUpper && fixtureIdSuffix === idSuffix.padStart(2, '0');
  });

  if (matchingFixtures.length === 0) {
    throw new Error(`No fixture found matching "${fixtureRef}" (category abbreviation: ${abbrevUpper}, ID suffix: ${idSuffix})`);
  }

  if (matchingFixtures.length > 1) {
    throw new Error(`Multiple fixtures match "${fixtureRef}". Use full fixture ID.`);
  }

  return String((matchingFixtures[0] as unknown as Record<string, unknown>).id);
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
    .option('-d, --detailed', 'Show all columns')
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
        
        if (options.detailed) {
          // Show all columns
          console.log(formatOutput(fixtures, { format: assertOutputFormat(opts.format) }));
        } else {
          // Compress fixtures for simplified view
          const compressedFixtures = fixtures.map(f => {
            const fx = f as unknown as Record<string, unknown>;

            // Extract last 2 digits of ID and combine with category abbreviation
            const idSuffix = String(fx.id).slice(-2);
            const catAbbrev = abbreviateCategory(fx.category as string);
            const fId = `${catAbbrev}.${idSuffix}`;

            // Format scheduled: DD/MM@HH:MM
            let scheduled = '-';
            if (fx.scheduled) {
              const d = new Date(fx.scheduled as string);
              const dd = String(d.getDate()).padStart(2, '0');
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const hh = String(d.getHours()).padStart(2, '0');
              const min = String(d.getMinutes()).padStart(2, '0');
              scheduled = `${dd}/${mm}@${hh}:${min}`;
            }

            // Format started: HH:MM only
            let started = '-';
            if (fx.started) {
              const d = new Date(fx.started as string);
              const hh = String(d.getHours()).padStart(2, '0');
              const min = String(d.getMinutes()).padStart(2, '0');
              started = `${hh}:${min}`;
            }

            // Calculate duration in minutes from started and ended
            let dur = '-';
            if (fx.started && fx.ended) {
              const start = new Date(fx.started as string).getTime();
              const end = new Date(fx.ended as string).getTime();
              const minutes = Math.round((end - start) / 60000);
              dur = String(minutes);
            }

            // Build score format: X-XX (XX)
            const goals1 = (fx.goals1 as number) ?? 0;
            const points1 = (fx.points1 as number) ?? 0;
            const total1 = goals1 * 3 + points1;
            const score1 = `${goals1}-${String(points1).padStart(2, '0')} (${String(total1).padStart(2, '0')})`;

            const goals2 = (fx.goals2 as number) ?? 0;
            const points2 = (fx.points2 as number) ?? 0;
            const total2 = goals2 * 3 + points2;
            const score2 = `${goals2}-${String(points2).padStart(2, '0')} (${String(total2).padStart(2, '0')})`;

            const numCards = Array.isArray(fx.cards) ? fx.cards.length : 0;

            // Format stage
            const stage = formatStage(fx.stage as string, fx.groupNumber as number);

            // Truncate names to max 20 chars
            const truncate = (name: unknown): string => {
              const str = String(name ?? '');
              return str.length > 20 ? str.slice(0, 20) : str;
            };

            return {
              'F-ID': fId,
              'STAGE': stage,
              'PITCH': fx.pitch,
              'SCHEDULED': scheduled,
              'STARTED': started,
              'DUR': dur,
              'TEAM1': truncate(fx.team1Id),
              'SCORE1': score1,
              'TEAM2': truncate(fx.team2Id),
              'SCORE2': score2,
              'UMPIRE': truncate(fx.umpireTeamId),
              'OUTCOME': fx.outcome,
              'CARDS': numCards
            };
          });
          
          console.log(formatOutput(compressedFixtures, { 
            format: assertOutputFormat(opts.format)
          }));
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
    .action(async (tournamentId, fixtureRef) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);
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
    .action(async (tournamentId, fixtureRef) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);
        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/start`);

        success(`Started fixture ${fixtureRef} (${fixtureId})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start fixture';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('score <tournament-id> <fixture-id>')
    .description('Update fixture score')
    .requiredOption('--home <score>', 'Home team score')
    .requiredOption('--away <score>', 'Away team score')
    .option('--home-goals <goals>', 'Home team goals')
    .option('--away-goals <goals>', 'Away team goals')
    .action(async (tournamentId, fixtureRef, options) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);

        const body = {
          homeScore: parseInt(options.home, 10),
          awayScore: parseInt(options.away, 10),
          homeGoals: options.homeGoals ? parseInt(options.homeGoals, 10) : undefined,
          awayGoals: options.awayGoals ? parseInt(options.awayGoals, 10) : undefined
        };

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/score`, body);

        success(`Updated score for fixture ${fixtureRef} (${fixtureId})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update score';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('end <tournament-id> <fixture-id>')
    .description('End a fixture')
    .action(async (tournamentId, fixtureRef) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);
        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/end`);

        success(`Ended fixture ${fixtureRef} (${fixtureId})`);
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
    .action(async (tournamentId, fixtureRef, options) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);

        const body: Record<string, unknown> = {};
        if (options.time) body.time = options.time;
        if (options.pitch) body.pitch = options.pitch;

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/reschedule`, body);

        success(`Rescheduled fixture ${fixtureRef} (${fixtureId})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reschedule fixture';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('rewind <tournament-id> <fixture-id>')
    .description('Rewind a fixture (undo end)')
    .action(async (tournamentId, fixtureRef) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);
        await client.put(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/rewind`);

        success(`Rewound fixture ${fixtureRef} (${fixtureId})`);
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
    .action(async (tournamentId, fixtureRef) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);
        const cards = await client.get(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/carded-players`);

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
    .action(async (tournamentId, fixtureRef, options) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);

        const body = {
          playerName: options.player,
          color: options.color,
          reason: options.reason
        };

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/carded`, body);

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
    .action(async (tournamentId, fixtureRef, cardId) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);
        await client.delete(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/carded/${cardId}`);

        success(`Deleted card ${cardId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete card';
        error(message);
        process.exit(1);
      }
    });

  return fixtureCmd;
}
