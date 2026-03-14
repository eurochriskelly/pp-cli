# CLI Dogfooding Results - Issues Found

## Summary
Successfully created tournament "BBBB tournament" (ID: 78) with 20 squads and 10 fixtures. However, discovered multiple CLI/API mismatches that prevent completing the full workflow.

## ✅ What Works

1. **Tournament Creation** - Creates tournament successfully
   - Command: `ppx tournament create -n "BBBB tournament" -d "2026-04-12" -l "Test Stadium"`
   - Result: Tournament #78 created

2. **Tournament Start** - Starts tournament successfully
   - Command: `ppx tournament start 78`
   - Result: ✓ Started tournament 78

3. **Squad Creation** - Creates squads successfully
   - Command: `ppx squad create 78 -n "Team Alpha" -c "Senior"`
   - Result: 20 squads created (IDs 136-155)

4. **Fixture Generation** - Generates fixtures from TSV
   - Command: `ppx fixture generate 78 -f fixtures-bbbb.tsv`
   - Result: 10 fixtures created (IDs 780001-780010)

5. **Listing Operations** - All list commands work
   - `ppx tournament list`
   - `ppx fixture list 78`

## ❌ Critical Issues Found

### 1. Success Messages Show "undefined"

**Problem**: Success messages display "undefined" instead of actual values

**Affected Commands**:
- `tournament create` - Shows "Created tournament 'undefined'"
- `squad create` - Shows "Created squad 'undefined'"

**Root Cause**: API returns `Title` (capitalized) but CLI expects `title` (lowercase)

**Fix Needed**:
```typescript
// In tournament.ts line 99
success(`Created tournament "${tournament.title}"`);
// Should handle both: tournament.title || tournament.Title

// Same issue in squad.ts line 69
success(`Created squad "${squad.name}"`);
// Should handle: squad.name || squad.Name
```

### 2. Fixture Operations Don't Work

**Problem**: Fixture lifecycle endpoints don't exist in API

**Affected Commands**:
- `fixture start` - POST /api/tournaments/{id}/fixtures/{fixtureId}/start - **404 Not Found**
- `fixture score` - POST /api/tournaments/{id}/fixtures/{fixtureId}/score - **404 Not Found**
- `fixture end` - POST /api/tournaments/{id}/fixtures/{fixtureId}/end - **404 Not Found**
- `fixture card` - POST /api/tournaments/{id}/fixtures/{fixtureId}/carded - **404 Not Found**

**API Response**: All return "Cannot POST/Resource not found"

**Evidence**:
```bash
curl http://localhost:4001/api/tournaments/78/fixtures/780001
# Returns fixture data successfully

curl -X POST http://localhost:4001/api/tournaments/78/fixtures/780001/start
# Returns: Resource not found!

curl -X POST http://localhost:4001/api/tournaments/78/fixtures/780001/score
# Returns: Resource not found!

curl -X POST http://localhost:4001/api/tournaments/78/fixtures/780001/end
# Returns: Resource not found!

curl http://localhost:4001/api/tournaments/78/fixtures/780001/carded-players
# Returns: Resource not found!
```

### 3. Field Name Mismatch

**Problem**: API uses different field names than CLI expects

**API Field Names**:
- `goals1`, `points1` (not `homeScore`, `homeGoals`)
- `goals2`, `points2` (not `awayScore`, `awayGoals`)
- `Title` (not `title`)
- `Name` (not `name`)

**CLI Code** (fixture.ts lines 127-131):
```typescript
const body = {
  homeScore: parseInt(options.home, 10),
  awayScore: parseInt(options.away, 10),
  homeGoals: options.homeGoals ? parseInt(options.homeGoals, 10) : undefined,
  awayGoals: options.awayGoals ? parseInt(options.awayGoals, 10) : undefined
};
```

**Should Be**:
```typescript
const body = {
  goals1: parseInt(options.home, 10),
  points1: parseInt(options.away, 10), // Or appropriate mapping
  goals2: options.homeGoals ? parseInt(options.homeGoals, 10) : undefined,
  points2: options.awayGoals ? parseInt(options.awayGoals, 10) : undefined
};
```

### 4. Card Command Issues

**Problem**: Card command doesn't work due to missing API endpoint

**Attempted**:
```bash
ppx fixture card 78 780008 -p "John Smith" -c yellow -r "Unsporting behavior"
# Error: required option '-p, --player <name>' not specified
```

Even when API endpoint would exist, the command parser seems to have issues.

## 🔧 Recommended Fixes

### Immediate Fixes (CLI Code)

1. **Fix Success Message Display** - Handle both capitalized and lowercase field names
2. **Update Field Mappings** - Use API's actual field names (`goals1`, `points1`, etc.)
3. **Add Better Error Messages** - Show actual HTTP status codes and error details

### API Requirements

The API needs to implement these missing endpoints:

```
POST   /api/tournaments/{id}/fixtures/{fixtureId}/start
POST   /api/tournaments/{id}/fixtures/{fixtureId}/score
POST   /api/tournaments/{id}/fixtures/{fixtureId}/end
POST   /api/tournaments/{id}/fixtures/{fixtureId}/carded
GET    /api/tournaments/{id}/fixtures/{fixtureId}/carded-players
```

## 📊 Current Status

**Tournament**: "BBBB tournament" (ID: 78) ✓ Created  
**Date**: 2026-04-12 ✓ Future date  
**Squads**: 20 teams created ✓  
**Fixtures**: 10 fixtures created ✓  
**Status**: Started ✓  
**Fixtures Played**: 0/10 ❌ (blocked by missing API endpoints)  
**Yellow Cards**: 0 ❌ (blocked by missing API endpoints)  
**Closed**: No ❌

## Next Steps

1. Fix CLI display issues (success messages showing "undefined")
2. Update field name mappings to match API
3. Coordinate with API team to implement missing fixture operation endpoints
4. Add integration tests that actually test against real API
5. Document API endpoint requirements in README

## Files That Need Updates

- `src/commands/tournament.ts` - Fix success message field names
- `src/commands/squad.ts` - Fix success message field names  
- `src/commands/fixture.ts` - Fix field mappings and verify endpoints exist
- `src/lib/api-client.ts` - Add better error reporting
- `README.md` - Document actual API capabilities vs CLI features
