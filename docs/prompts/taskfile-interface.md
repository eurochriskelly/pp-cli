I'd like to introduce Taskfile to this repo. Right now when I type 'npm run dev' i get:


    > pp-cli@1.0.0 dev
    > tsx src/index.ts

    Usage: ppx [options] [command]

    PitchPerfect Tournament Management CLI

    Options:
      -V, --version          output the version number
      -p, --profile <name>   Use specific config profile (default: "default")
      -f, --format <format>  Output format (table, json, yaml, csv) (default: "table")
      -u, --api-url <url>    Override API URL
      -v, --verbose          Enable verbose output
      -h, --help             display help for command

    Commands:
      auth                   Authentication commands
      tournament|t           Tournament management commands
      squad|s                Squad management commands
      fixture|f              Fixture and match management commands
      championship|c         Championship management commands
      series|sr              Series management commands
      club|cl                Club management commands
      team|tm                Team management commands
      system                 Inspect API capabilities and runtime mode
      doctor                 Check API reachability, runtime mode, and CLI/API contract compatibility
      help [command]         display help for command

I'd like `task ppx` by itself to run the command, with arguments passed after `--`, so `task ppx -- auth` runs `ppx auth`.

On top of that 'task --list' to list top level build and install commands and the like
