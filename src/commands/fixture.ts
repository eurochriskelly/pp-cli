import { Command } from 'commander';
import { getApiClient, assertOutputFormat } from '../lib/helpers.js';
import { formatOutput } from '../lib/formatters.js';
import { success, error, info } from '../lib/utils.js';
import type { GlobalOptions, Fixture } from '../types/index.js';

// Report formatting functions from lane2
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

// Helper functions from main
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
    .option('-r, --report <type>', 'Report type: by-pitch, by-category, next')
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
        } else if (options.detailed) {
          // Show all columns
          console.log(formatOutput(fixtures, { format }));
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
          
          console.log(formatOutput(compressedFixtures, { format }));
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
        const fixtures: Record<string, string>[] = [];
        
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
    .requiredOption('--home-points <points>', 'Home team points')
    .requiredOption('--away-points <points>', 'Away team points')
    .option('--home-goals <goals>', 'Home team goals')
    .option('--away-goals <goals>', 'Away team goals')
    .action(async (tournamentId, fixtureRef, options) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/score`, {
          homePoints: parseInt(options.homePoints),
          awayPoints: parseInt(options.awayPoints),
          homeGoals: options.homeGoals ? parseInt(options.homeGoals) : undefined,
          awayGoals: options.awayGoals ? parseInt(options.awayGoals) : undefined
        });

        success(`Updated score for fixture ${fixtureRef} (${fixtureId})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update score';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('card <tournament-id> <fixture-id>')
    .description('Issue a card to a player')
    .requiredOption('--team <team>', 'Team number (1 or 2)')
    .requiredOption('--player <player>', 'Player name')
    .requiredOption('--type <type>', 'Card type (yellow, red, black)')
    .option('--reason <reason>', 'Reason for card')
    .action(async (tournamentId, fixtureRef, options) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/cards`, {
          team: parseInt(options.team),
          playerName: options.player,
          cardType: options.type,
          reason: options.reason
        });

        success(`Issued ${options.type} card to ${options.player}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to issue card';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('finish <tournament-id> <fixture-id>')
    .description('Finish a fixture (mark as completed)')
    .action(async (tournamentId, fixtureRef) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/finish`);

        success(`Finished fixture ${fixtureRef} (${fixtureId})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to finish fixture';
        error(message);
        process.exit(1);
      }
    });

  fixtureCmd
    .command('reset <tournament-id> <fixture-id>')
    .description('Reset a fixture to pending state')
    .action(async (tournamentId, fixtureRef) => {
      try {
        const { client } = await getApiClient();
        const fixtureId = await resolveFixtureId(client, tournamentId, fixtureRef);

        await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/reset`);

        success(`Reset fixture ${fixtureRef} (${fixtureId}) to pending state`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reset fixture';
        error(message);
        process.exit(1);
      }
    });

  return fixtureCmd;
}