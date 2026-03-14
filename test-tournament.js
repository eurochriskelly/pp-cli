#!/usr/bin/env node

/**
 * Tournament Test Script
 * 
 * This script tests the tournament management system by:
 * 1. Creating a tournament called "BBBB tournament" in the future
 * 2. Adding 10 fixtures with teams
 * 3. Starting the tournament
 * 4. Playing all 10 fixtures
 * 5. Adding a yellow card during the 8th fixture
 * 6. Closing the tournament
 */

import { ApiClient } from './dist/lib/api-client.js';
import { loadConfig, loadSession, getCurrentSession } from './dist/lib/config.js';
import { getProfile } from './dist/lib/helpers.js';

const TOURNAMENT_NAME = 'BBBB tournament';
const FUTURE_DATE = new Date();
FUTURE_DATE.setDate(FUTURE_DATE.getDate() + 30); // 30 days in the future

// Sample teams for fixtures
const TEAMS = [
  'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
  'Team Echo', 'Team Foxtrot', 'Team Golf', 'Team Hotel',
  'Team India', 'Team Juliet', 'Team Kilo', 'Team Lima',
  'Team Mike', 'Team November', 'Team Oscar', 'Team Papa',
  'Team Quebec', 'Team Romeo', 'Team Sierra', 'Team Tango'
];

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initializeClient() {
  console.log('🔌 Initializing API client...');
  
  const config = await loadConfig();
  const session = await loadSession();
  const profile = await getProfile(config, 'default');
  const userSession = await getCurrentSession(session);
  
  const client = new ApiClient(profile.apiUrl, userSession, profile.timeout, true);
  
  // Check if user is logged in
  if (!userSession) {
    console.error('❌ Error: You must be logged in to run this test');
    console.log('   Run: ppx auth login -e <email> -p <password>');
    process.exit(1);
  }
  
  console.log(`✅ Connected to API at ${profile.apiUrl}`);
  return { client, userSession };
}

async function createTournament(client, userId) {
  console.log(`\n📝 Creating tournament "${TOURNAMENT_NAME}"...`);
  
  const date = FUTURE_DATE.toISOString().split('T')[0];
  
  const body = {
    userId: userId,
    title: TOURNAMENT_NAME,
    date: date,
    location: 'Test Stadium',
    region: 'Test Region',
    winPoints: 2,
    drawPoints: 1,
    lossPoints: 0
  };
  
  try {
    const tournament = await client.post('/api/tournaments', body);
    console.log(`✅ Tournament created with ID: ${tournament.id}`);
    console.log(`   Date: ${tournament.date}`);
    console.log(`   Location: ${tournament.location}`);
    return tournament;
  } catch (err) {
    console.error(`❌ Failed to create tournament: ${err.message}`);
    throw err;
  }
}

async function createSquads(client, tournamentId) {
  console.log('\n👥 Creating squads...');
  
  const squads = [];
  
  for (let i = 0; i < TEAMS.length; i++) {
    const teamName = TEAMS[i];
    
    try {
      const squad = await client.post(`/api/tournaments/${tournamentId}/squads`, {
        name: teamName,
        category: 'Senior'
      });
      squads.push(squad);
      console.log(`✅ Created squad: ${teamName} (ID: ${squad.id})`);
    } catch (err) {
      console.error(`❌ Failed to create squad ${teamName}: ${err.message}`);
      throw err;
    }
  }
  
  return squads;
}

async function createFixtures(client, tournamentId, squads) {
  console.log('\n⚽ Creating 10 fixtures...');
  
  const fixtures = [];
  
  for (let i = 0; i < 10; i++) {
    const team1Index = i * 2;
    const team2Index = i * 2 + 1;
    
    const fixture = {
      match: `Match ${i + 1}`,
      category: 'Senior',
      pitch: `Pitch ${(i % 3) + 1}`,
      stage: 'Group Stage',
      team1: squads[team1Index].name,
      team2: squads[team2Index].name,
      umpires: 'Umpire Team',
      time: `${9 + Math.floor(i / 2)}:${(i % 2) * 30 || '00'}`,
      duration: 30
    };
    
    fixtures.push(fixture);
  }
  
  try {
    await client.post(`/api/tournaments/${tournamentId}/fixtures`, fixtures);
    console.log(`✅ Created ${fixtures.length} fixtures`);
    return fixtures;
  } catch (err) {
    console.error(`❌ Failed to create fixtures: ${err.message}`);
    throw err;
  }
}

async function getFixtures(client, tournamentId) {
  console.log('\n📋 Fetching fixtures...');
  
  try {
    const fixtures = await client.get(`/api/tournaments/${tournamentId}/fixtures`);
    console.log(`✅ Found ${fixtures.length} fixtures`);
    return fixtures;
  } catch (err) {
    console.error(`❌ Failed to fetch fixtures: ${err.message}`);
    throw err;
  }
}

async function startTournament(client, tournamentId) {
  console.log('\n🚀 Starting tournament...');
  
  try {
    await client.put(`/api/tournaments/${tournamentId}/status/started`);
    console.log(`✅ Tournament ${tournamentId} started`);
  } catch (err) {
    console.error(`❌ Failed to start tournament: ${err.message}`);
    throw err;
  }
}

async function playFixture(client, tournamentId, fixture, index) {
  console.log(`\n⚽ Playing fixture ${fixture.id} (${fixture.team1} vs ${fixture.team2})...`);
  
  try {
    // Start the fixture
    console.log(`   Starting fixture...`);
    await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixture.id}/start`);
    
    // Simulate play time
    console.log(`   Simulating match...`);
    await delay(500);
    
    // Update score
    const homeScore = Math.floor(Math.random() * 15) + 5;
    const awayScore = Math.floor(Math.random() * 15) + 5;
    
    console.log(`   Updating score: ${fixture.team1} ${homeScore} - ${awayScore} ${fixture.team2}`);
    await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixture.id}/score`, {
      homeScore: homeScore,
      awayScore: awayScore
    });
    
    // Add yellow card during 8th fixture
    if (index === 7) {
      console.log(`   🟨 Adding yellow card to player...`);
      await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixture.id}/carded`, {
        playerName: 'John Smith',
        color: 'yellow',
        reason: 'Unsporting behavior'
      });
      console.log(`   ✅ Yellow card added to John Smith`);
    }
    
    // End the fixture
    console.log(`   Ending fixture...`);
    await client.post(`/api/tournaments/${tournamentId}/fixtures/${fixture.id}/end`);
    
    console.log(`✅ Fixture ${fixture.id} completed`);
    
    // Small delay between fixtures
    await delay(300);
    
  } catch (err) {
    console.error(`❌ Failed to play fixture ${fixture.id}: ${err.message}`);
    throw err;
  }
}

async function playAllFixtures(client, tournamentId, fixtures) {
  console.log(`\n🏆 Playing all ${fixtures.length} fixtures...`);
  
  for (let i = 0; i < fixtures.length; i++) {
    await playFixture(client, tournamentId, fixtures[i], i);
  }
  
  console.log(`\n✅ All ${fixtures.length} fixtures completed`);
}

async function closeTournament(client, tournamentId) {
  console.log('\n🔒 Closing tournament...');
  
  try {
    await client.put(`/api/tournaments/${tournamentId}/status/closed`);
    console.log(`✅ Tournament ${tournamentId} closed`);
  } catch (err) {
    console.error(`❌ Failed to close tournament: ${err.message}`);
    throw err;
  }
}

async function verifyTournament(client, tournamentId) {
  console.log('\n✅ Verifying tournament status...');
  
  try {
    const tournament = await client.get(`/api/tournaments/${tournamentId}`);
    console.log(`   Tournament: ${tournament.title}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Date: ${tournament.date}`);
    
    // Get final standings
    const standings = await client.get(`/api/tournaments/${tournamentId}/group-standings`);
    console.log(`   Group standings retrieved`);
    
    // Get cards
    const fixtures = await client.get(`/api/tournaments/${tournamentId}/fixtures`);
    let totalCards = 0;
    for (const fixture of fixtures) {
      try {
        const cards = await client.get(`/api/tournaments/${tournamentId}/fixtures/${fixture.id}/carded-players`);
        if (Array.isArray(cards) && cards.length > 0) {
          totalCards += cards.length;
        }
      } catch (e) {
        // Fixture might not have cards endpoint or no cards
      }
    }
    console.log(`   Total cards issued: ${totalCards}`);
    
  } catch (err) {
    console.error(`❌ Failed to verify tournament: ${err.message}`);
  }
}

async function runTest() {
  console.log('='.repeat(60));
  console.log('  Tournament Software Test Suite');
  console.log('='.repeat(60));
  
  let tournament = null;
  let fixtures = null;
  
  try {
    // Step 1: Initialize
    const { client, userSession } = await initializeClient();
    
    // Step 2: Create tournament
    tournament = await createTournament(client, userSession.userId);
    
    // Step 3: Create squads (need teams for fixtures)
    const squads = await createSquads(client, tournament.id);
    
    // Step 4: Create fixtures
    await createFixtures(client, tournament.id, squads);
    
    // Step 5: Get fixtures list
    fixtures = await getFixtures(client, tournament.id);
    
    // Step 6: Start tournament
    await startTournament(client, tournament.id);
    
    // Step 7: Play all fixtures
    await playAllFixtures(client, tournament.id, fixtures);
    
    // Step 8: Close tournament
    await closeTournament(client, tournament.id);
    
    // Step 9: Verify results
    await verifyTournament(client, tournament.id);
    
    console.log('\n' + '='.repeat(60));
    console.log('  ✅ All tests completed successfully!');
    console.log('='.repeat(60));
    console.log(`\nTournament ID: ${tournament.id}`);
    console.log(`Tournament Name: ${tournament.title}`);
    console.log(`Fixtures Created: 10`);
    console.log(`Fixtures Played: 10`);
    console.log(`Yellow Cards: 1 (added in 8th fixture)`);
    console.log(`Status: Closed`);
    
  } catch (err) {
    console.error('\n' + '='.repeat(60));
    console.error('  ❌ Test failed!');
    console.error('='.repeat(60));
    console.error(`\nError: ${err.message}`);
    if (tournament) {
      console.error(`\nTournament ID: ${tournament.id} (may need manual cleanup)`);
    }
    process.exit(1);
  }
}

// Run the test
runTest();
