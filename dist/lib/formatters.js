"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatOutput = formatOutput;
exports.formatStandings = formatStandings;
exports.formatStandingsWithMatches = formatStandingsWithMatches;
const yaml = __importStar(require("js-yaml"));
function formatOutput(data, options) {
    switch (options.format) {
        case 'json':
            return formatJson(data);
        case 'yaml':
            return formatYaml(data);
        case 'csv':
            return formatCsv(data, options.headers);
        case 'table':
        default:
            return formatTable(data, options.headers);
    }
}
function formatJson(data) {
    return JSON.stringify(data, null, 2);
}
function formatYaml(data) {
    return yaml.dump(data);
}
function formatCsv(data, headers) {
    if (!data) {
        return '';
    }
    // Handle array of objects
    if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
            const cols = headers || Object.keys(firstItem);
            // Header row
            let csv = cols.join(',') + '\n';
            // Data rows
            for (const item of data) {
                const row = cols.map(col => {
                    const value = item[col];
                    return formatCsvValue(value);
                });
                csv += row.join(',') + '\n';
            }
            return csv;
        }
    }
    // Handle single object
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        const cols = headers || Object.keys(data);
        // Header row
        let csv = cols.join(',') + '\n';
        // Single data row
        const row = cols.map(col => {
            const value = data[col];
            return formatCsvValue(value);
        });
        csv += row.join(',') + '\n';
        return csv;
    }
    // Handle primitive
    return String(data);
}
function formatCsvValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const str = String(value);
    // Escape values containing commas, quotes, or newlines
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function formatTable(data, headers) {
    if (!data) {
        return 'No data';
    }
    // Handle array of objects
    if (Array.isArray(data)) {
        if (data.length === 0) {
            return 'No data';
        }
        const firstItem = data[0];
        if (typeof firstItem === 'object' && firstItem !== null) {
            const cols = headers || Object.keys(firstItem);
            // Calculate column widths
            const widths = cols.map(col => col.length);
            const rows = data.map(item => {
                return cols.map((col, index) => {
                    const value = formatCellValue(item[col]);
                    widths[index] = Math.max(widths[index], value.length);
                    return value;
                });
            });
            // Build output
            const lines = [];
            // Header row
            const headerRow = cols.map((col, i) => col.toUpperCase().padEnd(widths[i])).join('  ');
            lines.push(headerRow);
            // Separator line
            const separator = cols.map((_, i) => '-'.repeat(widths[i])).join('  ');
            lines.push(separator);
            // Data rows
            for (const row of rows) {
                const line = row.map((cell, i) => cell.padEnd(widths[i])).join('  ');
                lines.push(line);
            }
            return lines.join('\n');
        }
        // Array of primitives
        return data.map(item => formatCellValue(item)).join('\n');
    }
    // Handle single object
    if (typeof data === 'object' && data !== null) {
        const entries = Object.entries(data);
        const maxKeyLength = Math.max(...entries.map(([key]) => key.length));
        const lines = entries.map(([key, value]) => {
            return `${key.padEnd(maxKeyLength)}  ${formatCellValue(value)}`;
        });
        return lines.join('\n');
    }
    // Handle primitive
    return String(data);
}
function formatCellValue(value) {
    if (value === null || value === undefined) {
        return '-';
    }
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }
    if (typeof value === 'object') {
        if (Array.isArray(value)) {
            return value.length > 0 ? `[${value.length} items]` : '[]';
        }
        return '[Object]';
    }
    return String(value);
}
// Helper to get standings column value using PointsFrom and PointsDifference (not h2h stats)
function getStandingsColumnValue(team, colIndex) {
    switch (colIndex) {
        case 0: return String(team.position);
        case 1: return String(team.team);
        case 2: return String(team.MatchesPlayed);
        case 3: return String(team.Wins);
        case 4: return String(team.Draws);
        case 5: return String(team.Losses);
        case 6: return String(team.PointsFrom ?? '-'); // For
        case 7: { // Ag (calculate from For - Diff)
            const pointsFrom = parseInt(String(team.PointsFrom ?? '0'), 10);
            const pointsDiff = parseInt(String(team.PointsDifference ?? '0'), 10);
            return String(pointsFrom - pointsDiff);
        }
        case 8: return String(team.PointsDifference ?? '-'); // Diff
        case 9: return String(team.TotalPoints);
        default: return '-';
    }
}
function formatStandings(data) {
    const lines = [];
    // Collect all teams across all divisions/groups for calculating global column widths
    const allTeams = [];
    const divisions = [];
    for (const [divisionName, groups] of Object.entries(data)) {
        const groupList = [];
        for (const [groupNumber, teams] of Object.entries(groups)) {
            const teamArray = Array.isArray(teams) ? teams : [];
            allTeams.push(...teamArray);
            groupList.push({ number: groupNumber, teams: teamArray });
        }
        divisions.push({ name: divisionName, groups: groupList });
    }
    // Define columns for team standings
    const headers = ['Pos', 'Team', 'P', 'W', 'D', 'L', 'For', 'Ag', 'Diff', 'Pts'];
    const TEAM_COLUMN_WIDTH = 25;
    // Calculate global column widths based on all teams
    const widths = headers.map((h, i) => {
        if (i === 1)
            return Math.max(h.length, TEAM_COLUMN_WIDTH); // Team column fixed width
        if (allTeams.length === 0)
            return h.length;
        const maxDataWidth = Math.max(...allTeams.map(t => getStandingsColumnValue(t, i).length));
        return Math.max(h.length, maxDataWidth);
    });
    // Print global header once
    const headerRow = headers.map((h, i) => {
        if (i === 1)
            return h.padEnd(widths[i]); // Team column left-aligned
        return h.padStart(widths[i]); // Others right-aligned
    }).join(' ');
    lines.push('  ' + headerRow);
    // Print each division and group
    for (const division of divisions) {
        for (const group of division.groups) {
            lines.push(`  ${division.name}: Group ${group.number}`);
            if (group.teams.length === 0) {
                lines.push('  No teams');
                continue;
            }
            // Data rows
            for (const team of group.teams) {
                const row = headers.map((_, i) => {
                    let value;
                    if (i === 1) {
                        value = String(team.team ?? '-');
                        // Truncate long team names
                        if (value.length > TEAM_COLUMN_WIDTH) {
                            value = value.substring(0, TEAM_COLUMN_WIDTH - 1) + '…';
                        }
                        return value.padEnd(widths[i]);
                    }
                    else {
                        value = getStandingsColumnValue(team, i);
                        return value.padStart(widths[i]);
                    }
                }).join(' ');
                lines.push('  ' + row);
            }
        }
    }
    return lines.join('\n');
}
async function formatStandingsWithMatches(data, tournamentId, divisionFilter, groupFilter, client) {
    const lines = [];
    // Find the specific division and group
    const divisionData = data[divisionFilter];
    if (!divisionData) {
        return `Division "${divisionFilter}" not found`;
    }
    const groupData = divisionData[groupFilter];
    if (!groupData || !Array.isArray(groupData)) {
        return `Group "${groupFilter}" not found in division "${divisionFilter}"`;
    }
    const teams = groupData;
    // Define columns for team standings
    const headers = ['Pos', 'Team', 'P', 'W', 'D', 'L', 'For', 'Ag', 'Diff', 'Pts'];
    const TEAM_COLUMN_WIDTH = 25;
    // Calculate column widths
    const widths = headers.map((h, i) => {
        if (i === 1)
            return Math.max(h.length, TEAM_COLUMN_WIDTH);
        const maxDataWidth = Math.max(...teams.map(t => getStandingsColumnValue(t, i).length));
        return Math.max(h.length, maxDataWidth);
    });
    // Print header
    const headerRow = headers.map((h, i) => {
        if (i === 1)
            return h.padEnd(widths[i]);
        return h.padStart(widths[i]);
    }).join(' ');
    lines.push('  ' + headerRow);
    // Print team rows
    for (const team of teams) {
        const row = headers.map((_, i) => {
            let value;
            if (i === 1) {
                value = String(team.team ?? '-');
                if (value.length > TEAM_COLUMN_WIDTH) {
                    value = value.substring(0, TEAM_COLUMN_WIDTH - 1) + '…';
                }
                return value.padEnd(widths[i]);
            }
            else {
                value = getStandingsColumnValue(team, i);
                return value.padStart(widths[i]);
            }
        }).join(' ');
        lines.push('  ' + row);
    }
    // Fetch and display matches
    lines.push('');
    lines.push('  Matches:');
    lines.push('');
    try {
        const fixtures = await client.get(`/api/tournaments/${tournamentId}/fixtures`);
        // Filter fixtures by category, group, and stage (only group stage)
        const groupFixtures = fixtures.filter(f => f.category === divisionFilter &&
            f.groupNumber === parseInt(groupFilter, 10) &&
            f.stage === 'group' &&
            f.outcome === 'played');
        if (groupFixtures.length === 0) {
            lines.push('  No matches played yet');
        }
        else {
            for (const match of groupFixtures) {
                // Extract last 2 digits of match ID
                const matchId = String(match.id).slice(-2).padStart(2, '0');
                // Calculate totals
                const goals1 = match.goals1 || 0;
                const points1 = match.points1 || 0;
                const total1 = goals1 * 3 + points1;
                const goals2 = match.goals2 || 0;
                const points2 = match.points2 || 0;
                const total2 = goals2 * 3 + points2;
                // Format scores with 2 digits
                const formatScore = (g, p, t) => `${String(g).padStart(2, '0')}-${String(p).padStart(2, '0')} (${String(t).padStart(2, '0')})`;
                // Determine winner (put winning team on left)
                let leftTeam, rightTeam, leftScore, rightScore;
                if (total1 >= total2) {
                    leftTeam = match.team1 || 'TBD';
                    rightTeam = match.team2 || 'TBD';
                    leftScore = formatScore(goals1, points1, total1);
                    rightScore = formatScore(goals2, points2, total2);
                }
                else {
                    leftTeam = match.team2 || 'TBD';
                    rightTeam = match.team1 || 'TBD';
                    leftScore = formatScore(goals2, points2, total2);
                    rightScore = formatScore(goals1, points1, total1);
                }
                // Format: 01         BRUSSELS B  2-09 (15) vs 1-04 (07)  EINDHOVEN B
                // Match ID (2) + 9 spaces + Team (25 right-aligned) + 2 spaces + Score (9) + vs (4) + Score (9) + 2 spaces + Team (25 left-aligned)
                const TEAM_WIDTH = 25;
                // Truncate long team names
                const truncateTeam = (name) => {
                    if (name.length > TEAM_WIDTH) {
                        return name.substring(0, TEAM_WIDTH - 1) + '…';
                    }
                    return name;
                };
                const leftTeamFormatted = truncateTeam(leftTeam).padStart(TEAM_WIDTH, ' ');
                const rightTeamFormatted = truncateTeam(rightTeam).padEnd(TEAM_WIDTH, ' ');
                lines.push(`    ${matchId}         ${leftTeamFormatted}  ${leftScore} vs ${rightScore}  ${rightTeamFormatted}`);
            }
        }
    }
    catch (err) {
        lines.push('  Failed to load matches');
    }
    return lines.join('\n');
}
//# sourceMappingURL=formatters.js.map