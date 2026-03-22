# PitchPerfect CLI - Quick Reference

## Installation

```bash
npm install -g pp-cli
```

## Configuration

Config stored in `~/.pp-cli/`:
- `config.yaml` - API settings
- `session.json` - Auth tokens

## Authentication

```bash
ppx auth login -e user@example.com -p password
ppx auth logout
ppx auth whoami
```

## Tournament Commands (Priority 1)

```bash
# CRUD
ppx tournament list
ppx tournament get <id>
ppx tournament create -n "Name" -d "2024-06-15" -l "Location"
ppx tournament update <id> -n "New Name"
ppx tournament delete <id>

# Lifecycle
ppx tournament publish <id>
ppx tournament start <id>
ppx tournament close <id>
ppx tournament reset <id>

# Summary
ppx tournament overview <id>
ppx tournament standings <id>
ppx tournament brackets <id>
ppx tournaments load <id> --input-file=./schedule.tsv
ppx tournaments load <id> --input-file=./schedule.tsv --confirmation-code=123456
```

## Squad Commands

```bash
ppx squad list <tournament-id>
ppx squad create <tournament-id> -n "Name" -c "Category"
ppx squad get <tournament-id> <squad-id>
ppx squad delete <tournament-id> <squad-id>

# Players
ppx squad players <tournament-id> <squad-id>
ppx squad add-player <tournament-id> <squad-id> -n "Name" --number 10
ppx squad remove-player <tournament-id> <squad-id> <player-id>
```

## Fixture Commands (Match-Day Operations)

```bash
ppx fixture list <tournament-id>
ppx fixture get <tournament-id> <fixture-id>
ppx fixture generate <tournament-id> -f fixtures.tsv

# Match lifecycle
ppx fixture start <tournament-id> <fixture-id>
ppx fixture score <tournament-id> <fixture-id> --home 12 --away 8
ppx fixture end <tournament-id> <fixture-id>
ppx fixture rewind <tournament-id> <fixture-id>

# Reschedule
ppx fixture reschedule <tournament-id> <fixture-id> -t "14:30" -p "Pitch 2"

# Cards
ppx fixture cards <tournament-id> <fixture-id>
ppx fixture card <tournament-id> <fixture-id> -p "Name" -c yellow
ppx fixture delete-card <tournament-id> <fixture-id> <card-id>
```

## Championship Commands (Priority 3)

```bash
ppx championship list
ppx championship get <id>
ppx championship create -s <series-id> -y 2024 -r 4
ppx championship update <id> --status open
ppx championship delete <id>

# Lifecycle
ppx championship open <id>
ppx championship start <id>
ppx championship complete <id>
ppx championship archive <id>

# Entrants
ppx championship entrants <id>
ppx championship register <id> -c <club-id>
ppx championship register-amalgamation <id> -n "Name" --clubs 1,2,3
ppx championship unregister <id> <entrant-id>

# Standings
ppx championship standings <id>
```

## Series Commands

```bash
ppx series list
ppx series get <id>
ppx series create -n "Name" -s "Sport"
ppx series update <id> --squad-size 20
ppx series delete <id>
```

## Club & Team Commands

```bash
# Clubs
ppx club list
ppx club get <id>
ppx club create -n "Name" -r "Region" --logo ./logo.png
ppx club update <id> -n "New Name"
ppx club delete <id>

# Teams
ppx team list
ppx team list -c <club-id>
ppx team get <id>
ppx team create -n "Name" -c <club-id>
ppx team update <id> -n "New Name"
ppx team delete <id>
```

## Output Formats

```bash
-f table     # Default, human-readable
-f json      # JSON output
-f yaml      # YAML output
-f csv       # CSV for spreadsheets
```

## Global Options

```bash
-p, --profile <name>     # Use profile from config
-u, --api-url <url>      # Override API URL
-v, --verbose            # Debug output
```

## Examples

### Create Complete Tournament

```bash
# 1. Login
ppx auth login -e admin@example.com -p password

# 2. Create tournament
ppx tournament create -n "Summer Blitz" -d "2024-06-15" -l "Dublin"

# 3. Add squads
ppx squad create 1 -n "Team A"
ppx squad create 1 -n "Team B"

# 4. Generate fixtures
ppx fixture generate 1 -f fixtures.tsv

# 5. Publish and start
ppx tournament publish 1
ppx tournament start 1

# 6. Run match
ppx fixture start 1 1
ppx fixture score 1 1 --home 12 --away 8
ppx fixture end 1 1
```

### Export to CSV

```bash
ppx tournament list -f csv > tournaments.csv
ppx fixture list 1 -f csv > fixtures.csv
```

### Filter Results

```bash
ppx tournament list -s started
ppx tournament list -r "Benelux"
ppx fixture list 1 -p "Pitch 1"
ppx club list -r "Dublin"
```

## Testing

```bash
# Run tests
npm run test:unit

# Type check
npm run typecheck

# Build
npm run build
```

## API Integration

The CLI communicates directly with the PitchPerfect REST API at `http://localhost:4001` by default. Configure via:

1. Config file: `~/.pp-cli/config.yaml`
2. Environment variable: `PP_API_URL`
3. Command flag: `--api-url`

## Error Handling

Clear error messages:
- ✗ HTTP 404: Not Found
- ✗ You must be logged in
- ✗ Invalid email format
- ✗ Failed to create tournament: ...

## Aliases

- `tournament` → `t`
- `squad` → `s`
- `fixture` → `f`
- `championship` → `c`
- `series` → `sr`
- `club` → `cl`
- `team` → `tm`

Example: `pp t list` = `ppx tournament list`
