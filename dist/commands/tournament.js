"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTournamentCommands = createTournamentCommands;
const commander_1 = require("commander");
const config_js_1 = require("../lib/config.js");
const helpers_js_1 = require("../lib/helpers.js");
const formatters_js_1 = require("../lib/formatters.js");
const utils_js_1 = require("../lib/utils.js");
const confirmation_codes_js_1 = require("../lib/confirmation-codes.js");
function createTournamentCommands() {
    const tournamentCmd = new commander_1.Command('tournament')
        .alias('t')
        .description('Tournament management commands');
    tournamentCmd
        .command('list')
        .description('List all tournaments')
        .option('-s, --status <status>', 'Filter by status (draft, published, started, closed)')
        .option('-r, --region <region>', 'Filter by region')
        .option('--include-old-closed', 'Include closed/archived tournaments older than 1 month')
        .action(async (options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            let path = '/api/tournaments';
            if (options.status) {
                path = `/api/tournaments/by-status/${options.status}`;
            }
            const response = await client.get(path);
            // Handle both direct array responses and wrapped { data: [...] } responses
            const tournaments = Array.isArray(response)
                ? response
                : (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data))
                    ? response.data
                    : [];
            if (tournaments.length === 0) {
                (0, utils_js_1.info)('No tournaments found');
                return;
            }
            const globalOpts = global.ppOpts;
            const format = globalOpts?.format ?? 'table';
            console.log((0, formatters_js_1.formatTournamentList)(tournaments, {
                format: (0, helpers_js_1.assertOutputFormat)(format),
                includeOldClosed: options.includeOldClosed
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list tournaments';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    tournamentCmd
        .command('get <id>')
        .description('Get tournament details')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const tournament = await client.get(`/api/tournaments/${id}`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(tournament, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get tournament';
            (0, utils_js_1.error)(message);
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
            const { client, session } = await (0, helpers_js_1.getApiClient)();
            const userSession = await (0, config_js_1.getCurrentSession)(session);
            if (!userSession) {
                (0, utils_js_1.error)('You must be logged in to create a tournament');
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
            const tournament = await client.post('/api/tournaments', body);
            // Handle both API naming conventions (Title/title, Date/date)
            const title = tournament.Title || tournament.title;
            const date = tournament.Date || tournament.date;
            const location = tournament.Location || tournament.location;
            (0, utils_js_1.success)(`Created tournament "${title}"`);
            (0, utils_js_1.info)(`ID: ${tournament.id}`);
            (0, utils_js_1.info)(`Date: ${date}`);
            (0, utils_js_1.info)(`Location: ${location}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create tournament';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {};
            if (options.name)
                body.title = options.name;
            if (options.date)
                body.date = options.date;
            if (options.location)
                body.location = options.location;
            if (options.region)
                body.region = options.region;
            if (options.codeOrganizer)
                body.codeOrganizer = options.codeOrganizer;
            if (options.lat)
                body.lat = parseFloat(options.lat);
            if (options.lon)
                body.lon = parseFloat(options.lon);
            if (options.winPoints)
                body.winPoints = parseInt(options.winPoints, 10);
            if (options.drawPoints)
                body.drawPoints = parseInt(options.drawPoints, 10);
            if (options.lossPoints)
                body.lossPoints = parseInt(options.lossPoints, 10);
            const tournament = await client.put(`/api/tournaments/${id}`, body);
            (0, utils_js_1.success)(`Updated tournament "${tournament.title}"`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update tournament';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    tournamentCmd
        .command('delete <ids>')
        .description('Delete tournament(s) with confirmation (accepts single ID or comma-separated list)')
        .option('--confirmation-code <code>', 'Confirmation code from preview phase')
        .action(async (ids, options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            // Parse IDs (support both single ID and comma-separated list)
            const idList = ids.split(',').map((id) => id.trim()).filter(Boolean);
            if (idList.length === 0) {
                (0, utils_js_1.error)('No valid tournament IDs provided');
                process.exit(1);
            }
            // Check if this is a confirmation phase
            if (options.confirmationCode) {
                // Phase 2: Execute deletion with confirmation code
                // Verify confirmation code for all tournaments (sequential)
                for (const id of idList) {
                    const isValid = await (0, confirmation_codes_js_1.verifyConfirmationCode)(id, options.confirmationCode);
                    if (!isValid) {
                        (0, utils_js_1.error)('Invalid or expired confirmation code. Please run without --confirmation-code to generate a new one.');
                        process.exit(1);
                    }
                }
                // Execute deletion for all tournaments (sequential)
                const deleteResults = [];
                for (const id of idList) {
                    try {
                        await client.delete(`/api/tournaments/${id}`);
                        deleteResults.push({ id, status: 'fulfilled' });
                    }
                    catch (err) {
                        deleteResults.push({ id, status: 'rejected', reason: err });
                    }
                }
                // Clear all confirmation codes (sequential)
                for (const id of idList) {
                    await (0, confirmation_codes_js_1.clearConfirmationCode)(id);
                }
                // Report results
                const successful = [];
                const failed = [];
                deleteResults.forEach((result, index) => {
                    const id = idList[index];
                    if (result.status === 'fulfilled') {
                        successful.push(id);
                    }
                    else {
                        const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
                        failed.push({ id, reason });
                    }
                });
                if (successful.length > 0) {
                    (0, utils_js_1.success)(`Deleted ${successful.length} tournament(s): ${successful.join(', ')}`);
                }
                if (failed.length > 0) {
                    failed.forEach(({ id, reason }) => {
                        (0, utils_js_1.error)(`Failed to delete tournament ${id}: ${reason}`);
                    });
                    process.exit(1);
                }
                return;
            }
            // Phase 1: Show deletion preview and generate confirmation code for all tournaments
            const tournamentPreviews = [];
            for (const id of idList) {
                try {
                    const tournament = await client.get(`/api/tournaments/${id}`);
                    const fixtures = await client.get(`/api/tournaments/${id}/fixtures`).catch(() => []);
                    const squads = await client.get(`/api/tournaments/${id}/squads`).catch(() => []);
                    // Count players
                    const playerCount = squads.reduce((total, squad) => {
                        return total + (squad.players?.length || 0);
                    }, 0);
                    // Count cards across all fixtures
                    let cardCount = 0;
                    for (const fixture of fixtures) {
                        try {
                            const cards = await client.get(`/api/tournaments/${id}/fixtures/${fixture.id}/cards`);
                            cardCount += cards.length;
                        }
                        catch {
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
                }
                catch (err) {
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
                    (0, utils_js_1.error)(`Failed to fetch tournament ${p.id}: ${p.error}`);
                });
                if (fetchErrors.length === idList.length) {
                    process.exit(1);
                }
            }
            // Generate a single confirmation code for all tournaments
            const confirmationCode = (0, confirmation_codes_js_1.generateConfirmationCode)();
            // Store the same code for all tournaments
            for (const id of idList) {
                await (0, confirmation_codes_js_1.storeConfirmationCode)(id, confirmationCode);
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
                const t = preview.tournament;
                const title = t.Title || t.title || 'N/A';
                const date = t.Date || t.date || 'N/A';
                const location = t.Location || t.location || 'N/A';
                console.log(`  ${index + 1}. ${title}`);
                console.log(`     Date:      ${date}`);
                console.log(`     Location:  ${location}`);
                console.log(`     Region:    ${preview.tournament.region}`);
                console.log(`     Status:    ${preview.tournament.status}`);
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
            (0, utils_js_1.info)('No data has been deleted yet. Review the information above before proceeding.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete tournament';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    // Tournament Lifecycle Commands
    tournamentCmd
        .command('publish <id>')
        .description('Publish a tournament')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.put(`/api/tournaments/${id}/status/published`);
            (0, utils_js_1.success)(`Published tournament ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to publish tournament';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    tournamentCmd
        .command('start <id>')
        .description('Start a tournament (make it live)')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.put(`/api/tournaments/${id}/status/started`);
            (0, utils_js_1.success)(`Started tournament ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start tournament';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    tournamentCmd
        .command('close <id>')
        .description('Close a tournament')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.put(`/api/tournaments/${id}/status/closed`);
            (0, utils_js_1.success)(`Closed tournament ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to close tournament';
            (0, utils_js_1.error)(message);
            // Show additional error details if available
            if (err && typeof err === 'object' && 'details' in err) {
                const details = err.details;
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.post(`/api/tournaments/${id}/reset`);
            (0, utils_js_1.success)(`Reset tournament ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to reset tournament';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    tournamentCmd
        .command('overview <id>')
        .description('Get tournament overview')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const overview = await client.get(`/api/tournaments/${id}/overview`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(overview, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get tournament overview';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    tournamentCmd
        .command('standings <id> [divisionGroup]')
        .description('Get tournament group standings')
        .option('-g, --group <group>', 'Group number')
        .action(async (id, divisionGroup, options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            let path = `/api/tournaments/${id}/group-standings`;
            if (options.group) {
                // The API might support filtering by group
                path = `/api/tournaments/${id}/group-standings?group=${options.group}`;
            }
            const standings = await client.get(path);
            // Parse division/group filter if provided (e.g., "HURLING/1" or "MENS_SENIOR/Gp.1")
            let divisionFilter;
            let groupFilter;
            if (divisionGroup) {
                const parts = divisionGroup.split('/');
                if (parts.length === 2) {
                    divisionFilter = parts[0];
                    // Normalize group number (remove "Gp." prefix if present)
                    groupFilter = parts[1].replace(/^Gp\.?/i, '');
                }
            }
            const opts = global.ppOpts;
            const format = (0, helpers_js_1.assertOutputFormat)(opts.format);
            // Use custom formatter for table view, standard formatter for others
            if (format === 'table') {
                if (divisionFilter && groupFilter) {
                    // Show detailed view with standings + matches
                    const output = await (0, formatters_js_1.formatStandingsWithMatches)(standings, id, divisionFilter, groupFilter, client);
                    console.log(output);
                }
                else {
                    console.log((0, formatters_js_1.formatStandings)(standings));
                }
            }
            else {
                console.log((0, formatters_js_1.formatOutput)(standings, { format }));
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get standings';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    tournamentCmd
        .command('brackets <id>')
        .description('Get tournament knockout brackets')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const brackets = await client.get(`/api/tournaments/${id}/knockout-fixtures`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(brackets, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get brackets';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    return tournamentCmd;
}
//# sourceMappingURL=tournament.js.map