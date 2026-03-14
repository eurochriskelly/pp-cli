"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSquadCommands = createSquadCommands;
const commander_1 = require("commander");
const helpers_js_1 = require("../lib/helpers.js");
const formatters_js_1 = require("../lib/formatters.js");
const utils_js_1 = require("../lib/utils.js");
function createSquadCommands() {
    const squadCmd = new commander_1.Command('squad')
        .alias('s')
        .description('Squad management commands');
    squadCmd
        .command('list <tournament-id>')
        .description('List all squads in a tournament')
        .action(async (tournamentId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const squads = await client.get(`/api/tournaments/${tournamentId}/squads`);
            if (squads.length === 0) {
                (0, utils_js_1.info)('No squads found in this tournament');
                return;
            }
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(squads, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list squads';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    squadCmd
        .command('get <tournament-id> <squad-id>')
        .description('Get squad details')
        .action(async (tournamentId, squadId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const squad = await client.get(`/api/tournaments/${tournamentId}/squads/${squadId}`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(squad, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get squad';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {
                name: options.name,
                category: options.category,
                clubId: options.clubId ? parseInt(options.clubId, 10) : undefined
            };
            const squad = await client.post(`/api/tournaments/${tournamentId}/squads`, body);
            // Handle API naming conventions - API returns teamName
            const squadData = squad;
            const name = squadData.teamName || squadData.Name || squadData.name || options.name;
            (0, utils_js_1.success)(`Created squad "${name}"`);
            (0, utils_js_1.info)(`ID: ${squad.id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create squad';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {};
            if (options.name)
                body.name = options.name;
            if (options.category)
                body.category = options.category;
            const squad = await client.put(`/api/tournaments/${tournamentId}/squads/${squadId}`, body);
            (0, utils_js_1.success)(`Updated squad "${squad.name}"`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update squad';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    squadCmd
        .command('delete <tournament-id> <squad-id>')
        .description('Delete a squad')
        .action(async (tournamentId, squadId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.delete(`/api/tournaments/${tournamentId}/squads/${squadId}`);
            (0, utils_js_1.success)(`Deleted squad ${squadId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete squad';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    // Player management
    squadCmd
        .command('players <tournament-id> <squad-id>')
        .description('List all players in a squad')
        .action(async (tournamentId, squadId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const squad = await client.get(`/api/tournaments/${tournamentId}/squads/${squadId}`);
            if (!squad.players || squad.players.length === 0) {
                (0, utils_js_1.info)('No players in this squad');
                return;
            }
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(squad.players, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list players';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {
                name: options.name,
                number: options.number ? parseInt(options.number, 10) : undefined
            };
            const player = await client.post(`/api/tournaments/${tournamentId}/squads/${squadId}/players`, body);
            (0, utils_js_1.success)(`Added player "${player.name}"`);
            (0, utils_js_1.info)(`ID: ${player.id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to add player';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    squadCmd
        .command('remove-player <tournament-id> <squad-id> <player-id>')
        .description('Remove a player from a squad')
        .action(async (tournamentId, squadId, playerId) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.delete(`/api/tournaments/${tournamentId}/squads/${squadId}/players/${playerId}`);
            (0, utils_js_1.success)(`Removed player ${playerId}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to remove player';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    return squadCmd;
}
//# sourceMappingURL=squad.js.map