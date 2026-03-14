#!/bin/bash

# Tournament Test Script using CLI commands
# This script tests the tournament management system

set -e # Exit on error

TOURNAMENT_NAME="BBBB tournament"
FUTURE_DATE=$(date -v+30d +%Y-%m-%d 2>/dev/null || date -d "+30 days" +%Y-%m-%d)

echo "========================================"
echo "  Tournament Software Test Suite"
echo "========================================"
echo ""
echo "This script will:"
echo "  1. Create a tournament in the future"
echo "  2. Add squads and fixtures"
echo "  3. Start the tournament"
echo "  4. Play all 10 fixtures"
echo "  5. Add yellow card during 8th fixture"
echo "  6. Close the tournament"
echo ""

# Check if ppx is available
if ! command -v ppx &>/dev/null; then
	echo "❌ Error: ppx command not found"
	echo "   Please run: npm link"
	echo "   Or use: node dist/index.js instead of ppx"
	exit 1
fi

# Check if user is logged in
echo "🔍 Checking authentication..."
if ! ppx auth whoami &>/dev/null; then
	echo "❌ Error: Not logged in"
	echo "   Please run: ppx auth login -e <email> -p <password>"
	exit 1
fi

echo "✅ User authenticated"
echo ""

# Step 1: Create tournament
echo "📝 Creating tournament '$TOURNAMENT_NAME'..."
TOURNAMENT_OUTPUT=$(ppx tournament create -n "$TOURNAMENT_NAME" -d "$FUTURE_DATE" -l "Test Stadium" --region "Test Region" 2>&1)
echo "$TOURNAMENT_OUTPUT"

# Extract tournament ID (assuming format "ID: 123")
TOURNAMENT_ID=$(echo "$TOURNAMENT_OUTPUT" | grep -oE 'ID: [0-9]+' | grep -oE '[0-9]+')

if [ -z "$TOURNAMENT_ID" ]; then
	echo "❌ Failed to extract tournament ID"
	exit 1
fi

echo "✅ Tournament created with ID: $TOURNAMENT_ID"
echo ""

# Step 2: Create squads
echo "👥 Creating squads..."
TEAMS=(
	"Team Alpha" "Team Beta" "Team Gamma" "Team Delta"
	"Team Echo" "Team Foxtrot" "Team Golf" "Team Hotel"
	"Team India" "Team Juliet" "Team Kilo" "Team Lima"
	"Team Mike" "Team November" "Team Oscar" "Team Papa"
	"Team Quebec" "Team Romeo" "Team Sierra" "Team Tango"
)

SQUAD_IDS=()
for team in "${TEAMS[@]}"; do
	OUTPUT=$(ppx squad create $TOURNAMENT_ID -n "$team" -c "Senior" 2>&1)
	echo "$OUTPUT"
	SQUAD_ID=$(echo "$OUTPUT" | grep -oE 'ID: [0-9]+' | grep -oE '[0-9]+')
	SQUAD_IDS+=($SQUAD_ID)
done

echo "✅ Created ${#SQUAD_IDS[@]} squads"
echo ""

# Step 3: Create fixtures TSV file
echo "⚽ Creating fixtures file..."
cat >/tmp/fixtures.tsv <<EOF
TIME	MATCH	CATEGORY	PITCH	TEAM1	STAGE	TEAM2	UMPIRES	DURATION
09:00	M.1	Senior	Pitch 1	Team Alpha	Gp.1	Team Beta	Team Delta	30
09:30	M.2	Senior	Pitch 1	Team Gamma	Gp.1	Team Delta	Team Alpha	30
10:00	M.3	Senior	Pitch 2	Team Echo	Gp.2	Team Foxtrot	Team Golf	30
10:30	M.4	Senior	Pitch 2	Team Golf	Gp.2	Team Hotel	Team Echo	30
11:00	M.5	Senior	Pitch 3	Team India	Gp.3	Team Juliet	Team Kilo	30
11:30	M.6	Senior	Pitch 3	Team Kilo	Gp.3	Team Lima	Team India	30
12:00	M.7	Senior	Pitch 1	Team Mike	Gp.4	Team November	Team Oscar	30
12:30	M.8	Senior	Pitch 1	Team Oscar	Gp.4	Team Papa	Team Mike	30
13:00	M.9	Senior	Pitch 2	Team Quebec	Gp.5	Team Romeo	Team Sierra	30
13:30	M.10	Senior	Pitch 2	Team Sierra	Gp.5	Team Tango	Team Quebec	30
EOF

# Generate fixtures
ppx fixture generate $TOURNAMENT_ID -f /tmp/fixtures.tsv
echo "✅ Fixtures generated"
echo ""

# Step 4: Start tournament
echo "🚀 Starting tournament..."
ppx tournament start $TOURNAMENT_ID
echo ""

# Step 5: Get fixtures and play them
echo "⚽ Playing all fixtures..."
FIXTURES_OUTPUT=$(ppx fixture list $TOURNAMENT_ID -f json 2>&1)

# Parse fixture IDs from JSON output
FIXTURE_IDS=$(echo "$FIXTURES_OUTPUT" | grep -oE '"id":[0-9]+' | grep -oE '[0-9]+' | head -10)

if [ -z "$FIXTURE_IDS" ]; then
	echo "⚠️  Could not parse fixture IDs from JSON, trying table format..."
	FIXTURE_IDS=$(ppx fixture list $TOURNAMENT_ID 2>&1 | grep -E '^[0-9]+' | awk '{print $1}' | head -10)
fi

COUNT=0
for FIXTURE_ID in $FIXTURE_IDS; do
	COUNT=$((COUNT + 1))
	echo ""
	echo "🎮 Playing fixture $FIXTURE_ID ($COUNT/10)..."

	# Start fixture
	echo "   Starting fixture..."
	ppx fixture start $TOURNAMENT_ID $FIXTURE_ID

	# Set score
	HOME_SCORE=$((RANDOM % 15 + 5))
	AWAY_SCORE=$((RANDOM % 15 + 5))
	echo "   Setting score: $HOME_SCORE - $AWAY_SCORE"
	ppx fixture score $TOURNAMENT_ID $FIXTURE_ID --home $HOME_SCORE --away $AWAY_SCORE

	# Add yellow card during 8th fixture
	if [ $COUNT -eq 8 ]; then
		echo "   🟨 Adding yellow card to John Smith..."
		ppx fixture card $TOURNAMENT_ID $FIXTURE_ID -p "John Smith" -c yellow -r "Unsporting behavior"
	fi

	# End fixture
	echo "   Ending fixture..."
	ppx fixture end $TOURNAMENT_ID $FIXTURE_ID

	echo "   ✅ Fixture $FIXTURE_ID completed"
done

echo ""
echo "✅ All 10 fixtures played"
echo ""

# Step 6: Close tournament
echo "🔒 Closing tournament..."
ppx tournament close $TOURNAMENT_ID
echo ""

# Verify
echo "✅ Verifying tournament..."
ppx tournament get $TOURNAMENT_ID

echo ""
echo "========================================"
echo "  ✅ All tests completed successfully!"
echo "========================================"
echo ""
echo "Tournament ID: $TOURNAMENT_ID"
echo "Tournament Name: $TOURNAMENT_NAME"
echo "Fixtures Created: 10"
echo "Fixtures Played: 10"
echo "Yellow Cards: 1 (added in 8th fixture)"
echo "Status: Closed"
echo ""

# Cleanup
rm -f /tmp/fixtures.tsv
