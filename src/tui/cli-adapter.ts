import { spawn } from 'node:child_process';

export interface TournamentRecord {
  id: number;
  title?: string;
  name?: string;
  date?: string;
  location?: string;
  region?: string;
  status?: string;
}

export interface FixtureRecord {
  id: number;
  match?: string;
  category?: string;
  pitch?: string;
  stage?: string;
  scheduled?: string;
  started?: string;
  ended?: string;
  team1?: string;
  team1Id?: string;
  team2?: string;
  team2Id?: string;
  outcome?: string;
  goals1?: number;
  goals2?: number;
  points1?: number;
  points2?: number;
}

export interface TournamentBundle {
  overview: unknown;
  standings: unknown;
  brackets: unknown;
  fixtures: FixtureRecord[];
}

export interface SquadRecord {
  id: number;
  name?: string;
  category?: string;
}

export interface ChampionshipRecord {
  id: number;
  year?: number;
  status?: string;
  seriesId?: number;
}

export interface ClubRecord {
  id: number;
  name?: string;
  region?: string;
}

export interface TeamRecord {
  id: number;
  name?: string;
  clubId?: number;
}

export interface SeriesRecord {
  id: number;
  name?: string;
  sport?: string;
}

interface CliProcessConfig {
  command: string;
  baseArgs: string[];
}

interface CliResult {
  stdout: string;
  stderr: string;
}

const ANSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;

function cleanOutput(value: string): string {
  return value.replace(ANSI_PATTERN, '').trim();
}

function isJsonPayload(value: string): boolean {
  return value.startsWith('{') || value.startsWith('[');
}

function parseJsonOutput<T>(stdout: string, emptyValue: T): T {
  const cleaned = cleanOutput(stdout);
  if (!cleaned) {
    return emptyValue;
  }

  if (isJsonPayload(cleaned)) {
    return JSON.parse(cleaned) as T;
  }

  if (/No .* found/i.test(cleaned) || cleaned === 'No data') {
    return emptyValue;
  }

  throw new Error(`Expected JSON output, received: ${cleaned}`);
}

function buildMessage(stdout: string, stderr: string): string {
  const cleanedStdout = cleanOutput(stdout);
  const cleanedStderr = cleanOutput(stderr);
  return cleanedStdout || cleanedStderr || 'Command completed';
}

function normalizeTournamentRecord(record: TournamentRecord & Record<string, unknown>): TournamentRecord {
  return {
    id: Number(record.id ?? record.Id ?? 0),
    title: String(record.title ?? record.Title ?? record.name ?? record.Name ?? ''),
    name: String(record.name ?? record.Name ?? record.title ?? record.Title ?? ''),
    date: String(record.date ?? record.Date ?? ''),
    location: String(record.location ?? record.Location ?? ''),
    region: String(record.region ?? record.Region ?? ''),
    status: String(record.status ?? record.Status ?? '')
  };
}

function normalizeSquadRecord(record: Record<string, unknown>): SquadRecord {
  return {
    id: Number(record.id ?? record.Id ?? 0),
    name: String(record.name ?? record.Name ?? record.teamName ?? ''),
    category: String(record.category ?? record.Category ?? '')
  };
}

function normalizeChampionshipRecord(record: Record<string, unknown>): ChampionshipRecord {
  return {
    id: Number(record.id ?? record.Id ?? 0),
    year: Number(record.year ?? record.Year ?? 0),
    status: String(record.status ?? record.Status ?? ''),
    seriesId: Number(record.seriesId ?? record.SeriesId ?? 0)
  };
}

function normalizeClubRecord(record: Record<string, unknown>): ClubRecord {
  return {
    id: Number(record.id ?? record.Id ?? 0),
    name: String(record.name ?? record.Name ?? ''),
    region: String(record.region ?? record.Region ?? '')
  };
}

function normalizeTeamRecord(record: Record<string, unknown>): TeamRecord {
  return {
    id: Number(record.id ?? record.Id ?? 0),
    name: String(record.name ?? record.Name ?? ''),
    clubId: Number(record.clubId ?? record.ClubId ?? 0)
  };
}

function normalizeSeriesRecord(record: Record<string, unknown>): SeriesRecord {
  return {
    id: Number(record.id ?? record.Id ?? 0),
    name: String(record.name ?? record.Name ?? ''),
    sport: String(record.sport ?? record.Sport ?? '')
  };
}

export class CliAdapter {
  constructor(private readonly processConfig: CliProcessConfig) {}

  async listTournaments(): Promise<TournamentRecord[]> {
    const result = await this.runJson<Array<TournamentRecord & Record<string, unknown>>>(['tournament', 'list'], []);
    return Array.isArray(result) ? result.map((record) => normalizeTournamentRecord(record)) : [];
  }

  async listSquads(tournamentId: number): Promise<SquadRecord[]> {
    const result = await this.runJson<Record<string, unknown>[]>(['squad', 'list', String(tournamentId)], []);
    return Array.isArray(result) ? result.map((record) => normalizeSquadRecord(record)) : [];
  }

  async listChampionships(): Promise<ChampionshipRecord[]> {
    const result = await this.runJson<Record<string, unknown>[]>(['championship', 'list'], []);
    return Array.isArray(result) ? result.map((record) => normalizeChampionshipRecord(record)) : [];
  }

  async listClubs(): Promise<ClubRecord[]> {
    const result = await this.runJson<Record<string, unknown>[]>(['club', 'list'], []);
    return Array.isArray(result) ? result.map((record) => normalizeClubRecord(record)) : [];
  }

  async listTeams(): Promise<TeamRecord[]> {
    const result = await this.runJson<Record<string, unknown>[]>(['team', 'list'], []);
    return Array.isArray(result) ? result.map((record) => normalizeTeamRecord(record)) : [];
  }

  async listSeries(): Promise<SeriesRecord[]> {
    const result = await this.runJson<Record<string, unknown>[]>(['series', 'list'], []);
    return Array.isArray(result) ? result.map((record) => normalizeSeriesRecord(record)) : [];
  }

  async listFixtures(tournamentId: number): Promise<FixtureRecord[]> {
    const result = await this.runJson<FixtureRecord[]>(['fixture', 'list', String(tournamentId), '--detailed'], []);
    return Array.isArray(result) ? result : [];
  }

  async fetchTournamentBundle(tournamentId: number): Promise<TournamentBundle> {
    const [overview, standings, brackets, fixtures] = await Promise.all([
      this.runJson(['tournament', 'overview', String(tournamentId)], null),
      this.runJson(['tournament', 'standings', String(tournamentId)], null),
      this.runJson(['tournament', 'brackets', String(tournamentId)], null),
      this.runJson<FixtureRecord[]>(['fixture', 'list', String(tournamentId), '--detailed'], [])
    ]);

    return {
      overview,
      standings,
      brackets,
      fixtures: Array.isArray(fixtures) ? fixtures : []
    };
  }

  async publishTournament(tournamentId: number): Promise<string> {
    return this.runAction(['tournament', 'publish', String(tournamentId)]);
  }

  async startTournament(tournamentId: number): Promise<string> {
    return this.runAction(['tournament', 'start', String(tournamentId)]);
  }

  async closeTournament(tournamentId: number): Promise<string> {
    return this.runAction(['tournament', 'close', String(tournamentId)]);
  }

  async startFixture(tournamentId: number, fixtureId: number): Promise<string> {
    return this.runAction(['fixture', 'start', String(tournamentId), String(fixtureId)]);
  }

  async endFixture(tournamentId: number, fixtureId: number): Promise<string> {
    return this.runAction(['fixture', 'end', String(tournamentId), String(fixtureId)]);
  }

  async scoreFixture(
    tournamentId: number,
    fixtureId: number,
    scores: { homeGoals: number; homePoints: number; awayGoals: number; awayPoints: number }
  ): Promise<string> {
    return this.runAction([
      'fixture',
      'score',
      String(tournamentId),
      String(fixtureId),
      '--home-goals',
      String(scores.homeGoals),
      '--home-points',
      String(scores.homePoints),
      '--away-goals',
      String(scores.awayGoals),
      '--away-points',
      String(scores.awayPoints)
    ]);
  }

  async renderText(args: string[]): Promise<string> {
    const result = await this.runCli(args);
    const output = cleanOutput(result.stdout);
    return output || cleanOutput(result.stderr) || 'No output';
  }

  private async runJson<T>(args: string[], emptyValue: T): Promise<T> {
    const result = await this.runCli(['--format', 'json', ...args]);
    return parseJsonOutput(result.stdout, emptyValue);
  }

  private async runAction(args: string[]): Promise<string> {
    const result = await this.runCli(args);
    return buildMessage(result.stdout, result.stderr);
  }

  private runCli(args: string[]): Promise<CliResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.processConfig.command, [...this.processConfig.baseArgs, ...args], {
        env: {
          ...process.env,
          FORCE_COLOR: '0'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('error', (error) => {
        reject(error);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
          return;
        }

        reject(new Error(buildMessage(stdout, stderr)));
      });
    });
  }
}
