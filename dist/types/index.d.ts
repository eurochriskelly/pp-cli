export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified: boolean;
}
export interface Tournament {
    id: number;
    uuid?: string;
    title: string;
    date: string;
    location: string;
    region: string;
    status: 'draft' | 'published' | 'started' | 'closed';
    userId?: number;
    lat?: number;
    lon?: number;
    codeOrganizer?: string;
    winPoints?: number;
    drawPoints?: number;
    lossPoints?: number;
    createdAt?: string;
    updatedAt?: string;
}
export interface TournamentSummary {
    id: number;
    title: string;
    date: string;
    location: string;
    region: string;
    status: string;
}
export interface Squad {
    id: number;
    tournamentId: number;
    name: string;
    category?: string;
    clubId?: number;
    players?: Player[];
}
export interface Player {
    id: number;
    name: string;
    number?: number;
    squadId?: number;
}
export interface Fixture {
    id: number;
    tournamentId: number;
    match: string;
    category?: string;
    pitch?: string;
    stage?: string;
    team1: string;
    team2: string;
    umpires?: string;
    time: string;
    duration?: number;
    status?: 'pending' | 'live' | 'completed';
    homeScore?: number;
    awayScore?: number;
    homeGoals?: number;
    awayGoals?: number;
}
export interface Championship {
    id: number;
    seriesId: number;
    year: number;
    rounds: number;
    status: 'draft' | 'open' | 'in-progress' | 'completed' | 'archived';
    series?: Series;
}
export interface Series {
    id: number;
    name: string;
    sport?: string;
    squadSize?: number;
}
export interface Entrant {
    id: number;
    championshipId: number;
    clubId?: number;
    displayName: string;
    status: string;
    isAmalgamation: boolean;
    clubs?: number[];
}
export interface Club {
    id: number;
    name: string;
    region: string;
    logoUrl?: string;
}
export interface Team {
    id: number;
    name: string;
    clubId: number;
    logoUrl?: string;
}
export interface Config {
    default: ConfigProfile;
    profiles: Record<string, ConfigProfile>;
}
export interface ConfigProfile {
    apiUrl: string;
    outputFormat: 'table' | 'json' | 'yaml';
    timeout: number;
}
export interface Session {
    currentProfile: string;
    sessions: Record<string, UserSession>;
}
export interface UserSession {
    token: string;
    userId: number;
    email: string;
    expiresAt: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export type OutputFormat = 'table' | 'json' | 'yaml' | 'csv';
export interface GlobalOptions {
    format?: OutputFormat;
    profile?: string;
    verbose?: boolean;
    apiUrl?: string;
}
//# sourceMappingURL=index.d.ts.map