# PitchPerfect CLI (pp-cli)

A comprehensive command-line interface for managing PitchPerfect tournaments, championships, clubs, teams, and match operations.

## Installation

### Global Installation (Recommended)

```bash
npm install -g pp-cli
```

### Local Development

```bash
git clone <repository-url>
cd pp-cli
npm install
npm run build
npm link  # Creates global symlink
```

## Quick Start

```bash
# Login to the API
ppx auth login -e user@example.com -p password

# List all tournaments
ppx tournament list

# Get tournament details
ppx tournament get 1

# Create a new tournament
ppx tournament create -n "Summer Blitz" -d "2024-06-15" -l "Dublin"
```

## Configuration

The CLI stores configuration in `~/.pp-cli/`:

- `config.yaml` - API URLs and default settings
- `session.json` - Authentication tokens

### Default Config (`~/.pp-cli/config.yaml`)

```yaml
default:
  apiUrl: http://localhost:4001
  outputFormat: table
  timeout: 30000

profiles:
  production:
    apiUrl: https://api.pitchperfect.io
  staging:
    apiUrl: https://staging-api.pitchperfect.io
```

### Environment Variables

- `PP_API_URL` - Override the API URL
- `DEBUG` - Enable debug output

## Global Options

All commands support these global options:

```bash
-p, --profile <name>     # Use specific config profile (default: "default")
-f, --format <format>    # Output format: table, json, yaml, csv (default: "table")
-u, --api-url <url>      # Override API URL
-v, --verbose            # Enable verbose output
```

## Commands

### Authentication

```bash
# Login
ppx auth login -e user@example.com -p password

# Logout
ppx auth logout

# Show current user
ppx auth whoami
```

### Tournament Management

```bash
# List tournaments
ppx tournament list
ppx tournament list -s started
ppx tournament list -r "Benelux"

# Get tournament details
ppx tournament get 123

# Create tournament
ppx tournament create \
  -n "Summer Blitz" \
  -d "2024-06-15" \
  -l "Dublin Sports Complex" \
  --region "Leinster" \
  --code-organizer "ORG123"

# Update tournament
ppx tournament update 123 -n "New Name" -d "2024-06-16"

# Delete tournament
ppx tournament delete 123

# Lifecycle operations
ppx tournament publish 123
ppx tournament start 123
ppx tournament close 123
ppx tournament reset 123

# Tournament overview
ppx tournament overview 123
ppx tournament standings 123
ppx tournament brackets 123
```

### Squad Management

```bash
# List squads
ppx squad list 123

# Create squad
ppx squad create 123 -n "St. Mary's A" -c "Senior"

# Squad operations
ppx squad get 123 456
ppx squad update 123 456 -n "New Name"
ppx squad delete 123 456

# Player management
ppx squad players 123 456
ppx squad add-player 123 456 -n "John Smith" --number 10
ppx squad remove-player 123 456 789
```

### Fixture Management

```bash
# List fixtures
ppx fixture list 123
ppx fixture list 123 -p "Pitch 1"

# Get fixture details
ppx fixture get 123 456

# Generate fixtures from TSV
ppx fixture generate 123 -f fixtures.tsv

# Match lifecycle
ppx fixture start 123 456
ppx fixture score 123 456 --home 12 --away 8
ppx fixture end 123 456
ppx fixture rewind 123 456

# Reschedule
ppx fixture reschedule 123 456 -t "14:30" -p "Pitch 2"

# Cards
ppx fixture cards 123 456
ppx fixture card 123 456 -p "John Smith" -c yellow -r "Unsporting behavior"
ppx fixture delete-card 123 456 789
```

### Championship Management

```bash
# List championships
ppx championship list
ppx championship list -s 1 -y 2024

# Create championship
ppx championship create -s 1 -y 2024 -r 4

# Championship operations
ppx championship get 1
ppx championship update 1 --status "open"
ppx championship delete 1

# Lifecycle
ppx championship open 1
ppx championship start 1
ppx championship complete 1
ppx championship archive 1

# Entrants
ppx championship entrants 1
ppx championship register 1 -c 2 -n "St. Mary's"
ppx championship register-amalgamation 1 -n "Combined" --clubs 2,3,4
ppx championship unregister 1 5

# Standings
ppx championship standings 1
ppx championship standings 1 -r 2
```

### Series Management

```bash
# List series
ppx series list
ppx series list -s "Gaelic Football"

# Create series
ppx series create -n "National League" -s "Gaelic Football"

# Series operations
ppx series get 1
ppx series update 1 --squad-size 20
ppx series delete 1
```

### Club Management

```bash
# List clubs
ppx club list
ppx club list -r "Dublin"

# Create club
ppx club create -n "St. Mary's" -r "Dublin" --logo ./logo.png

# Club operations
ppx club get 1
ppx club update 1 -n "New Name"
ppx club delete 1
```

### Team Management

```bash
# List teams
ppx team list
ppx team list -c 1

# Create team
ppx team create -n "Senior Team" -c 1 --logo ./logo.png

# Team operations
ppx team get 1
ppx team update 1 -n "New Name"
ppx team delete 1
```

## Output Formats

### Table (Default)

Human-readable aligned columns with color-coded headers.

```bash
ppx tournament list
```

### JSON

Machine-readable JSON output.

```bash
ppx tournament list -f json
```

### YAML

YAML formatted output.

```bash
ppx tournament get 1 -f yaml
```

### CSV

Comma-separated values for spreadsheet import.

```bash
ppx tournament list -f csv > tournaments.csv
```

## File Formats

### Fixture TSV Format

For generating fixtures from a file:

```tsv
TIME	MATCH	CATEGORY	PITCH	TEAM1	STAGE	TEAM2	UMPIRES	DURATION
09:00	M.1	MEN	Pitch 1	Team A	Gp.1	Team B	Team C	20
09:25	M.2	MEN	Pitch 1	Team C	Gp.1	Team D	Team A	20
```

## Examples

### Complete Tournament Setup

```bash
# 1. Login
ppx auth login -e admin@example.com -p password

# 2. Create tournament
ppx tournament create \
  -n "Summer Blitz 2024" \
  -d "2024-06-15" \
  -l "Dublin Sports Complex" \
  --region "Leinster"

# 3. Add squads
ppx squad create 123 -n "St. Mary's A" -c "Senior"
ppx squad create 123 -n "St. Mary's B" -c "Senior"
ppx squad create 123 -n "Dublin United" -c "Senior"
ppx squad create 123 -n "Cork Rangers" -c "Senior"

# 4. Generate fixtures
ppx fixture generate 123 -f fixtures.tsv

# 5. Publish tournament
ppx tournament publish 123

# 6. Start tournament
ppx tournament start 123

# 7. Run matches
ppx fixture start 123 1
ppx fixture score 123 1 --home 15 --away 10
ppx fixture end 123 1

# 8. Check standings
ppx tournament standings 123
```

### Championship with Multiple Rounds

```bash
# 1. Create series
ppx series create -n "National League 2024" -s "Gaelic Football"

# 2. Create championship
ppx championship create -s 1 -y 2024 -r 4

# 3. Register clubs
ppx championship register 1 -c 2
ppx championship register 1 -c 3
ppx championship register 1 -c 4

# 4. Open for registrations
ppx championship open 1

# 5. Start championship
ppx championship start 1

# 6. Check standings
ppx championship standings 1
```

## Error Handling

The CLI provides clear error messages:

```bash
$ ppx tournament get 999
✗ HTTP 404: Not Found

$ ppx tournament create -n "Test"
✗ You must be logged in to create a tournament

$ ppx auth login -e invalid-email -p password
✗ Invalid email format
```

## Troubleshooting

### API Not Reachable

```bash
# Check API health
ppx --api-url http://localhost:4001 tournament list

# Or set environment variable
export PP_API_URL=http://localhost:4001
```

### Authentication Issues

```bash
# Check if logged in
ppx auth whoami

# Re-login
ppx auth logout
ppx auth login -e user@example.com -p password
```

### Verbose Mode

```bash
ppx -v tournament list
```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- tournament list

# Build
npm run build

# Type check
npm run typecheck

# Run tests
npm run test
```

## License

ISC
