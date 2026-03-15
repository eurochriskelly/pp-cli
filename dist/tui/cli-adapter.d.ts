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
export declare class CliAdapter {
    private readonly processConfig;
    constructor(processConfig: CliProcessConfig);
    listTournaments(): Promise<TournamentRecord[]>;
    listSquads(tournamentId: number): Promise<SquadRecord[]>;
    listChampionships(): Promise<ChampionshipRecord[]>;
    listClubs(): Promise<ClubRecord[]>;
    listTeams(): Promise<TeamRecord[]>;
    listSeries(): Promise<SeriesRecord[]>;
    listFixtures(tournamentId: number): Promise<FixtureRecord[]>;
    fetchTournamentBundle(tournamentId: number): Promise<TournamentBundle>;
    publishTournament(tournamentId: number): Promise<string>;
    startTournament(tournamentId: number): Promise<string>;
    closeTournament(tournamentId: number): Promise<string>;
    startFixture(tournamentId: number, fixtureId: number): Promise<string>;
    endFixture(tournamentId: number, fixtureId: number): Promise<string>;
    scoreFixture(tournamentId: number, fixtureId: number, scores: {
        homeGoals: number;
        homePoints: number;
        awayGoals: number;
        awayPoints: number;
    }): Promise<string>;
    renderText(args: string[]): Promise<string>;
    private runJson;
    private runAction;
    private runCli;
}
export {};
//# sourceMappingURL=cli-adapter.d.ts.map