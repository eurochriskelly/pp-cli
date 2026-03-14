#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const auth_js_1 = require("./commands/auth.js");
const tournament_js_1 = require("./commands/tournament.js");
const squad_js_1 = require("./commands/squad.js");
const fixture_js_1 = require("./commands/fixture.js");
const championship_js_1 = require("./commands/championship.js");
const club_js_1 = require("./commands/club.js");
const program = new commander_1.Command();
exports.program = program;
program
    .name('ppx')
    .description('PitchPerfect Tournament Management CLI')
    .version('1.0.0')
    .option('-p, --profile <name>', 'Use specific config profile', 'default')
    .option('-f, --format <format>', 'Output format (table, json, yaml, csv)', 'table')
    .option('-u, --api-url <url>', 'Override API URL')
    .option('-v, --verbose', 'Enable verbose output')
    .hook('preAction', async (thisCommand) => {
    // Store global options for use in commands
    const opts = thisCommand.opts();
    global.ppOpts = opts;
});
// Add command modules
program.addCommand((0, auth_js_1.createAuthCommands)());
program.addCommand((0, tournament_js_1.createTournamentCommands)());
program.addCommand((0, squad_js_1.createSquadCommands)());
program.addCommand((0, fixture_js_1.createFixtureCommands)());
program.addCommand((0, championship_js_1.createChampionshipCommands)());
program.addCommand((0, championship_js_1.createSeriesCommands)());
program.addCommand((0, club_js_1.createClubCommands)());
program.addCommand((0, club_js_1.createTeamCommands)());
// Parse command line arguments
program.parse();
//# sourceMappingURL=index.js.map