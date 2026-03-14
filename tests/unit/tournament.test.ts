import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '../../src/lib/api-client.js';
import type { UserSession, Tournament, Fixture } from '../../src/types/index.js';

describe('Tournament Management', () => {
  let client: ApiClient;
  let mockSession: UserSession;

  beforeEach(() => {
    mockSession = {
      token: 'test-token',
      userId: 1,
      email: 'test@example.com',
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    
    client = new ApiClient('http://localhost:4001', mockSession, 30000, false);
  });

  describe('Tournament Creation', () => {
    it('should create a tournament with correct data', async () => {
      const tournamentData = {
        userId: 1,
        title: 'BBBB tournament',
        date: '2025-04-15',
        location: 'Test Stadium',
        region: 'Test Region',
        winPoints: 2,
        drawPoints: 1,
        lossPoints: 0
      };

      // Mock the fetch call
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 123,
          ...tournamentData,
          status: 'draft',
          createdAt: new Date().toISOString()
        })
      } as Response);

      const result = await client.post<Tournament>('/api/tournaments', tournamentData);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe('BBBB tournament');
      expect(result.date).toBe('2025-04-15');
      expect(result.location).toBe('Test Stadium');
      expect(result.status).toBe('draft');
    });

    it('should reject tournament creation without required fields', async () => {
      const incompleteData = {
        userId: 1,
        title: 'Test Tournament'
        // Missing date and location
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Missing required fields: date, location'
        })
      } as Response);

      await expect(client.post('/api/tournaments', incompleteData))
        .rejects.toThrow();
    });
  });

  describe('Fixture Management', () => {
    it('should create multiple fixtures', async () => {
      const fixtures = [
        {
          match: 'Match 1',
          category: 'Senior',
          pitch: 'Pitch 1',
          stage: 'Group Stage',
          team1: 'Team A',
          team2: 'Team B',
          time: '09:00',
          duration: 30
        },
        {
          match: 'Match 2',
          category: 'Senior',
          pitch: 'Pitch 1',
          stage: 'Group Stage',
          team1: 'Team C',
          team2: 'Team D',
          time: '09:30',
          duration: 30
        }
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Fixtures created',
          count: 2
        })
      } as Response);

      interface FixtureResult {
        message: string;
        count: number;
      }
      
      const result = await client.post<FixtureResult>('/api/tournaments/123/fixtures', fixtures);
      expect(result.count).toBe(2);
    });

    it('should list all fixtures in a tournament', async () => {
      const mockFixtures: Fixture[] = [
        { id: 1, match: 'Match 1', team1: 'Team A', team2: 'Team B', status: 'pending', tournamentId: 123, time: '09:00' },
        { id: 2, match: 'Match 2', team1: 'Team C', team2: 'Team D', status: 'pending', tournamentId: 123, time: '09:30' },
        { id: 3, match: 'Match 3', team1: 'Team E', team2: 'Team F', status: 'pending', tournamentId: 123, time: '10:00' }
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockFixtures
      } as Response);

      const result = await client.get<Fixture[]>('/api/tournaments/123/fixtures');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('team1');
      expect(result[0]).toHaveProperty('team2');
    });
  });

  describe('Match Lifecycle', () => {
    it('should start a fixture', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Fixture started' })
      } as Response);

      interface StartResult {
        message: string;
      }
      
      const result = await client.post<StartResult>('/api/tournaments/123/fixtures/456/start');
      expect(result.message).toBe('Fixture started');
    });

    it('should update fixture score', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Score updated',
          homeScore: 15,
          awayScore: 10
        })
      } as Response);

      interface ScoreResult {
        message: string;
        homeScore: number;
        awayScore: number;
      }
      
      const result = await client.post<ScoreResult>('/api/tournaments/123/fixtures/456/score', {
        homeScore: 15,
        awayScore: 10
      });

      expect(result.homeScore).toBe(15);
      expect(result.awayScore).toBe(10);
    });

    it('should end a fixture', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          message: 'Fixture ended',
          status: 'completed'
        })
      } as Response);

      interface EndResult {
        message: string;
        status: string;
      }
      
      const result = await client.post<EndResult>('/api/tournaments/123/fixtures/456/end');
      expect(result.status).toBe('completed');
    });
  });

  describe('Card Management', () => {
    it('should issue a yellow card', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 789,
          playerName: 'John Smith',
          color: 'yellow',
          reason: 'Unsporting behavior',
          fixtureId: 456
        })
      } as Response);

      interface CardResult {
        id: number;
        playerName: string;
        color: string;
        reason: string;
        fixtureId: number;
      }
      
      const result = await client.post<CardResult>('/api/tournaments/123/fixtures/456/carded', {
        playerName: 'John Smith',
        color: 'yellow',
        reason: 'Unsporting behavior'
      });

      expect(result.playerName).toBe('John Smith');
      expect(result.color).toBe('yellow');
      expect(result.reason).toBe('Unsporting behavior');
    });

    it('should list all cards in a fixture', async () => {
      interface Card {
        id: number;
        playerName: string;
        color: string;
        reason: string;
      }
      
      const mockCards: Card[] = [
        {
          id: 1,
          playerName: 'John Smith',
          color: 'yellow',
          reason: 'Unsporting behavior'
        },
        {
          id: 2,
          playerName: 'Jane Doe',
          color: 'red',
          reason: 'Serious foul play'
        }
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockCards
      } as Response);

      const result = await client.get<Card[]>('/api/tournaments/123/fixtures/456/carded-players');
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].color).toBe('yellow');
      expect(result[1].color).toBe('red');
    });
  });

  describe('Tournament Lifecycle', () => {
    it('should publish a tournament', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 123,
          status: 'published'
        })
      } as Response);

      const result = await client.put<Tournament>('/api/tournaments/123/status/published');
      expect(result.status).toBe('published');
    });

    it('should start a tournament', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 123,
          status: 'started'
        })
      } as Response);

      const result = await client.put<Tournament>('/api/tournaments/123/status/started');
      expect(result.status).toBe('started');
    });

    it('should close a tournament', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 123,
          status: 'closed'
        })
      } as Response);

      const result = await client.put<Tournament>('/api/tournaments/123/status/closed');
      expect(result.status).toBe('closed');
    });
  });

  describe('Complete Tournament Workflow', () => {
    it('should complete full tournament lifecycle', async () => {
      // This test simulates the entire workflow
      const workflow: Array<{
        method: string;
        path: string;
        body?: Record<string, unknown>;
        response: Record<string, unknown>;
      }> = [
        // 1. Create tournament
        {
          method: 'POST',
          path: '/api/tournaments',
          body: {
            userId: 1,
            title: 'BBBB tournament',
            date: '2025-04-15',
            location: 'Test Stadium'
          },
          response: { id: 123, status: 'draft' }
        },
        // 2. Create squads
        {
          method: 'POST',
          path: '/api/tournaments/123/squads',
          body: { name: 'Team Alpha', category: 'Senior' },
          response: { id: 1, name: 'Team Alpha' }
        },
        // 3. Create fixtures
        {
          method: 'POST',
          path: '/api/tournaments/123/fixtures',
          body: {} as Record<string, unknown>,
          response: { count: 10 }
        },
        // 4. Start tournament
        {
          method: 'PUT',
          path: '/api/tournaments/123/status/started',
          response: { id: 123, status: 'started' }
        },
        // 5. Start fixture
        {
          method: 'POST',
          path: '/api/tournaments/123/fixtures/456/start',
          response: { message: 'Fixture started' }
        },
        // 6. Update score
        {
          method: 'POST',
          path: '/api/tournaments/123/fixtures/456/score',
          body: { homeScore: 10, awayScore: 8 },
          response: { homeScore: 10, awayScore: 8 }
        },
        // 7. Add yellow card (8th fixture)
        {
          method: 'POST',
          path: '/api/tournaments/123/fixtures/456/carded',
          body: { playerName: 'John Smith', color: 'yellow', reason: 'Unsporting behavior' },
          response: { id: 789, playerName: 'John Smith', color: 'yellow' }
        },
        // 8. End fixture
        {
          method: 'POST',
          path: '/api/tournaments/123/fixtures/456/end',
          response: { status: 'completed' }
        },
        // 9. Close tournament
        {
          method: 'PUT',
          path: '/api/tournaments/123/status/closed',
          response: { id: 123, status: 'closed' }
        }
      ];

      // Execute workflow
      for (const step of workflow) {
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          status: step.method === 'POST' ? 201 : 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => step.response
        } as Response);

        let result: unknown;
        switch (step.method) {
          case 'POST':
            result = await client.post(step.path, step.body);
            break;
          case 'PUT':
            result = await client.put(step.path, step.body);
            break;
        }

        expect(result).toBeDefined();
      }

      // Verify final state
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          id: 123,
          title: 'BBBB tournament',
          status: 'closed',
          fixturesCompleted: 10
        })
      } as Response);

      interface TournamentStatus {
        id: number;
        title: string;
        status: string;
        fixturesCompleted: number;
      }
      
      const tournament = await client.get<TournamentStatus>('/api/tournaments/123');
      expect(tournament.status).toBe('closed');
      expect(tournament.fixturesCompleted).toBe(10);
    });
  });
});
