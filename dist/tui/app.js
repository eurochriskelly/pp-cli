"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = App;
const jsx_runtime_1 = require("@opentui/react/jsx-runtime");
const react_1 = require("react");
const cli_adapter_js_1 = require("./cli-adapter.js");
const opentui_react_js_1 = require("./opentui-react.js");
const SECTION_LABELS = {
    overview: 'Overview',
    standings: 'Standings',
    brackets: 'Brackets',
    fixtures: 'Fixtures'
};
const SCORE_FIELDS = ['homeGoals', 'homePoints', 'awayGoals', 'awayPoints'];
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
function formatFixtureScore(fixture) {
    const homeGoals = fixture.goals1 ?? 0;
    const homePoints = fixture.points1 ?? 0;
    const awayGoals = fixture.goals2 ?? 0;
    const awayPoints = fixture.points2 ?? 0;
    return `${homeGoals}-${homePoints.toString().padStart(2, '0')} : ${awayGoals}-${awayPoints.toString().padStart(2, '0')}`;
}
function stringifyData(data) {
    if (data === null || data === undefined) {
        return 'No data available.';
    }
    return JSON.stringify(data, null, 2);
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
function nextScoreField(current) {
    const currentIndex = SCORE_FIELDS.indexOf(current);
    return SCORE_FIELDS[(currentIndex + 1) % SCORE_FIELDS.length];
}
function App({ cliEntry }) {
    const renderer = (0, opentui_react_js_1.useRenderer)();
    const adapter = (0, react_1.useMemo)(() => new cli_adapter_js_1.CliAdapter(cliEntry), [cliEntry]);
    const [tournaments, setTournaments] = (0, react_1.useState)([]);
    const [selectedTournamentIndex, setSelectedTournamentIndex] = (0, react_1.useState)(0);
    const [activeSection, setActiveSection] = (0, react_1.useState)('overview');
    const [focusedArea, setFocusedArea] = (0, react_1.useState)('tournaments');
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [statusMessage, setStatusMessage] = (0, react_1.useState)('Loading tournaments…');
    const [errorMessage, setErrorMessage] = (0, react_1.useState)(null);
    const [bundle, setBundle] = (0, react_1.useState)(null);
    const [selectedFixtureIndex, setSelectedFixtureIndex] = (0, react_1.useState)(0);
    const [scoreForm, setScoreForm] = (0, react_1.useState)(null);
    const selectedTournament = tournaments[selectedTournamentIndex] ?? null;
    const fixtures = bundle?.fixtures ?? [];
    const selectedFixture = fixtures[selectedFixtureIndex] ?? null;
    const tournamentOptions = (0, react_1.useMemo)(() => tournaments.map((tournament) => ({
        name: `${tournament.title ?? tournament.name ?? `Tournament ${tournament.id}`}`,
        description: `${tournament.status ?? 'unknown'}  |  ${tournament.date ?? 'date n/a'}  |  ${tournament.location ?? 'location n/a'}`,
        value: tournament.id
    })), [tournaments]);
    const sectionOptions = (0, react_1.useMemo)(() => Object.keys(SECTION_LABELS).map((section) => ({
        name: SECTION_LABELS[section],
        description: section === 'fixtures' ? 'Live fixture controls and score updates' : `Inspect ${SECTION_LABELS[section].toLowerCase()} data`,
        value: section
    })), []);
    const fixtureOptions = (0, react_1.useMemo)(() => fixtures.map((fixture) => ({
        name: `${fixture.team1 ?? fixture.team1Id ?? 'TBD'} vs ${fixture.team2 ?? fixture.team2Id ?? 'TBD'}`,
        description: `${fixture.stage ?? fixture.category ?? 'fixture'}  |  ${fixture.pitch ?? 'pitch?'}  |  ${formatFixtureScore(fixture)}`,
        value: fixture.id
    })), [fixtures]);
    const detailText = (0, react_1.useMemo)(() => {
        if (!selectedTournament || !bundle) {
            return 'Select a tournament to inspect its data.';
        }
        if (activeSection === 'fixtures') {
            if (!selectedFixture) {
                return 'No fixtures available for this tournament.';
            }
            return stringifyData(selectedFixture);
        }
        if (activeSection === 'overview') {
            return stringifyData(bundle.overview);
        }
        if (activeSection === 'standings') {
            return stringifyData(bundle.standings);
        }
        return stringifyData(bundle.brackets);
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
                setStatusMessage('No tournaments found. Use the CLI to create one, then return to the TUI.');
                return;
            }
            const targetIndex = preferredTournamentId
                ? Math.max(0, nextTournaments.findIndex((tournament) => tournament.id === preferredTournamentId))
                : Math.min(selectedTournamentIndex, nextTournaments.length - 1);
            setSelectedTournamentIndex(targetIndex >= 0 ? targetIndex : 0);
            setStatusMessage(`Loaded ${nextTournaments.length} tournaments.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load tournaments';
            setErrorMessage(message);
            setBundle(null);
            setStatusMessage(message);
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
            setSelectedFixtureIndex((current) => {
                if (nextBundle.fixtures.length === 0) {
                    return 0;
                }
                return Math.min(current, nextBundle.fixtures.length - 1);
            });
            setStatusMessage(`Loaded tournament ${tournamentId}.`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : `Failed to load tournament ${tournamentId}`;
            setErrorMessage(message);
            setBundle(null);
            setStatusMessage(message);
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
        if (!selectedTournament || !selectedFixture || !scoreForm) {
            return;
        }
        const parsedScores = {
            homeGoals: Number.parseInt(scoreForm.homeGoals || '0', 10),
            homePoints: Number.parseInt(scoreForm.homePoints || '0', 10),
            awayGoals: Number.parseInt(scoreForm.awayGoals || '0', 10),
            awayPoints: Number.parseInt(scoreForm.awayPoints || '0', 10)
        };
        if (Object.values(parsedScores).some((value) => Number.isNaN(value) || value < 0)) {
            setErrorMessage('Scores must be non-negative integers.');
            setStatusMessage('Scores must be non-negative integers.');
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const message = await adapter.scoreFixture(selectedTournament.id, selectedFixture.id, parsedScores);
            setScoreForm(null);
            setStatusMessage(message);
            await refreshTournamentData(selectedTournament.id);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update fixture score';
            setErrorMessage(message);
            setStatusMessage(message);
            setLoading(false);
        }
    }
    function openScoreEditor() {
        if (!selectedFixture) {
            return;
        }
        setScoreForm({
            homeGoals: String(selectedFixture.goals1 ?? 0),
            homePoints: String(selectedFixture.points1 ?? 0),
            awayGoals: String(selectedFixture.goals2 ?? 0),
            awayPoints: String(selectedFixture.points2 ?? 0),
            focusedField: 'homeGoals'
        });
    }
    (0, react_1.useEffect)(() => {
        void refreshTournaments();
    }, []);
    (0, react_1.useEffect)(() => {
        if (!selectedTournament) {
            return;
        }
        void refreshTournamentData(selectedTournament.id);
    }, [selectedTournament?.id]);
    (0, opentui_react_js_1.useKeyboard)((key) => {
        if (key.name === 'q') {
            renderer.destroy();
            return;
        }
        if (scoreForm) {
            if (key.name === 'escape') {
                setScoreForm(null);
                setStatusMessage('Score update canceled.');
            }
            else if (key.name === 'tab') {
                setScoreForm((current) => current ? { ...current, focusedField: nextScoreField(current.focusedField) } : current);
            }
            return;
        }
        if (key.name === 'tab') {
            setFocusedArea((current) => nextFocusArea(current, activeSection));
            return;
        }
        if (key.name === 'r') {
            if (selectedTournament) {
                void refreshTournamentData(selectedTournament.id);
            }
            else {
                void refreshTournaments();
            }
            return;
        }
        if (key.name === '1')
            setActiveSection('overview');
        if (key.name === '2')
            setActiveSection('standings');
        if (key.name === '3')
            setActiveSection('brackets');
        if (key.name === '4')
            setActiveSection('fixtures');
        if (key.name === 'p') {
            void runTournamentAction('publish');
            return;
        }
        if (key.name === 'g') {
            void runTournamentAction('start');
            return;
        }
        if (key.name === 'c') {
            void runTournamentAction('close');
            return;
        }
        if (activeSection === 'fixtures' && selectedFixture) {
            if (key.name === 'x') {
                void runFixtureAction('start');
            }
            else if (key.name === 'e') {
                void runFixtureAction('end');
            }
            else if (key.name === 'u') {
                openScoreEditor();
            }
        }
    });
    return ((0, jsx_runtime_1.jsxs)("box", { style: {
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#0d1b2a'
        }, children: [(0, jsx_runtime_1.jsx)("box", { style: {
                    paddingLeft: 1,
                    paddingRight: 1,
                    paddingTop: 1,
                    paddingBottom: 1,
                    backgroundColor: '#10253d'
                }, children: (0, jsx_runtime_1.jsxs)("text", { children: ["PitchPerfect TUI  |  ", selectedTournament?.title ?? 'No tournament selected', "  |  ", SECTION_LABELS[activeSection]] }) }), (0, jsx_runtime_1.jsxs)("box", { style: { flexGrow: 1, flexDirection: 'row', padding: 1, gap: 1 }, children: [(0, jsx_runtime_1.jsxs)("box", { style: { width: 48, flexDirection: 'column', gap: 1 }, children: [(0, jsx_runtime_1.jsx)("box", { title: "Tournaments", border: true, style: { flexGrow: 1, minHeight: 12 }, children: (0, jsx_runtime_1.jsx)("select", { focused: focusedArea === 'tournaments' && !scoreForm, options: tournamentOptions, selectedIndex: selectedTournamentIndex, onChange: (index) => {
                                        setSelectedTournamentIndex(index);
                                        setSelectedFixtureIndex(0);
                                    }, style: {
                                        flexGrow: 1,
                                        backgroundColor: '#10253d',
                                        selectedBackgroundColor: '#d97d00',
                                        selectedTextColor: '#08111f',
                                        focusedBackgroundColor: '#10253d',
                                        focusedTextColor: '#f7f4ea'
                                    } }) }), (0, jsx_runtime_1.jsx)("box", { title: "Sections", border: true, style: { height: 12 }, children: (0, jsx_runtime_1.jsx)("select", { focused: focusedArea === 'sections' && !scoreForm, options: sectionOptions, selectedIndex: Object.keys(SECTION_LABELS).indexOf(activeSection), onChange: (index, option) => {
                                        const section = (option?.value ?? sectionOptions[index]?.value);
                                        if (section) {
                                            setActiveSection(section);
                                            if (section !== 'fixtures' && focusedArea === 'fixtures') {
                                                setFocusedArea('tournaments');
                                            }
                                        }
                                    }, style: {
                                        flexGrow: 1,
                                        backgroundColor: '#10253d',
                                        selectedBackgroundColor: '#7bd389',
                                        selectedTextColor: '#08111f',
                                        focusedBackgroundColor: '#10253d',
                                        focusedTextColor: '#f7f4ea'
                                    } }) }), (0, jsx_runtime_1.jsx)("box", { title: "Tournament Actions", border: true, style: { padding: 1, minHeight: 7 }, children: (0, jsx_runtime_1.jsxs)("text", { children: ["p publish", '\n', "g start tournament", '\n', "c close tournament", '\n', "r refresh data"] }) })] }), (0, jsx_runtime_1.jsxs)("box", { style: { flexGrow: 1, flexDirection: 'column', gap: 1 }, children: [(0, jsx_runtime_1.jsx)("box", { title: "Details", border: true, style: { flexGrow: 1, minHeight: 16 }, children: (0, jsx_runtime_1.jsx)("scrollbox", { focused: false, style: {
                                        flexGrow: 1,
                                        rootOptions: { backgroundColor: '#142c46' },
                                        wrapperOptions: { backgroundColor: '#142c46' },
                                        viewportOptions: { backgroundColor: '#142c46' },
                                        contentOptions: { backgroundColor: '#142c46' }
                                    }, children: (0, jsx_runtime_1.jsx)("box", { style: { padding: 1 }, children: (0, jsx_runtime_1.jsx)("text", { children: detailText }) }) }) }), (0, jsx_runtime_1.jsx)("box", { title: "Selected Tournament", border: true, style: { minHeight: 8, padding: 1 }, children: (0, jsx_runtime_1.jsxs)("text", { children: ["id: ", selectedTournament?.id ?? '-', '\n', "status: ", selectedTournament?.status ?? '-', '\n', "date: ", selectedTournament?.date ?? '-', '\n', "location: ", selectedTournament?.location ?? '-', '\n', "region: ", selectedTournament?.region ?? '-'] }) })] }), (0, jsx_runtime_1.jsxs)("box", { style: { width: 52, flexDirection: 'column', gap: 1 }, children: [(0, jsx_runtime_1.jsx)("box", { title: "Fixtures", border: true, style: { flexGrow: 1, minHeight: 14 }, children: (0, jsx_runtime_1.jsx)("select", { focused: activeSection === 'fixtures' && focusedArea === 'fixtures' && !scoreForm, options: fixtureOptions, selectedIndex: selectedFixtureIndex, onChange: (index) => {
                                        setSelectedFixtureIndex(index);
                                    }, style: {
                                        flexGrow: 1,
                                        backgroundColor: '#13243a',
                                        selectedBackgroundColor: '#6ccff6',
                                        selectedTextColor: '#08111f',
                                        focusedBackgroundColor: '#13243a',
                                        focusedTextColor: '#f7f4ea'
                                    } }) }), (0, jsx_runtime_1.jsx)("box", { title: "Selected Fixture", border: true, style: { minHeight: 12, padding: 1 }, children: (0, jsx_runtime_1.jsxs)("text", { children: ["id: ", selectedFixture?.id ?? '-', '\n', "stage: ", selectedFixture?.stage ?? selectedFixture?.category ?? '-', '\n', "pitch: ", selectedFixture?.pitch ?? '-', '\n', "scheduled: ", formatDate(selectedFixture?.scheduled), '\n', "started: ", formatDate(selectedFixture?.started), '\n', "ended: ", formatDate(selectedFixture?.ended), '\n', "score: ", selectedFixture ? formatFixtureScore(selectedFixture) : '-'] }) }), (0, jsx_runtime_1.jsx)("box", { title: "Fixture Actions", border: true, style: { padding: 1, minHeight: 8 }, children: (0, jsx_runtime_1.jsxs)("text", { children: ["4 fixtures view", '\n', "x start match", '\n', "u update score", '\n', "e end match"] }) })] })] }), (0, jsx_runtime_1.jsx)("box", { style: {
                    paddingLeft: 1,
                    paddingRight: 1,
                    paddingTop: 1,
                    paddingBottom: 1,
                    backgroundColor: errorMessage ? '#5c1d1d' : '#17324d'
                }, children: (0, jsx_runtime_1.jsxs)("text", { children: [loading ? 'working…  |  ' : '', statusMessage, errorMessage ? `  |  error: ${errorMessage}` : ''] }) }), (0, jsx_runtime_1.jsx)("box", { style: {
                    paddingLeft: 1,
                    paddingRight: 1,
                    paddingBottom: 1,
                    backgroundColor: '#10253d'
                }, children: (0, jsx_runtime_1.jsx)("text", { children: "tab switch focus  |  1 overview  2 standings  3 brackets  4 fixtures  |  q quit" }) }), scoreForm ? ((0, jsx_runtime_1.jsxs)("box", { style: {
                    position: 'absolute',
                    left: 8,
                    top: 5,
                    width: 56,
                    border: true,
                    padding: 1,
                    backgroundColor: '#f4efe6',
                    flexDirection: 'column',
                    gap: 1
                }, children: [(0, jsx_runtime_1.jsxs)("text", { fg: "#08111f", children: ["Update Score  |  ", selectedFixture?.team1 ?? 'Home', " vs ", selectedFixture?.team2 ?? 'Away'] }), (0, jsx_runtime_1.jsx)("box", { title: "Home Goals", border: true, style: { height: 3 }, children: (0, jsx_runtime_1.jsx)("input", { value: scoreForm.homeGoals, focused: scoreForm.focusedField === 'homeGoals', onInput: (value) => {
                                setScoreForm((current) => (current ? { ...current, homeGoals: value } : current));
                            }, onSubmit: () => {
                                setScoreForm((current) => (current ? { ...current, focusedField: 'homePoints' } : current));
                            } }) }), (0, jsx_runtime_1.jsx)("box", { title: "Home Points", border: true, style: { height: 3 }, children: (0, jsx_runtime_1.jsx)("input", { value: scoreForm.homePoints, focused: scoreForm.focusedField === 'homePoints', onInput: (value) => {
                                setScoreForm((current) => (current ? { ...current, homePoints: value } : current));
                            }, onSubmit: () => {
                                setScoreForm((current) => (current ? { ...current, focusedField: 'awayGoals' } : current));
                            } }) }), (0, jsx_runtime_1.jsx)("box", { title: "Away Goals", border: true, style: { height: 3 }, children: (0, jsx_runtime_1.jsx)("input", { value: scoreForm.awayGoals, focused: scoreForm.focusedField === 'awayGoals', onInput: (value) => {
                                setScoreForm((current) => (current ? { ...current, awayGoals: value } : current));
                            }, onSubmit: () => {
                                setScoreForm((current) => (current ? { ...current, focusedField: 'awayPoints' } : current));
                            } }) }), (0, jsx_runtime_1.jsx)("box", { title: "Away Points", border: true, style: { height: 3 }, children: (0, jsx_runtime_1.jsx)("input", { value: scoreForm.awayPoints, focused: scoreForm.focusedField === 'awayPoints', onInput: (value) => {
                                setScoreForm((current) => (current ? { ...current, awayPoints: value } : current));
                            }, onSubmit: () => {
                                void submitScore();
                            } }) }), (0, jsx_runtime_1.jsx)("text", { fg: "#08111f", children: "enter advances and saves  |  tab cycles fields  |  esc cancels" })] })) : null] }));
}
//# sourceMappingURL=app.js.map