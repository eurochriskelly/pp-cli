"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClubCommands = createClubCommands;
exports.createTeamCommands = createTeamCommands;
const commander_1 = require("commander");
const helpers_js_1 = require("../lib/helpers.js");
const formatters_js_1 = require("../lib/formatters.js");
const utils_js_1 = require("../lib/utils.js");
function createClubCommands() {
    const clubCmd = new commander_1.Command('club')
        .alias('cl')
        .description('Club management commands');
    clubCmd
        .command('list')
        .description('List all clubs')
        .option('-r, --region <region>', 'Filter by region')
        .action(async (options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            let path = '/api/clubs';
            if (options.region) {
                path += `?region=${encodeURIComponent(options.region)}`;
            }
            const clubs = await client.get(path);
            if (clubs.length === 0) {
                (0, utils_js_1.info)('No clubs found');
                return;
            }
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(clubs, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list clubs';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    clubCmd
        .command('get <id>')
        .description('Get club details')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const club = await client.get(`/api/clubs/${id}`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(club, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get club';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {
                name: options.name,
                region: options.region
            };
            const club = await client.post('/api/clubs', body);
            (0, utils_js_1.success)(`Created club "${club.name}"`);
            (0, utils_js_1.info)(`ID: ${club.id}`);
            // Upload logo if provided
            if (options.logo) {
                const fs = await import('fs');
                const logoData = fs.readFileSync(options.logo);
                await client.post(`/api/clubs/${club.id}/logo`, logoData, {
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    }
                });
                (0, utils_js_1.info)('Logo uploaded successfully');
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create club';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {};
            if (options.name)
                body.name = options.name;
            if (options.region)
                body.region = options.region;
            await client.put(`/api/clubs/${id}`, body);
            (0, utils_js_1.success)(`Updated club ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update club';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    clubCmd
        .command('delete <id>')
        .description('Delete a club')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.delete(`/api/clubs/${id}`);
            (0, utils_js_1.success)(`Deleted club ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete club';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    return clubCmd;
}
function createTeamCommands() {
    const teamCmd = new commander_1.Command('team')
        .alias('tm')
        .description('Team management commands');
    teamCmd
        .command('list')
        .description('List all teams')
        .option('-c, --club <club-id>', 'Filter by club')
        .action(async (options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            let path = '/api/teams';
            if (options.club) {
                path += `?clubId=${options.club}`;
            }
            const teams = await client.get(path);
            if (teams.length === 0) {
                (0, utils_js_1.info)('No teams found');
                return;
            }
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(teams, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to list teams';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    teamCmd
        .command('get <id>')
        .description('Get team details')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const team = await client.get(`/api/teams/${id}`);
            const opts = global.ppOpts;
            console.log((0, formatters_js_1.formatOutput)(team, { format: (0, helpers_js_1.assertOutputFormat)(opts.format) }));
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to get team';
            (0, utils_js_1.error)(message);
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
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {
                name: options.name,
                clubId: parseInt(options.clubId, 10)
            };
            const team = await client.post('/api/teams', body);
            (0, utils_js_1.success)(`Created team "${team.name}"`);
            (0, utils_js_1.info)(`ID: ${team.id}`);
            // Upload logo if provided
            if (options.logo) {
                const fs = await import('fs');
                const logoData = fs.readFileSync(options.logo);
                await client.post(`/api/teams/${team.id}/logo`, logoData, {
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    }
                });
                (0, utils_js_1.info)('Logo uploaded successfully');
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create team';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    teamCmd
        .command('update <id>')
        .description('Update a team')
        .option('-n, --name <name>', 'Team name')
        .action(async (id, options) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            const body = {};
            if (options.name)
                body.name = options.name;
            await client.put(`/api/teams/${id}`, body);
            (0, utils_js_1.success)(`Updated team ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update team';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    teamCmd
        .command('delete <id>')
        .description('Delete a team')
        .action(async (id) => {
        try {
            const { client } = await (0, helpers_js_1.getApiClient)();
            await client.delete(`/api/teams/${id}`);
            (0, utils_js_1.success)(`Deleted team ${id}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete team';
            (0, utils_js_1.error)(message);
            process.exit(1);
        }
    });
    return teamCmd;
}
//# sourceMappingURL=club.js.map