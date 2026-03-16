#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, render, useApp, useInput } from 'ink';
const require = createRequire(import.meta.url);
const { CliAdapter } = require('./tui/cli-adapter.js');
const SECTION_KEYS = ['overview', 'standings', 'brackets', 'fixtures'];
const SECTION_LABELS = {
    overview: 'Overview',
    standings: 'Standings',
    brackets: 'Brackets',
    fixtures: 'Fixtures'
};
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function formatFixtureScore(fixture) {
    const homeGoals = fixture.goals1 ?? 0;
    const homePoints = fixture.points1 ?? 0;
    const awayGoals = fixture.goals2 ?? 0;
    const awayPoints = fixture.points2 ?? 0;
    return `${homeGoals}-${String(homePoints).padStart(2, '0')} : ${awayGoals}-${String(awayPoints).padStart(2, '0')}`;
}
function formatDate(value) {
    if (!value) {
        return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }
    return parsed.toLocaleString('en-IE', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
function clipMultiline(value, maxLines, maxWidth) {
    const lines = value.split('\n');
    const clipped = lines.slice(0, maxLines).map((line) => {
        if (line.length <= maxWidth) {
            return line;
        }
        return `${line.slice(0, Math.max(0, maxWidth - 1))}…`;
    });
    if (lines.length > maxLines) {
        clipped.push('…');
    }
    return clipped;
}
function clipInline(value, maxWidth) {
    if (value.length <= maxWidth) {
        return value;
    }
    return `${value.slice(0, Math.max(0, maxWidth - 1))}…`;
}
function parseScoreInput(value) {
    const numbers = value
        .trim()
        .split(/[^\d]+/)
        .filter(Boolean)
        .map((part) => Number.parseInt(part, 10));
    if (numbers.length !== 4 || numbers.some((part) => Number.isNaN(part) || part < 0)) {
        throw new Error('Enter four non-negative integers: HG HP AG AP');
    }
    return {
        homeGoals: numbers[0],
        homePoints: numbers[1],
        awayGoals: numbers[2],
        awayPoints: numbers[3]
    };
}
function nextFocusArea(current, activeSection) {
    if (activeSection === 'fixtures') {
        if (current === 'tournaments')
            return 'sections';
        if (current === 'sections')
            return 'fixtures';
        return 'tournaments';
    }
    return current === 'tournaments' ? 'sections' : 'tournaments';
}
function Panel(props) {
    const child = React.Children.only(props.children);
    return React.createElement(Box, {
        flexDirection: 'column',
        borderStyle: 'round',
        borderColor: props.borderColor ?? 'cyan',
        paddingX: 1,
        width: props.width,
        minHeight: props.minHeight,
        flexGrow: props.flexGrow
    }, React.createElement(Text, { color: props.borderColor ?? 'cyan' }, props.title), child);
}
function renderList(items, selectedIndex, color, maxWidth = 28) {
    if (items.length === 0) {
        return [React.createElement(Text, { key: 'empty', dimColor: true }, 'No items')];
    }
    const start = Math.max(0, selectedIndex - 5);
    const end = Math.min(items.length, start + 10);
    return items.slice(start, end).map((item, index) => {
        const absoluteIndex = start + index;
        const selected = absoluteIndex === selectedIndex;
        return React.createElement(Text, {
            key: `${item}-${absoluteIndex}`,
            color: selected ? color : 'white',
            inverse: selected
        }, `${selected ? '›' : ' '} ${clipInline(item, maxWidth)}`);
    });
}
function App({ cliEntry }) {
    const { exit } = useApp();
    const adapter = useMemo(() => new CliAdapter(cliEntry), [cliEntry]);
    const [tournaments, setTournaments] = useState([]);
    const [selectedTournamentIndex, setSelectedTournamentIndex] = useState(0);
    const [activeSection, setActiveSection] = useState('overview');
    const [focusedArea, setFocusedArea] = useState('tournaments');
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('Loading tournaments…');
    const [errorMessage, setErrorMessage] = useState(null);
    const [bundle, setBundle] = useState(null);
    const [selectedFixtureIndex, setSelectedFixtureIndex] = useState(0);
    const [isEditingScore, setIsEditingScore] = useState(false);
    const [scoreInput, setScoreInput] = useState('');
    const selectedTournament = tournaments[selectedTournamentIndex] ?? null;
    const fixtures = bundle?.fixtures ?? [];
    const selectedFixture = fixtures[selectedFixtureIndex] ?? null;
    const scoreMode = isEditingScore;
    const tournamentLines = tournaments.map((tournament) => `${tournament.id}. ${tournament.title ?? tournament.name ?? `Tournament ${tournament.id}`} [${tournament.status ?? 'unknown'}]`);
    const sectionLines = SECTION_KEYS.map((section) => `${SECTION_LABELS[section]}${section === activeSection ? ' *' : ''}`);
    const fixtureLines = fixtures.map((fixture) => `${fixture.team1 ?? fixture.team1Id ?? 'TBD'} vs ${fixture.team2 ?? fixture.team2Id ?? 'TBD'}  ${formatFixtureScore(fixture)}`);
    const detailText = useMemo(() => {
        if (!selectedTournament || !bundle) {
            return 'Select a tournament to inspect its data.';
        }
        if (activeSection === 'fixtures') {
            return JSON.stringify(selectedFixture ?? null, null, 2);
        }
        if (activeSection === 'overview') {
            return JSON.stringify(bundle.overview, null, 2);
        }
        if (activeSection === 'standings') {
            return JSON.stringify(bundle.standings, null, 2);
        }
        return JSON.stringify(bundle.brackets, null, 2);
    }, [activeSection, bundle, selectedFixture, selectedTournament]);
    async function refreshTournaments(preferredTournamentId) {
        setLoading(true);
        setErrorMessage(null);
        try {
            const nextTournaments = await adapter.listTournaments();
            setTournaments(nextTournaments);
            if (nextTournaments.length === 0) {
                setBundle(null);
                setSelectedTournamentIndex(0);
                setSelectedFixtureIndex(0);
                setStatusMessage('No tournaments found.');
                return;
            }
            const nextIndex = preferredTournamentId
                ? Math.max(0, nextTournaments.findIndex((tournament) => tournament.id === preferredTournamentId))
                : clamp(selectedTournamentIndex, 0, nextTournaments.length - 1);
            setSelectedTournamentIndex(nextIndex >= 0 ? nextIndex : 0);
            setStatusMessage(`Loaded ${nextTournaments.length} tournaments.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load tournaments';
            setErrorMessage(message);
            setStatusMessage(message);
            setBundle(null);
        }
        finally {
            setLoading(false);
        }
    }
    async function refreshTournamentData(tournamentId) {
        setLoading(true);
        setErrorMessage(null);
        setStatusMessage(`Refreshing tournament ${tournamentId}…`);
        try {
            const nextBundle = await adapter.fetchTournamentBundle(tournamentId);
            setBundle(nextBundle);
            setSelectedFixtureIndex((current) => clamp(current, 0, Math.max(0, nextBundle.fixtures.length - 1)));
            setStatusMessage(`Loaded tournament ${tournamentId}.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : `Failed to load tournament ${tournamentId}`;
            setErrorMessage(message);
            setStatusMessage(message);
            setBundle(null);
        }
        finally {
            setLoading(false);
        }
    }
    async function runTournamentAction(action) {
        if (!selectedTournament) {
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const message = action === 'publish'
                ? await adapter.publishTournament(selectedTournament.id)
                : action === 'start'
                    ? await adapter.startTournament(selectedTournament.id)
                    : await adapter.closeTournament(selectedTournament.id);
            setStatusMessage(message);
            await refreshTournaments(selectedTournament.id);
            await refreshTournamentData(selectedTournament.id);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : `Failed to ${action} tournament`;
            setErrorMessage(message);
            setStatusMessage(message);
            setLoading(false);
        }
    }
    async function runFixtureAction(action) {
        if (!selectedTournament || !selectedFixture) {
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const message = action === 'start'
                ? await adapter.startFixture(selectedTournament.id, selectedFixture.id)
                : await adapter.endFixture(selectedTournament.id, selectedFixture.id);
            setStatusMessage(message);
            await refreshTournamentData(selectedTournament.id);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : `Failed to ${action} fixture`;
            setErrorMessage(message);
            setStatusMessage(message);
            setLoading(false);
        }
    }
    async function submitScore() {
        if (!selectedTournament || !selectedFixture) {
            return;
        }
        try {
            const parsed = parseScoreInput(scoreInput);
            setLoading(true);
            setErrorMessage(null);
            const message = await adapter.scoreFixture(selectedTournament.id, selectedFixture.id, parsed);
            setIsEditingScore(false);
            setScoreInput('');
            setStatusMessage(message);
            await refreshTournamentData(selectedTournament.id);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update score';
            setErrorMessage(message);
            setStatusMessage(message);
            setLoading(false);
        }
    }
    function openScoreEditor() {
        if (!selectedFixture) {
            return;
        }
        setScoreInput(`${selectedFixture.goals1 ?? 0} ${selectedFixture.points1 ?? 0} ${selectedFixture.goals2 ?? 0} ${selectedFixture.points2 ?? 0}`);
        setIsEditingScore(true);
        setStatusMessage('Editing score. Enter HG HP AG AP.');
        setErrorMessage(null);
    }
    useEffect(() => {
        void refreshTournaments();
    }, []);
    useEffect(() => {
        if (!selectedTournament) {
            return;
        }
        void refreshTournamentData(selectedTournament.id);
    }, [selectedTournament?.id]);
    useInput((input, key) => {
        if (scoreMode) {
            if (key.return) {
                void submitScore();
                return;
            }
            if (key.escape) {
                setIsEditingScore(false);
                setScoreInput('');
                setStatusMessage('Score update canceled.');
                return;
            }
            if (key.backspace || key.delete) {
                setScoreInput((current) => current.slice(0, -1));
                return;
            }
            if (input && /^[0-9\s-]$/.test(input)) {
                setScoreInput((current) => `${current}${input}`);
            }
            return;
        }
        if (input === 'q' || key.escape) {
            exit();
            return;
        }
        if (key.tab) {
            setFocusedArea((current) => nextFocusArea(current, activeSection));
            return;
        }
        if (input === 'r') {
            if (selectedTournament) {
                void refreshTournamentData(selectedTournament.id);
            }
            else {
                void refreshTournaments();
            }
            return;
        }
        if (key.upArrow || input === 'k') {
            if (focusedArea === 'tournaments' && tournaments.length > 0) {
                setSelectedTournamentIndex((current) => clamp(current - 1, 0, tournaments.length - 1));
            }
            else if (focusedArea === 'sections') {
                setActiveSection((current) => SECTION_KEYS[clamp(SECTION_KEYS.indexOf(current) - 1, 0, SECTION_KEYS.length - 1)]);
            }
            else if (focusedArea === 'fixtures' && fixtures.length > 0) {
                setSelectedFixtureIndex((current) => clamp(current - 1, 0, fixtures.length - 1));
            }
            return;
        }
        if (key.downArrow || input === 'j') {
            if (focusedArea === 'tournaments' && tournaments.length > 0) {
                setSelectedTournamentIndex((current) => clamp(current + 1, 0, tournaments.length - 1));
            }
            else if (focusedArea === 'sections') {
                setActiveSection((current) => SECTION_KEYS[clamp(SECTION_KEYS.indexOf(current) + 1, 0, SECTION_KEYS.length - 1)]);
            }
            else if (focusedArea === 'fixtures' && fixtures.length > 0) {
                setSelectedFixtureIndex((current) => clamp(current + 1, 0, fixtures.length - 1));
            }
            return;
        }
        if (input === '1')
            setActiveSection('overview');
        if (input === '2')
            setActiveSection('standings');
        if (input === '3')
            setActiveSection('brackets');
        if (input === '4')
            setActiveSection('fixtures');
        if (input === 'p') {
            void runTournamentAction('publish');
            return;
        }
        if (input === 'g') {
            void runTournamentAction('start');
            return;
        }
        if (input === 'c') {
            void runTournamentAction('close');
            return;
        }
        if (activeSection === 'fixtures' && selectedFixture) {
            if (input === 'x') {
                void runFixtureAction('start');
            }
            else if (input === 'e') {
                void runFixtureAction('end');
            }
            else if (input === 'u') {
                openScoreEditor();
            }
        }
    });
    const contentLines = clipMultiline(detailText, 26, 78);
    return React.createElement(Box, { flexDirection: 'column', paddingX: 1, paddingY: 1 }, React.createElement(Box, { marginBottom: 1 }, React.createElement(Text, { color: 'cyanBright' }, `PitchPerfect TUI  |  ${selectedTournament?.title ?? 'No tournament selected'}  |  ${SECTION_LABELS[activeSection]}`)), React.createElement(Box, { flexDirection: 'row', gap: 1 }, React.createElement(Box, { flexDirection: 'column', width: 36, marginRight: 1 }, React.createElement(Panel, { title: `Tournaments${focusedArea === 'tournaments' ? ' [focus]' : ''}`, minHeight: 12, borderColor: 'yellow' }, React.createElement(Box, { flexDirection: 'column' }, ...renderList(tournamentLines, selectedTournamentIndex, 'yellow', 26))), React.createElement(Box, { height: 1 }, React.createElement(Text, null, '')), React.createElement(Panel, { title: `Sections${focusedArea === 'sections' ? ' [focus]' : ''}`, minHeight: 8, borderColor: 'green' }, React.createElement(Box, { flexDirection: 'column' }, ...renderList(sectionLines, SECTION_KEYS.indexOf(activeSection), 'green', 18))), React.createElement(Box, { height: 1 }, React.createElement(Text, null, '')), React.createElement(Panel, { title: 'Tournament Actions', minHeight: 6, borderColor: 'magenta' }, React.createElement(Box, { flexDirection: 'column' }, React.createElement(Text, null, 'p publish'), React.createElement(Text, null, 'g start tournament'), React.createElement(Text, null, 'c close tournament'), React.createElement(Text, null, 'r refresh')))), React.createElement(Box, { flexDirection: 'column', flexGrow: 1, marginRight: 1 }, React.createElement(Panel, { title: 'Details', minHeight: 28, borderColor: 'blue', flexGrow: 1 }, React.createElement(Box, { flexDirection: 'column' }, ...contentLines.map((line, index) => React.createElement(Text, { key: `detail-${index}` }, line)))), React.createElement(Box, { height: 1 }, React.createElement(Text, null, '')), React.createElement(Panel, { title: 'Selected Tournament', minHeight: 8, borderColor: 'cyan' }, React.createElement(Box, { flexDirection: 'column' }, React.createElement(Text, null, `id: ${selectedTournament?.id ?? '-'}`), React.createElement(Text, null, `status: ${selectedTournament?.status ?? '-'}`), React.createElement(Text, null, `date: ${selectedTournament?.date ?? '-'}`), React.createElement(Text, null, `location: ${selectedTournament?.location ?? '-'}`), React.createElement(Text, null, `region: ${selectedTournament?.region ?? '-'}`)))), React.createElement(Box, { flexDirection: 'column', width: 42 }, React.createElement(Panel, { title: `Fixtures${focusedArea === 'fixtures' ? ' [focus]' : ''}`, minHeight: 14, borderColor: 'red' }, React.createElement(Box, { flexDirection: 'column' }, ...renderList(fixtureLines, selectedFixtureIndex, 'red', 34))), React.createElement(Box, { height: 1 }, React.createElement(Text, null, '')), React.createElement(Panel, { title: 'Selected Fixture', minHeight: 10, borderColor: 'redBright' }, React.createElement(Box, { flexDirection: 'column' }, React.createElement(Text, null, `id: ${selectedFixture?.id ?? '-'}`), React.createElement(Text, null, `stage: ${selectedFixture?.stage ?? selectedFixture?.category ?? '-'}`), React.createElement(Text, null, `pitch: ${selectedFixture?.pitch ?? '-'}`), React.createElement(Text, null, `scheduled: ${formatDate(selectedFixture?.scheduled)}`), React.createElement(Text, null, `started: ${formatDate(selectedFixture?.started)}`), React.createElement(Text, null, `ended: ${formatDate(selectedFixture?.ended)}`), React.createElement(Text, null, `score: ${selectedFixture ? formatFixtureScore(selectedFixture) : '-'}`))), React.createElement(Box, { height: 1 }, React.createElement(Text, null, '')), React.createElement(Panel, { title: 'Fixture Actions', minHeight: 6, borderColor: 'yellowBright' }, React.createElement(Box, { flexDirection: 'column' }, React.createElement(Text, null, '4 fixtures view'), React.createElement(Text, null, 'x start match'), React.createElement(Text, null, 'u update score'), React.createElement(Text, null, 'e end match'))))), React.createElement(Box, { marginTop: 1, flexDirection: 'column' }, React.createElement(Text, { color: errorMessage ? 'red' : loading ? 'yellow' : 'green' }, `${loading ? 'working…  |  ' : ''}${statusMessage}${errorMessage ? `  |  error: ${errorMessage}` : ''}`), React.createElement(Text, { dimColor: true }, 'tab switch focus  |  arrows/jk move  |  1-4 switch section  |  q quit')), scoreMode
        ? React.createElement(Box, { marginTop: 1, flexDirection: 'column', borderStyle: 'round', borderColor: 'magenta', paddingX: 1 }, React.createElement(Text, { color: 'magentaBright' }, 'Update score: enter HG HP AG AP'), React.createElement(Text, null, scoreInput || ' '), React.createElement(Text, { dimColor: true }, 'Enter submits. Esc cancels.'))
        : null);
}
const cliEntry = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'index.js');
render(React.createElement(App, { cliEntry }));
//# sourceMappingURL=tui.mjs.map