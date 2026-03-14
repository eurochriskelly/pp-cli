"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFixtureCommands = createFixtureCommands;
const commander_1 = require("commander");
const helpers_js_1 = require("../lib/helpers.js");
const formatters_js_1 = require("../lib/formatters.js");
const utils_js_1 = require("../lib/utils.js");
function formatFixturesByPitch(fixtures) {
    const lines = [];
    // Group fixtures by pitch
    const byPitch = new Map();
    for (const fixture of fixtures) {
        const pitch = fixture.pitch || 'Unknown';
        if (!byPitch.has(pitch)) {
            byPitch.set(pitch, []);
        }
        byPitch.get(pitch).push(fixture);
    }
    // Sort pitches
    const sortedPitches = Array.from(byPitch.keys()).sort();
    for (const pitch of sortedPitches) {
        lines.push(`\n## Pitch: ${pitch}\n`);
        const pitchFixtures = byPitch.get(pitch).sort((a, b) => {
            return (a.time || '').localeCompare(b.time || '');
        });
        // Define columns (without pitch)
        const headers = ['Time', 'Category', 'Match', 'Team 1', 'Team 2', 'Umpires', 'Status'];
        // Calculate column widths
        const widths = headers.map((h, i) => {
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
function formatFixturesByCategory(fixtures) {
    const lines = [];
    // Group fixtures by category
    const byCategory = new Map();
    for (const fixture of fixtures) {
        const category = fixture.category || 'Uncategorized';
        if (!byCategory.has(category)) {
            byCategory.set(category, []);
        }
        byCategory.get(category).push(fixture);
    }
    // Sort categories
    const sortedCategories = Array.from(byCategory.keys()).sort();
    for (const category of sortedCategories) {
        lines.push(`\n## Category: ${category}\n`);
        const categoryFixtures = byCategory.get(category).sort((a, b) => {
            // Sort by pitch first, then time
            const pitchCompare = (a.pitch || '').localeCompare(b.pitch || '');
            if (pitchCompare !== 0)
                return pitchCompare;
            return (a.time || '').localeCompare(b.time || '');
        });
        // Define columns
        const headers = ['Time', 'Pitch', 'Match', 'Team 1', 'Team 2', 'Umpires', 'Status'];
        // Calculate column widths
        const widths = headers.map((h, i) => {
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
function formatFixturesNext(fixtures) {
    const lines = [];
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
    const widths = headers.map((h, i) => {
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
function createFixtureCommands() {
    const fixtureCmd = new commander_1.Command('fixture')
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            let path = `/api/tournaments/${tournamentId}/fixtures`;
            const params = new URLSearchParams();
            if (options.pitch)
                params.append('pitch', options.pitch);
            if (options.category)
                params.append('category', options.category);
            if (params.toString()) {
                path += `?${params.toString()}`;
            }
            const fixtures = await client.get(path);
            if (fixtures.length === 0) {
                (0, utils_js_1.info)('No fixtures found in this tournament');
                return;
            }
            const opts = global.ppOpts;
            const format = (0, helpers_js_1.assertOutputFormat)(opts.format);
            // Use report formatting for table output
            if (format === 'table' && options.report) {
                let output;
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
                        (0, utils_js_1.error)(`Unknown report type: ${options.report}. Use 'by-pitch', 'by-category', or 'next'.`);
                        process.exit(1);
                }
                console.log(output);
            }
            else {
                console.log((0, formatters_js_1.formatOutput)(fixtures, { format }));
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list fixtures';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    fixtureCmd
        .command('get <tournament-id> <fixture-id>')
        .description('Get fixture details')
        .action(async (tournamentId, fixtureId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const fixture = await client.get(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(fixture, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get fixture';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    fixtureCmd
        .command('generate <tournament-id>')
        .description('Generate fixtures from TSV file')
        .requiredOption('-f, --file <file>', 'TSV file path')
        .action(async (tournamentId, options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            // Read file and convert to fixtures array
            const fs = await import('fs');
            const content = fs.readFileSync(options.file, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            // Parse TSV - assuming header row
            const headers = lines[0].split('\t');
            const fixtures = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split('\t');
                const fixture = {};
                headers.forEach((header, index) => {
                    fixture[header.trim()] = values[index]?.trim() || '';
                });
                fixtures.push(fixture);
            }
            await client.post(`/api/tournaments/${tournamentId}/fixtures`, fixtures);
            (0, utils_js_1.success)(`Generated ${fixtures.length} fixtures`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate fixtures';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    // Match lifecycle commands
    fixtureCmd
        .command('start <tournament-id> <fixture-id>')
        .description('Start a fixture (make it live)')
        .action(async (tournamentId, fixtureId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/start`);
            (0, utils_js_1.success)(`Started fixture ${fixtureId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start fixture';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            // API uses goals1/points1 and goals2/points2 field names
            const body = {
                points1: parseInt(options.homePoints, 10),
                points2: parseInt(options.awayPoints, 10)
            };
            if (options.homeGoals)
                body.goals1 = parseInt(options.homeGoals, 10);
            if (options.awayGoals)
                body.goals2 = parseInt(options.awayGoals, 10);
            await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/score`, body);
            (0, utils_js_1.success)(`Updated score for fixture ${fixtureId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update score';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    fixtureCmd
        .command('end <tournament-id> <fixture-id>')
        .description('End a fixture')
        .action(async (tournamentId, fixtureId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/end`);
            (0, utils_js_1.success)(`Ended fixture ${fixtureId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to end fixture';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {};
            if (options.time)
                body.time = options.time;
            if (options.pitch)
                body.pitch = options.pitch;
            await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/reschedule`, body);
            (0, utils_js_1.success)(`Rescheduled fixture ${fixtureId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to reschedule fixture';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    fixtureCmd
        .command('rewind <tournament-id> <fixture-id>')
        .description('Rewind a fixture (undo end)')
        .action(async (tournamentId, fixtureId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.put(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/rewind`);
            (0, utils_js_1.success)(`Rewound fixture ${fixtureId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to rewind fixture';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    // Card commands
    fixtureCmd
        .command('cards <tournament-id> <fixture-id>')
        .description('List all cards in a fixture')
        .action(async (tournamentId, fixtureId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const cards = await client.get(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/cards`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(cards, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list cards';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {
                playerName: options.player,
                color: options.color,
                reason: options.reason || 'Unsporting behavior'
            };
            await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/cards`, body);
            (0, utils_js_1.success)(`Issued ${options.color} card to ${options.player}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to issue card';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    fixtureCmd
        .command('delete-card <tournament-id> <fixture-id> <card-id>')
        .description('Delete a card from a fixture')
        .action(async (tournamentId, fixtureId, cardId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.delete(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}/cards/${cardId}`);
            (0, utils_js_1.success)(`Deleted card ${cardId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete card';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    return fixtureCmd;
}
//# sourceMappingURL=fixture.js.map