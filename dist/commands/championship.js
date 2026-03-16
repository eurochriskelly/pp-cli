"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChampionshipCommands = createChampionshipCommands;
exports.createSeriesCommands = createSeriesCommands;
const commander_1 = require("commander");
const helpers_js_1 = require("../lib/helpers.js");
const formatters_js_1 = require("../lib/formatters.js");
const utils_js_1 = require("../lib/utils.js");
function createChampionshipCommands() {
    const championshipCmd = new commander_1.Command('championship')
        .alias('c')
        .description('Championship management commands');
    championshipCmd
        .command('list')
        .description('List all championships')
        .option('-s, --series <series-id>', 'Filter by series')
        .option('-y, --year <year>', 'Filter by year')
        .action(async (options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            let path = '/api/championships';
            const params = new URLSearchParams();
            if (options.series)
                params.append('seriesId', options.series);
            if (options.year)
                params.append('year', options.year);
            if (params.toString()) {
                path += `?${params.toString()}`;
            }
            const championships = await client.get(path);
            if (championships.length === 0) {
                (0, utils_js_1.info)('No championships found');
                return;
            }
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(championships, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list championships';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    championshipCmd
        .command('get <id>')
        .description('Get championship details')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const championship = await client.get(`/api/championships/${id}`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(championship, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get championship';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {
                seriesId: parseInt(options.seriesId, 10),
                year: parseInt(options.year, 10),
                rounds: parseInt(options.rounds, 10)
            };
            const championship = await client.post('/api/championships', body);
            (0, utils_js_1.success)(`Created championship for year ${championship.year}`);
            (0, utils_js_1.info)(`ID: ${championship.id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create championship';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {};
            if (options.year)
                body.year = parseInt(options.year, 10);
            if (options.rounds)
                body.rounds = parseInt(options.rounds, 10);
            if (options.status)
                body.status = options.status;
            await client.put(`/api/championships/${id}`, body);
            (0, utils_js_1.success)(`Updated championship ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update championship';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    championshipCmd
        .command('delete <id>')
        .description('Delete a championship')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.delete(`/api/championships/${id}`);
            (0, utils_js_1.success)(`Deleted championship ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete championship';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    // Lifecycle commands
    championshipCmd
        .command('open <id>')
        .description('Open championship for registrations')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.post(`/api/championships/${id}/open`);
            (0, utils_js_1.success)(`Opened championship ${id} for registrations`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to open championship';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    championshipCmd
        .command('start <id>')
        .description('Start championship (begin competition)')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.post(`/api/championships/${id}/start`);
            (0, utils_js_1.success)(`Started championship ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start championship';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    championshipCmd
        .command('complete <id>')
        .description('Mark championship as completed')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.post(`/api/championships/${id}/complete`);
            (0, utils_js_1.success)(`Completed championship ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to complete championship';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    championshipCmd
        .command('archive <id>')
        .description('Archive a championship')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.post(`/api/championships/${id}/archive`);
            (0, utils_js_1.success)(`Archived championship ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to archive championship';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    // Entrant management
    championshipCmd
        .command('entrants <id>')
        .description('List all entrants in a championship')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const entrants = await client.get(`/api/championships/${id}/entrants`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(entrants, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list entrants';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {
                clubId: parseInt(options.clubId, 10),
                displayName: options.name
            };
            const entrant = await client.post(`/api/championships/${id}/entrants`, body);
            (0, utils_js_1.success)(`Registered entrant "${entrant.displayName}"`);
            (0, utils_js_1.info)(`ID: ${entrant.id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to register entrant';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const clubIds = options.clubs.split(',').map((id) => parseInt(id.trim(), 10));
            const body = {
                displayName: options.name,
                isAmalgamation: true,
                clubs: clubIds
            };
            const entrant = await client.post(`/api/championships/${id}/entrants`, body);
            (0, utils_js_1.success)(`Registered amalgamation "${entrant.displayName}"`);
            (0, utils_js_1.info)(`ID: ${entrant.id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to register amalgamation';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    championshipCmd
        .command('unregister <id> <entrant-id>')
        .description('Remove an entrant from a championship')
        .action(async (id, entrantId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.delete(`/api/championships/${id}/entrants/${entrantId}`);
            (0, utils_js_1.success)(`Removed entrant ${entrantId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove entrant';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            let path = `/api/championships/${id}/standings`;
            if (options.round) {
                path += `?round=${options.round}`;
            }
            const standings = await client.get(path);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(standings, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get standings';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    return championshipCmd;
}
function createSeriesCommands() {
    const seriesCmd = new commander_1.Command('series')
        .alias('sr')
        .description('Series management commands');
    seriesCmd
        .command('list')
        .description('List all series')
        .option('-s, --sport <sport>', 'Filter by sport')
        .action(async (options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            let path = '/api/series';
            if (options.sport) {
                path += `?sport=${encodeURIComponent(options.sport)}`;
            }
            const [series, championships] = await Promise.all([
                client.get(path),
                client.get('/api/championships')
            ]);
            if (series.length === 0) {
                (0, utils_js_1.info)('No series found');
                return;
            }
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatSeriesList)(series, {
                format: (0, helpers_js_1.assertOutputFormat)(opts.format),
                championships
            }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list series';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    seriesCmd
        .command('get <id>')
        .description('Get series details')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const series = await client.get(`/api/series/${id}`);
            const opts = global.ppOpts;
            const format = (0, helpers_js_1.assertOutputFormat)(opts.format);
            if (format === 'table') {
                // For table format, show series details and championships separately
                console.log((0, formatters_js_1.formatOutput)(series, { format }));
                // Fetch and display championships for this series
                const championships = await client.get('/api/championships');
                const seriesChampionships = championships.filter(c => c.seriesId === parseInt(id, 10));
                if (seriesChampionships.length > 0) {
                    console.log('\nChampionships:');
                    console.log((0, formatters_js_1.formatOutput)(seriesChampionships, { format }));
                }
            }
            else {
                // For other formats, include championships in the output
                const championships = await client.get('/api/championships');
                const seriesChampionships = championships.filter(c => c.seriesId === parseInt(id, 10));
                const output = {
                    ...series,
                    championships: seriesChampionships
                };
                console.log((0, formatters_js_1.formatOutput)(output, { format }));
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get series';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {
                name: options.name
            };
            if (options.sport)
                body.sport = options.sport;
            if (options.squadSize)
                body.squadSize = parseInt(options.squadSize, 10);
            const series = await client.post('/api/series', body);
            (0, utils_js_1.success)(`Created series "${series.name}"`);
            (0, utils_js_1.info)(`ID: ${series.id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create series';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {};
            if (options.name)
                body.name = options.name;
            if (options.sport)
                body.sport = options.sport;
            if (options.squadSize)
                body.squadSize = parseInt(options.squadSize, 10);
            const series = await client.put(`/api/series/${id}`, body);
            (0, utils_js_1.success)(`Updated series "${series.name}"`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update series';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    seriesCmd
        .command('delete <id>')
        .description('Delete a series')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.delete(`/api/series/${id}`);
            (0, utils_js_1.success)(`Deleted series ${id}`);
        }
        catch (err) {
            // Handle authentication errors specially
            if ((0, utils_js_1.isAuthError)(err)) {
                (0, utils_js_1.error)('Authentication required. Your session may have expired. Please run: ppx auth login');
                process.exit(1);
            }
            const message = (0, utils_js_1.getErrorMessage)(err, 'Failed to delete series');
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    return seriesCmd;
}
//# sourceMappingURL=championship.js.map