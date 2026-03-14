#!/usr/bin/env node

import { Command } from 'commander';
import { createAuthCommands } from './commands/auth.js';
import { createTournamentCommands } from './commands/tournament.js';
import { createSquadCommands } from './commands/squad.js';
import { createFixtureCommands } from './commands/fixture.js';
import { createChampionshipCommands, createSeriesCommands } from './commands/championship.js';
import { createClubCommands, createTeamCommands } from './commands/club.js';
import type { GlobalOptions } from './types/index.js';

const program = new Command();

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
    (global as unknown as { ppOpts: GlobalOptions }).ppOpts = opts;
  });

// Add command modules
program.addCommand(createAuthCommands());
program.addCommand(createTournamentCommands());
program.addCommand(createSquadCommands());
program.addCommand(createFixtureCommands());
program.addCommand(createChampionshipCommands());
program.addCommand(createSeriesCommands());
program.addCommand(createClubCommands());
program.addCommand(createTeamCommands());

// Parse command line arguments
program.parse();

// Export for testing
export { program };
