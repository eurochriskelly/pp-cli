"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CliAdapter = void 0;
const node_child_process_1 = require("node:child_process");
const ANSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;
function cleanOutput(value) {
    return value.replace(ANSI_PATTERN, '').trim();
}
function isJsonPayload(value) {
    return value.startsWith('{') || value.startsWith('[');
}
function parseJsonOutput(stdout, emptyValue) {
    const cleaned = cleanOutput(stdout);
    if (!cleaned) {
        return emptyValue;
    }
    if (isJsonPayload(cleaned)) {
        return JSON.parse(cleaned);
    }
    if (/No .* found/i.test(cleaned) || cleaned === 'No data') {
        return emptyValue;
    }
    throw new Error(`Expected JSON output, received: ${cleaned}`);
}
function buildMessage(stdout, stderr) {
    const cleanedStdout = cleanOutput(stdout);
    const cleanedStderr = cleanOutput(stderr);
    return cleanedStdout || cleanedStderr || 'Command completed';
}
function normalizeTournamentRecord(record) {
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
function normalizeSquadRecord(record) {
    return {
        id: Number(record.id ?? record.Id ?? 0),
        name: String(record.name ?? record.Name ?? record.teamName ?? ''),
        category: String(record.category ?? record.Category ?? '')
    };
}
function normalizeChampionshipRecord(record) {
    return {
        id: Number(record.id ?? record.Id ?? 0),
        year: Number(record.year ?? record.Year ?? 0),
        status: String(record.status ?? record.Status ?? ''),
        seriesId: Number(record.seriesId ?? record.SeriesId ?? 0)
    };
}
function normalizeClubRecord(record) {
    return {
        id: Number(record.id ?? record.Id ?? 0),
        name: String(record.name ?? record.Name ?? ''),
        region: String(record.region ?? record.Region ?? '')
    };
}
function normalizeTeamRecord(record) {
    return {
        id: Number(record.id ?? record.Id ?? 0),
        name: String(record.name ?? record.Name ?? ''),
        clubId: Number(record.clubId ?? record.ClubId ?? 0)
    };
}
function normalizeSeriesRecord(record) {
    return {
        id: Number(record.id ?? record.Id ?? 0),
        name: String(record.name ?? record.Name ?? ''),
        sport: String(record.sport ?? record.Sport ?? '')
    };
}
class CliAdapter {
    processConfig;
    constructor(processConfig) {
        this.processConfig = processConfig;
    }
    async listTournaments() {
        const result = await this.runJson(['tournament', 'list'], []);
        return Array.isArray(result) ? result.map((record) => normalizeTournamentRecord(record)) : [];
    }
    async listSquads(tournamentId) {
        const result = await this.runJson(['squad', 'list', String(tournamentId)], []);
        return Array.isArray(result) ? result.map((record) => normalizeSquadRecord(record)) : [];
    }
    async listChampionships() {
        const result = await this.runJson(['championship', 'list'], []);
        return Array.isArray(result) ? result.map((record) => normalizeChampionshipRecord(record)) : [];
    }
    async listClubs() {
        const result = await this.runJson(['club', 'list'], []);
        return Array.isArray(result) ? result.map((record) => normalizeClubRecord(record)) : [];
    }
    async listTeams() {
        const result = await this.runJson(['team', 'list'], []);
        return Array.isArray(result) ? result.map((record) => normalizeTeamRecord(record)) : [];
    }
    async listSeries() {
        const result = await this.runJson(['series', 'list'], []);
        return Array.isArray(result) ? result.map((record) => normalizeSeriesRecord(record)) : [];
    }
    async listFixtures(tournamentId) {
        const result = await this.runJson(['fixture', 'list', String(tournamentId), '--detailed'], []);
        return Array.isArray(result) ? result : [];
    }
    async fetchTournamentBundle(tournamentId) {
        const [overview, standings, brackets, fixtures] = await Promise.all([
            this.runJson(['tournament', 'overview', String(tournamentId)], null),
            this.runJson(['tournament', 'standings', String(tournamentId)], null),
            this.runJson(['tournament', 'brackets', String(tournamentId)], null),
            this.runJson(['fixture', 'list', String(tournamentId), '--detailed'], [])
        ]);
        return {
            overview,
            standings,
            brackets,
            fixtures: Array.isArray(fixtures) ? fixtures : []
        };
    }
    async publishTournament(tournamentId) {
        return this.runAction(['tournament', 'publish', String(tournamentId)]);
    }
    async startTournament(tournamentId) {
        return this.runAction(['tournament', 'start', String(tournamentId)]);
    }
    async closeTournament(tournamentId) {
        return this.runAction(['tournament', 'close', String(tournamentId)]);
    }
    async startFixture(tournamentId, fixtureId) {
        return this.runAction(['fixture', 'start', String(tournamentId), String(fixtureId)]);
    }
    async endFixture(tournamentId, fixtureId) {
        return this.runAction(['fixture', 'end', String(tournamentId), String(fixtureId)]);
    }
    async scoreFixture(tournamentId, fixtureId, scores) {
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
    async renderText(args) {
        const result = await this.runCli(args);
        const output = cleanOutput(result.stdout);
        return output || cleanOutput(result.stderr) || 'No output';
    }
    async runJson(args, emptyValue) {
        const result = await this.runCli(['--format', 'json', ...args]);
        return parseJsonOutput(result.stdout, emptyValue);
    }
    async runAction(args) {
        const result = await this.runCli(args);
        return buildMessage(result.stdout, result.stderr);
    }
    runCli(args) {
        return new Promise((resolve, reject) => {
            const child = (0, node_child_process_1.spawn)(this.processConfig.command, [...this.processConfig.baseArgs, ...args], {
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
exports.CliAdapter = CliAdapter;
//# sourceMappingURL=cli-adapter.js.map