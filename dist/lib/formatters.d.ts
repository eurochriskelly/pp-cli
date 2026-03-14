import type { OutputFormat, TournamentStandings } from '../types/index.js';
export interface FormatterOptions {
    format: OutputFormat;
    headers?: string[];
}
export declare function formatOutput(data: unknown, options: FormatterOptions): string;
export declare function formatStandings(data: TournamentStandings): string;
export declare function formatStandingsWithMatches(data: TournamentStandings, tournamentId: string, divisionFilter: string, groupFilter: string, client: {
    get: (path: string) => Promise<unknown[]>;
}): Promise<string>;
//# sourceMappingURL=formatters.d.ts.map