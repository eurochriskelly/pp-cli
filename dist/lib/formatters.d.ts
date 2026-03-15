import type { Championship, OutputFormat, Series, TournamentStandings, TournamentSummary } from '../types/index.js';
export interface FormatterOptions {
    format: OutputFormat;
    headers?: string[];
}
export declare function formatOutput(data: unknown, options: FormatterOptions): string;
export declare function formatStandings(data: TournamentStandings): string;
export declare function formatStandingsWithMatches(data: TournamentStandings, tournamentId: string, divisionFilter: string, groupFilter: string, client: {
    get: (path: string) => Promise<unknown[]>;
}): Promise<string>;
export interface TournamentListOptions {
    format: OutputFormat;
    includeOldClosed?: boolean;
}
export declare function formatTournamentList(tournaments: TournamentSummary[], options: TournamentListOptions): string;
export interface SeriesListOptions {
    format: OutputFormat;
    championships?: Championship[];
}
export declare function formatSeriesList(series: Series[], options: SeriesListOptions): string;
//# sourceMappingURL=formatters.d.ts.map