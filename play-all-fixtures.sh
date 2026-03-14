#!/bin/bash

# Complete tournament workflow using curl directly

echo "=========================================="
echo "  BBBB Tournament - Complete Workflow"
echo "=========================================="
echo ""

TOURNAMENT_ID=78
API_URL="http://localhost:4001"

# Fixture IDs
FIXTURES=(780001 780002 780003 780004 780005 780006 780007 780008 780009 780010)

echo "🚀 Starting all fixtures..."
for fixture_id in "${FIXTURES[@]}"; do
	echo "  Starting fixture $fixture_id..."
	curl -s -X POST "$API_URL/api/tournaments/$TOURNAMENT_ID/fixtures/$fixture_id/start" >/dev/null
done
echo "✅ All fixtures started"
echo ""

echo "⚽ Scoring all fixtures..."
for i in "${!FIXTURES[@]}"; do
	fixture_id="${FIXTURES[$i]}"
	fixture_num=$((i + 1))

	# Random scores
	home_points=$((RANDOM % 20 + 5))
	away_points=$((RANDOM % 20 + 5))
	home_goals=$((RANDOM % 5))
	away_goals=$((RANDOM % 5))

	echo "  Fixture $fixture_num ($fixture_id): $home_points-$away_points"

	curl -s -X POST "$API_URL/api/tournaments/$TOURNAMENT_ID/fixtures/$fixture_id/score" \
		-H "Content-Type: application/json" \
		-d "{\"points1\": $home_points, \"points2\": $away_points, \"goals1\": $home_goals, \"goals2\": $away_goals}" >/dev/null
done
echo "✅ All fixtures scored"
echo ""

echo "🟨 Adding yellow card to fixture 780008 (8th fixture)..."
curl -s -X POST "$API_URL/api/tournaments/$TOURNAMENT_ID/fixtures/780008/cards" \
	-H "Content-Type: application/json" \
	-d '{"playerName": "John Smith", "color": "yellow", "reason": "Unsporting behavior"}' >/dev/null
echo "✅ Yellow card added"
echo ""

echo "🏁 Ending all fixtures..."
for fixture_id in "${FIXTURES[@]}"; do
	echo "  Ending fixture $fixture_id..."
	curl -s -X POST "$API_URL/api/tournaments/$TOURNAMENT_ID/fixtures/$fixture_id/end" >/dev/null
done
echo "✅ All fixtures ended"
echo ""

echo "=========================================="
echo "  ✅ Tournament workflow complete!"
echo "=========================================="
