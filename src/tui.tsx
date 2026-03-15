#!/usr/bin/env bun
/** @jsxImportSource @opentui/react */

import { createCliRenderer } from '@opentui/core';
import { createRoot, useKeyboard } from '@opentui/react';
import { useEffect, useMemo, useState } from 'react';
import {
  CliAdapter,
  type ChampionshipRecord,
  type ClubRecord,
  type FixtureRecord,
  type SeriesRecord,
  type SquadRecord,
  type TeamRecord,
  type TournamentRecord
} from './tui/cli-adapter.js';

type DomainKey = 'auth' | 'tournaments' | 'fixtures' | 'squads' | 'championships' | 'clubs' | 'teams' | 'series';
type FocusArea = 'domains' | 'views' | 'primary' | 'secondary' | 'command';
type TournamentFormField = 'title' | 'date' | 'location' | 'region';

interface ViewDefinition {
  id: string;
  label: string;
  description: string;
  autoRun: boolean;
  buildCommand: (context: CommandContext) => string;
}

interface CommandContext {
  tournament?: TournamentRecord | null;
  fixture?: FixtureRecord | null;
  squad?: SquadRecord | null;
  championship?: ChampionshipRecord | null;
  club?: ClubRecord | null;
  team?: TeamRecord | null;
  series?: SeriesRecord | null;
}

const DOMAIN_LABELS: Record<DomainKey, string> = {
  auth: 'Auth',
  tournaments: 'Tournaments',
  fixtures: 'Fixtures',
  squads: 'Squads',
  championships: 'Championships',
  clubs: 'Clubs',
  teams: 'Teams',
  series: 'Series'
};

const DOMAIN_ORDER: DomainKey[] = ['auth', 'tournaments', 'fixtures', 'squads', 'championships', 'clubs', 'teams', 'series'];

const VIEWS: Record<DomainKey, ViewDefinition[]> = {
  auth: [
    { id: 'whoami', label: 'Who Am I', description: 'Show current session', autoRun: true, buildCommand: () => 'ppx auth whoami' },
    { id: 'login', label: 'Login Template', description: 'Edit credentials in command box', autoRun: false, buildCommand: () => 'ppx auth login -e you@example.com -p secret' },
    { id: 'logout', label: 'Logout', description: 'Clear current session', autoRun: false, buildCommand: () => 'ppx auth logout' }
  ],
  tournaments: [
    { id: 'list', label: 'List', description: 'CLI list view', autoRun: true, buildCommand: () => 'ppx tournament list' },
    {
      id: 'overview',
      label: 'Overview',
      description: 'Tournament overview',
      autoRun: true,
      buildCommand: ({ tournament }) => `ppx tournament overview ${tournament?.id ?? 0}`
    },
    {
      id: 'standings',
      label: 'Standings',
      description: 'Formatted group standings',
      autoRun: true,
      buildCommand: ({ tournament }) => `ppx tournament standings ${tournament?.id ?? 0}`
    },
    {
      id: 'brackets',
      label: 'Brackets',
      description: 'Knockout fixtures',
      autoRun: true,
      buildCommand: ({ tournament }) => `ppx tournament brackets ${tournament?.id ?? 0}`
    },
    {
      id: 'publish',
      label: 'Publish',
      description: 'Lifecycle action',
      autoRun: false,
      buildCommand: ({ tournament }) => `ppx tournament publish ${tournament?.id ?? 0}`
    },
    {
      id: 'start',
      label: 'Start',
      description: 'Make tournament live',
      autoRun: false,
      buildCommand: ({ tournament }) => `ppx tournament start ${tournament?.id ?? 0}`
    },
    {
      id: 'close',
      label: 'Close',
      description: 'Close tournament',
      autoRun: false,
      buildCommand: ({ tournament }) => `ppx tournament close ${tournament?.id ?? 0}`
    }
  ],
  fixtures: [
    {
      id: 'list',
      label: 'Fixture List',
      description: 'Compressed fixture table',
      autoRun: true,
      buildCommand: ({ tournament }) => `ppx fixture list ${tournament?.id ?? 0}`
    },
    {
      id: 'get',
      label: 'Fixture Detail',
      description: 'Detailed fixture output',
      autoRun: true,
      buildCommand: ({ tournament, fixture }) => `ppx fixture get ${tournament?.id ?? 0} ${fixture?.id ?? 0}`
    },
    {
      id: 'cards',
      label: 'Cards',
      description: 'List cards for selected fixture',
      autoRun: true,
      buildCommand: ({ tournament, fixture }) => `ppx fixture cards ${tournament?.id ?? 0} ${fixture?.id ?? 0}`
    },
    {
      id: 'start',
      label: 'Start Fixture',
      description: 'Lifecycle action',
      autoRun: false,
      buildCommand: ({ tournament, fixture }) => `ppx fixture start ${tournament?.id ?? 0} ${fixture?.id ?? 0}`
    },
    {
      id: 'score',
      label: 'Score Template',
      description: 'Edit goals and points in command box',
      autoRun: false,
      buildCommand: ({ tournament, fixture }) =>
        `ppx fixture score ${tournament?.id ?? 0} ${fixture?.id ?? 0} --home-goals 0 --home-points 0 --away-goals 0 --away-points 0`
    },
    {
      id: 'end',
      label: 'End Fixture',
      description: 'Lifecycle action',
      autoRun: false,
      buildCommand: ({ tournament, fixture }) => `ppx fixture end ${tournament?.id ?? 0} ${fixture?.id ?? 0}`
    }
  ],
  squads: [
    {
      id: 'list',
      label: 'Squad List',
      description: 'List squads in the tournament',
      autoRun: true,
      buildCommand: ({ tournament }) => `ppx squad list ${tournament?.id ?? 0}`
    },
    {
      id: 'get',
      label: 'Squad Detail',
      description: 'Inspect selected squad',
      autoRun: true,
      buildCommand: ({ tournament, squad }) => `ppx squad get ${tournament?.id ?? 0} ${squad?.id ?? 0}`
    },
    {
      id: 'players',
      label: 'Players',
      description: 'List squad players',
      autoRun: true,
      buildCommand: ({ tournament, squad }) => `ppx squad players ${tournament?.id ?? 0} ${squad?.id ?? 0}`
    },
    {
      id: 'add-player',
      label: 'Add Player Template',
      description: 'Edit player details in command box',
      autoRun: false,
      buildCommand: ({ tournament, squad }) => `ppx squad add-player ${tournament?.id ?? 0} ${squad?.id ?? 0} -n "New Player" --number 0`
    }
  ],
  championships: [
    { id: 'list', label: 'List', description: 'List championships', autoRun: true, buildCommand: () => 'ppx championship list' },
    {
      id: 'get',
      label: 'Detail',
      description: 'Get selected championship',
      autoRun: true,
      buildCommand: ({ championship }) => `ppx championship get ${championship?.id ?? 0}`
    },
    {
      id: 'entrants',
      label: 'Entrants',
      description: 'List championship entrants',
      autoRun: true,
      buildCommand: ({ championship }) => `ppx championship entrants ${championship?.id ?? 0}`
    },
    {
      id: 'standings',
      label: 'Standings',
      description: 'Championship standings',
      autoRun: true,
      buildCommand: ({ championship }) => `ppx championship standings ${championship?.id ?? 0}`
    },
    {
      id: 'open',
      label: 'Open',
      description: 'Open registrations',
      autoRun: false,
      buildCommand: ({ championship }) => `ppx championship open ${championship?.id ?? 0}`
    },
    {
      id: 'start',
      label: 'Start',
      description: 'Start championship',
      autoRun: false,
      buildCommand: ({ championship }) => `ppx championship start ${championship?.id ?? 0}`
    },
    {
      id: 'complete',
      label: 'Complete',
      description: 'Mark complete',
      autoRun: false,
      buildCommand: ({ championship }) => `ppx championship complete ${championship?.id ?? 0}`
    }
  ],
  clubs: [
    { id: 'list', label: 'List', description: 'List clubs', autoRun: true, buildCommand: () => 'ppx club list' },
    {
      id: 'get',
      label: 'Detail',
      description: 'Get selected club',
      autoRun: true,
      buildCommand: ({ club }) => `ppx club get ${club?.id ?? 0}`
    },
    {
      id: 'create',
      label: 'Create Template',
      description: 'Edit club command in command box',
      autoRun: false,
      buildCommand: () => 'ppx club create -n "New Club" -r "Region"'
    }
  ],
  teams: [
    { id: 'list', label: 'List', description: 'List teams', autoRun: true, buildCommand: () => 'ppx team list' },
    {
      id: 'get',
      label: 'Detail',
      description: 'Get selected team',
      autoRun: true,
      buildCommand: ({ team }) => `ppx team get ${team?.id ?? 0}`
    },
    {
      id: 'create',
      label: 'Create Template',
      description: 'Edit team command in command box',
      autoRun: false,
      buildCommand: ({ club }) => `ppx team create -n "New Team" -c ${club?.id ?? 0}`
    }
  ],
  series: [
    { id: 'list', label: 'List', description: 'List series', autoRun: true, buildCommand: () => 'ppx series list' },
    {
      id: 'get',
      label: 'Detail',
      description: 'Get selected series',
      autoRun: true,
      buildCommand: ({ series }) => `ppx series get ${series?.id ?? 0}`
    },
    {
      id: 'create',
      label: 'Create Template',
      description: 'Edit series command in command box',
      autoRun: false,
      buildCommand: () => 'ppx series create -n "New Series" -s "Sport"'
    }
  ]
};

function parseCommand(command: string): string[] {
  const matches = command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  const tokens = matches.map((token) => token.replace(/^['"]|['"]$/g, ''));
  if (tokens[0] === 'ppx' || tokens[0] === 'pp-cli') {
    return tokens.slice(1);
  }
  return tokens;
}

function clipLine(value: string, maxWidth: number): string {
  if (value.length <= maxWidth) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxWidth - 1))}…`;
}

function renderOutputLines(value: string, maxLines: number, maxWidth: number): string[] {
  const lines = value.split('\n');
  const clipped = lines.slice(0, maxLines).map((line) => clipLine(line, maxWidth));
  if (lines.length > maxLines) {
    clipped.push('…');
  }
  return clipped;
}

function nextFocus(current: FocusArea, domain: DomainKey): FocusArea {
  const order: FocusArea[] = ['domains', 'views', 'primary', 'secondary', 'command'];
  const availableSecondary = domain === 'fixtures' || domain === 'squads';
  const filtered = availableSecondary ? order : order.filter((item) => item !== 'secondary');
  const currentIndex = filtered.indexOf(current);
  return filtered[(currentIndex + 1) % filtered.length];
}

function getPrimaryLabel(domain: DomainKey): string {
  switch (domain) {
    case 'tournaments':
    case 'fixtures':
    case 'squads':
      return 'Tournament';
    case 'championships':
      return 'Championship';
    case 'clubs':
      return 'Club';
    case 'teams':
      return 'Team';
    case 'series':
      return 'Series';
    default:
      return 'Context';
  }
}

function getSecondaryLabel(domain: DomainKey): string | null {
  if (domain === 'fixtures') return 'Fixture';
  if (domain === 'squads') return 'Squad';
  return null;
}

function toOption<T>(items: T[], selectedIndex: number, labeler: (item: T) => string, maxWidth = 26): { lines: string[]; selectedIndex: number } {
  const lines = items.map((item) => labeler(item));
  return {
    lines: lines.map((line) => clipLine(line, maxWidth)),
    selectedIndex
  };
}

function App() {
  const adapter = useMemo(() => new CliAdapter({ command: 'bun', baseArgs: ['src/index.ts'] }), []);
  const [domainIndex, setDomainIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);
  const [focusArea, setFocusArea] = useState<FocusArea>('domains');
  const [commandInput, setCommandInput] = useState('');
  const [output, setOutput] = useState('Loading CLI context…');
  const [status, setStatus] = useState('Booting Bun/OpenTUI shell…');
  const [busy, setBusy] = useState(true);
  const [tournaments, setTournaments] = useState<TournamentRecord[]>([]);
  const [tournamentIndex, setTournamentIndex] = useState(0);
  const [fixtures, setFixtures] = useState<FixtureRecord[]>([]);
  const [fixtureIndex, setFixtureIndex] = useState(0);
  const [squads, setSquads] = useState<SquadRecord[]>([]);
  const [squadIndex, setSquadIndex] = useState(0);
  const [championships, setChampionships] = useState<ChampionshipRecord[]>([]);
  const [championshipIndex, setChampionshipIndex] = useState(0);
  const [clubs, setClubs] = useState<ClubRecord[]>([]);
  const [clubIndex, setClubIndex] = useState(0);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [teamIndex, setTeamIndex] = useState(0);
  const [series, setSeries] = useState<SeriesRecord[]>([]);
  const [seriesIndex, setSeriesIndex] = useState(0);
  const [editingTournament, setEditingTournament] = useState<null | {
    title: string;
    date: string;
    location: string;
    region: string;
    focusedField: TournamentFormField;
  }>(null);
  const [confirmDeleteTournament, setConfirmDeleteTournament] = useState(false);

  const domain = DOMAIN_ORDER[domainIndex]!;
  const views = VIEWS[domain];
  const activeView = views[Math.min(viewIndex, views.length - 1)]!;

  const context: CommandContext = {
    tournament: tournaments[tournamentIndex] ?? null,
    fixture: fixtures[fixtureIndex] ?? null,
    squad: squads[squadIndex] ?? null,
    championship: championships[championshipIndex] ?? null,
    club: clubs[clubIndex] ?? null,
    team: teams[teamIndex] ?? null,
    series: series[seriesIndex] ?? null
  };

  const generatedCommand = useMemo(() => {
    switch (domain) {
      case 'auth':
        return activeView.buildCommand({});
      case 'tournaments':
        return activeView.buildCommand({ tournament: context.tournament });
      case 'fixtures':
        return activeView.buildCommand({ tournament: context.tournament, fixture: context.fixture });
      case 'squads':
        return activeView.buildCommand({ tournament: context.tournament, squad: context.squad });
      case 'championships':
        return activeView.buildCommand({ championship: context.championship });
      case 'clubs':
        return activeView.buildCommand({ club: context.club });
      case 'teams':
        return activeView.buildCommand({ team: context.team, club: context.club });
      case 'series':
        return activeView.buildCommand({ series: context.series });
      default:
        return activeView.buildCommand(context);
    }
  }, [domain, viewIndex, context.tournament?.id, context.fixture?.id, context.squad?.id, context.championship?.id, context.club?.id, context.team?.id, context.series?.id]);

  async function refreshTopLevelContext(): Promise<void> {
    setBusy(true);
    try {
      const [nextTournaments, nextChampionships, nextClubs, nextTeams, nextSeries] = await Promise.all([
        adapter.listTournaments(),
        adapter.listChampionships(),
        adapter.listClubs(),
        adapter.listTeams(),
        adapter.listSeries()
      ]);

      setTournaments(nextTournaments);
      setChampionships(nextChampionships);
      setClubs(nextClubs);
      setTeams(nextTeams);
      setSeries(nextSeries);
      setStatus('CLI context loaded.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load context';
      setOutput(message);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshTournamentContext(tournamentId: number | undefined): Promise<void> {
    if (!tournamentId) {
      setFixtures([]);
      setSquads([]);
      return;
    }

    try {
      const [nextFixtures, nextSquads] = await Promise.all([adapter.listFixtures(tournamentId), adapter.listSquads(tournamentId)]);
      setFixtures(nextFixtures);
      setSquads(nextSquads);
      setFixtureIndex(0);
      setSquadIndex(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh tournament context';
      setStatus(message);
    }
  }

  async function execute(command: string): Promise<void> {
    const args = parseCommand(command);
    if (args.length === 0) {
      setStatus('No command to run.');
      return;
    }

    setBusy(true);
    setStatus(`Running: ${command}`);
    try {
      const text = await adapter.renderText(args);
      setOutput(text);
      setStatus(`Completed: ${command}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command failed';
      setOutput(message);
      setStatus(message);
    } finally {
      setBusy(false);
    }
  }

  function openTournamentEditor(): void {
    if (!context.tournament) {
      return;
    }

    setEditingTournament({
      title: context.tournament.title ?? context.tournament.name ?? '',
      date: context.tournament.date ?? '',
      location: context.tournament.location ?? '',
      region: context.tournament.region ?? '',
      focusedField: 'title'
    });
    setStatus(`Editing tournament ${context.tournament.id}`);
  }

  async function saveTournamentEditor(): Promise<void> {
    if (!context.tournament || !editingTournament) {
      return;
    }

    const command = [
      'ppx tournament update',
      String(context.tournament.id),
      `-n "${editingTournament.title}"`,
      `-d "${editingTournament.date}"`,
      `-l "${editingTournament.location}"`,
      `--region "${editingTournament.region}"`
    ].join(' ');

    await execute(command);
    await refreshTopLevelContext();
    setEditingTournament(null);
  }

  async function deleteTournament(): Promise<void> {
    if (!context.tournament) {
      return;
    }

    await execute(`ppx tournament delete ${context.tournament.id}`);
    await refreshTopLevelContext();
    setConfirmDeleteTournament(false);
    setTournamentIndex(0);
  }

  useEffect(() => {
    void refreshTopLevelContext();
  }, []);

  useEffect(() => {
    void refreshTournamentContext(context.tournament?.id);
  }, [context.tournament?.id]);

  useEffect(() => {
    setViewIndex(0);
  }, [domain]);

  useEffect(() => {
    setCommandInput(generatedCommand);

    if (activeView.autoRun) {
      void execute(generatedCommand);
    } else {
      setOutput(`Ready:\n${generatedCommand}\n\nThis command mutates state. Review it, then focus the command box and press Enter.`);
      setStatus(activeView.description);
    }
  }, [generatedCommand, activeView.autoRun, activeView.description]);

  useKeyboard((key) => {
    if (confirmDeleteTournament) {
      if (key.name === 'escape' || key.text === 'n') {
        setConfirmDeleteTournament(false);
        setStatus('Canceled tournament delete.');
        return;
      }

      if (key.name === 'return' || key.text === 'y') {
        void deleteTournament();
        return;
      }
    }

    if (editingTournament) {
      if (key.name === 'escape') {
        setEditingTournament(null);
        setStatus('Canceled tournament edit.');
        return;
      }

      if (key.name === 'tab') {
        setEditingTournament((current) => {
          if (!current) {
            return current;
          }

          const nextField: Record<TournamentFormField, TournamentFormField> = {
            title: 'date',
            date: 'location',
            location: 'region',
            region: 'title'
          };

          return { ...current, focusedField: nextField[current.focusedField] };
        });
        return;
      }
    }

    if (key.name === 'q') {
      process.exit(0);
    }

    if (key.name === 'tab') {
      setFocusArea((current) => nextFocus(current, domain));
      return;
    }

    if (key.name === 'r') {
      void refreshTopLevelContext();
      void refreshTournamentContext(context.tournament?.id);
      return;
    }

    if (domain === 'tournaments' && key.name === 'e') {
      openTournamentEditor();
      return;
    }

    if (domain === 'tournaments' && key.name === 'd') {
      setConfirmDeleteTournament(true);
      setStatus(`Confirm delete tournament ${context.tournament?.id ?? ''}`);
      return;
    }

    if (focusArea === 'domains') {
      if (key.name === 'up') setDomainIndex((current) => Math.max(0, current - 1));
      if (key.name === 'down') setDomainIndex((current) => Math.min(DOMAIN_ORDER.length - 1, current + 1));
      return;
    }

    if (focusArea === 'views') {
      if (key.name === 'up') setViewIndex((current) => Math.max(0, current - 1));
      if (key.name === 'down') setViewIndex((current) => Math.min(views.length - 1, current + 1));
      return;
    }

    if (focusArea === 'primary') {
      if (domain === 'tournaments' || domain === 'fixtures' || domain === 'squads') {
        if (key.name === 'up') setTournamentIndex((current) => Math.max(0, current - 1));
        if (key.name === 'down') setTournamentIndex((current) => Math.min(tournaments.length - 1, current + 1));
      } else if (domain === 'championships') {
        if (key.name === 'up') setChampionshipIndex((current) => Math.max(0, current - 1));
        if (key.name === 'down') setChampionshipIndex((current) => Math.min(championships.length - 1, current + 1));
      } else if (domain === 'clubs') {
        if (key.name === 'up') setClubIndex((current) => Math.max(0, current - 1));
        if (key.name === 'down') setClubIndex((current) => Math.min(clubs.length - 1, current + 1));
      } else if (domain === 'teams') {
        if (key.name === 'up') setTeamIndex((current) => Math.max(0, current - 1));
        if (key.name === 'down') setTeamIndex((current) => Math.min(teams.length - 1, current + 1));
      } else if (domain === 'series') {
        if (key.name === 'up') setSeriesIndex((current) => Math.max(0, current - 1));
        if (key.name === 'down') setSeriesIndex((current) => Math.min(series.length - 1, current + 1));
      }
      return;
    }

    if (focusArea === 'secondary') {
      if (domain === 'fixtures') {
        if (key.name === 'up') setFixtureIndex((current) => Math.max(0, current - 1));
        if (key.name === 'down') setFixtureIndex((current) => Math.min(fixtures.length - 1, current + 1));
      } else if (domain === 'squads') {
        if (key.name === 'up') setSquadIndex((current) => Math.max(0, current - 1));
        if (key.name === 'down') setSquadIndex((current) => Math.min(squads.length - 1, current + 1));
      }
      return;
    }

    if (focusArea === 'command') {
      if (key.name === 'return') {
        void execute(commandInput);
        return;
      }

      if (key.name === 'backspace') {
        setCommandInput((current) => current.slice(0, -1));
        return;
      }

      if (key.name === 'space') {
        setCommandInput((current) => `${current} `);
        return;
      }

      if (key.text) {
        setCommandInput((current) => `${current}${key.text}`);
      }
    }
  });

  const domainLines = DOMAIN_ORDER.map((key) => DOMAIN_LABELS[key]);
  const viewLines = views.map((view) => `${view.label}${view.autoRun ? '' : ' [run]'}`);
  const primaryOptions =
    domain === 'tournaments' || domain === 'fixtures' || domain === 'squads'
      ? toOption(tournaments, tournamentIndex, (item) => `${item.id}. ${item.title ?? item.name ?? 'Tournament'}`)
      : domain === 'championships'
        ? toOption(championships, championshipIndex, (item) => `${item.id}. ${item.year ?? '-'} ${item.status ?? ''}`)
        : domain === 'clubs'
          ? toOption(clubs, clubIndex, (item) => `${item.id}. ${item.name ?? 'Club'}`)
          : domain === 'teams'
            ? toOption(teams, teamIndex, (item) => `${item.id}. ${item.name ?? 'Team'}`)
            : domain === 'series'
              ? toOption(series, seriesIndex, (item) => `${item.id}. ${item.name ?? 'Series'}`)
              : { lines: ['No context'], selectedIndex: 0 };
  const secondaryOptions =
    domain === 'fixtures'
      ? toOption(fixtures, fixtureIndex, (item) => `${item.id}. ${item.team1 ?? 'TBD'} vs ${item.team2 ?? 'TBD'}`, 34)
      : domain === 'squads'
        ? toOption(squads, squadIndex, (item) => `${item.id}. ${item.name ?? 'Squad'}`, 34)
        : { lines: ['No secondary context'], selectedIndex: 0 };
  const outputLines = renderOutputLines(output, 30, 86);

  return (
    <box style={{ width: '100%', height: '100%', flexDirection: 'column', backgroundColor: '#08131f' }}>
      <box style={{ padding: 1, backgroundColor: '#10253d' }}>
        <text>PitchPerfect Bun/OpenTUI shell | {DOMAIN_LABELS[domain]} | {activeView.label}</text>
      </box>

      <box style={{ flexDirection: 'row', flexGrow: 1, padding: 1, gap: 1 }}>
        <box style={{ width: 28, flexDirection: 'column', gap: 1 }}>
          <box title={`Domains${focusArea === 'domains' ? ' [focus]' : ''}`} border style={{ flexGrow: 1 }}>
            <select
              focused={focusArea === 'domains'}
              options={domainLines.map((line) => ({ name: line, description: 'CLI domain' }))}
              selectedIndex={domainIndex}
              onChange={(index) => setDomainIndex(index)}
              style={{ flexGrow: 1, selectedBackgroundColor: '#d97d00', selectedTextColor: '#08131f' }}
            />
          </box>

          <box title={`Views${focusArea === 'views' ? ' [focus]' : ''}`} border style={{ height: 14 }}>
            <select
              focused={focusArea === 'views'}
              options={viewLines.map((line, index) => ({ name: line, description: views[index]!.description }))}
              selectedIndex={viewIndex}
              onChange={(index) => setViewIndex(index)}
              style={{ flexGrow: 1, selectedBackgroundColor: '#7bd389', selectedTextColor: '#08131f' }}
            />
          </box>
        </box>

        <box style={{ flexDirection: 'column', flexGrow: 1, gap: 1 }}>
          {domain === 'tournaments' ? (
            <box title={`Tournaments${focusArea === 'primary' ? ' [focus]' : ''}`} border style={{ flexGrow: 1 }}>
              <select
                focused={focusArea === 'primary'}
                options={primaryOptions.lines.map((line) => ({ name: line, description: 'Tournament' }))}
                selectedIndex={primaryOptions.selectedIndex}
                onChange={(index) => setTournamentIndex(index)}
                style={{ flexGrow: 1, selectedBackgroundColor: '#6ccff6', selectedTextColor: '#08131f' }}
              />
            </box>
          ) : (
            <box title="CLI Output" border style={{ flexGrow: 1 }}>
              <scrollbox
                style={{
                  flexGrow: 1,
                  rootOptions: { backgroundColor: '#10253d' },
                  wrapperOptions: { backgroundColor: '#10253d' },
                  viewportOptions: { backgroundColor: '#10253d' },
                  contentOptions: { backgroundColor: '#10253d' }
                }}
              >
                <box style={{ padding: 1, flexDirection: 'column' }}>
                  {outputLines.map((line, index) => (
                    <text key={`output-${index}`}>{line}</text>
                  ))}
                </box>
              </scrollbox>
            </box>
          )}

          <box title={`Command Box${focusArea === 'command' ? ' [focus]' : ''}`} border style={{ height: 5 }}>
            <input
              focused={focusArea === 'command'}
              value={commandInput}
              onInput={setCommandInput}
              onSubmit={(value) => {
                void execute(value);
              }}
              style={{ flexGrow: 1 }}
            />
          </box>
        </box>

        <box style={{ width: 36, flexDirection: 'column', gap: 1 }}>
          {domain === 'tournaments' ? (
            <box title="Tournament Detail" border style={{ flexGrow: 1, padding: 1 }}>
              <text>ID: {context.tournament?.id ?? '-'}</text>
              <text>Name: {context.tournament?.title ?? context.tournament?.name ?? '-'}</text>
              <text>Date: {context.tournament?.date ?? '-'}</text>
              <text>Location: {context.tournament?.location ?? '-'}</text>
              <text>Region: {context.tournament?.region ?? '-'}</text>
              <text>Status: {context.tournament?.status ?? '-'}</text>
            </box>
          ) : (
            <box title={`${getPrimaryLabel(domain)}${focusArea === 'primary' ? ' [focus]' : ''}`} border style={{ flexGrow: 1 }}>
              <select
                focused={focusArea === 'primary'}
                options={primaryOptions.lines.map((line) => ({ name: line, description: 'Primary context' }))}
                selectedIndex={primaryOptions.selectedIndex}
                onChange={(index) => {
                  if (domain === 'tournaments' || domain === 'fixtures' || domain === 'squads') setTournamentIndex(index);
                  if (domain === 'championships') setChampionshipIndex(index);
                  if (domain === 'clubs') setClubIndex(index);
                  if (domain === 'teams') setTeamIndex(index);
                  if (domain === 'series') setSeriesIndex(index);
                }}
                style={{ flexGrow: 1, selectedBackgroundColor: '#6ccff6', selectedTextColor: '#08131f' }}
              />
            </box>
          )}

          {domain === 'tournaments' ? (
            <box title={`Tournament View: ${activeView.label}`} border style={{ height: 16 }}>
              <scrollbox
                style={{
                  flexGrow: 1,
                  rootOptions: { backgroundColor: '#10253d' },
                  wrapperOptions: { backgroundColor: '#10253d' },
                  viewportOptions: { backgroundColor: '#10253d' },
                  contentOptions: { backgroundColor: '#10253d' }
                }}
              >
                <box style={{ padding: 1, flexDirection: 'column' }}>
                  {outputLines.slice(0, 12).map((line, index) => (
                    <text key={`tournament-view-${index}`}>{line}</text>
                  ))}
                </box>
              </scrollbox>
            </box>
          ) : null}

          {getSecondaryLabel(domain) ? (
            <box title={`${getSecondaryLabel(domain)}${focusArea === 'secondary' ? ' [focus]' : ''}`} border style={{ height: 14 }}>
              <select
                focused={focusArea === 'secondary'}
                options={secondaryOptions.lines.map((line) => ({ name: line, description: 'Secondary context' }))}
                selectedIndex={secondaryOptions.selectedIndex}
                onChange={(index) => {
                  if (domain === 'fixtures') setFixtureIndex(index);
                  if (domain === 'squads') setSquadIndex(index);
                }}
                style={{ flexGrow: 1, selectedBackgroundColor: '#ffb703', selectedTextColor: '#08131f' }}
              />
            </box>
          ) : null}

          <box title="Hints" border style={{ padding: 1 }}>
            <text>tab cycle focus</text>
            <text>up/down navigate</text>
            <text>command box enter runs</text>
            <text>r refresh context</text>
            <text>e edit tournament</text>
            <text>d delete tournament</text>
            <text>q quit</text>
            <text>safe views auto-run</text>
            <text>mutations require run</text>
          </box>
        </box>
      </box>

      <box style={{ padding: 1, backgroundColor: busy ? '#6b4f00' : '#17324d' }}>
        <text>{busy ? 'working… | ' : ''}{status}</text>
      </box>

      {editingTournament ? (
        <box
          style={{
            position: 'absolute',
            left: 18,
            top: 4,
            width: 54,
            border: true,
            padding: 1,
            borderColor: '#6ccff6',
            backgroundColor: '#10253d',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <text fg="#f7f4ea">Edit Tournament {context.tournament?.id}</text>
          <box title="Name" border style={{ height: 3, borderColor: '#7bd389' }}>
            <input
              focused={editingTournament.focusedField === 'title'}
              value={editingTournament.title}
              onInput={(value) => setEditingTournament((current) => (current ? { ...current, title: value } : current))}
              onSubmit={() => setEditingTournament((current) => (current ? { ...current, focusedField: 'date' } : current))}
              style={{ flexGrow: 1, backgroundColor: '#18324d', color: '#f7f4ea' }}
            />
          </box>
          <box title="Date" border style={{ height: 3, borderColor: '#7bd389' }}>
            <input
              focused={editingTournament.focusedField === 'date'}
              value={editingTournament.date}
              onInput={(value) => setEditingTournament((current) => (current ? { ...current, date: value } : current))}
              onSubmit={() => setEditingTournament((current) => (current ? { ...current, focusedField: 'location' } : current))}
              style={{ flexGrow: 1, backgroundColor: '#18324d', color: '#f7f4ea' }}
            />
          </box>
          <box title="Location" border style={{ height: 3, borderColor: '#7bd389' }}>
            <input
              focused={editingTournament.focusedField === 'location'}
              value={editingTournament.location}
              onInput={(value) => setEditingTournament((current) => (current ? { ...current, location: value } : current))}
              onSubmit={() => setEditingTournament((current) => (current ? { ...current, focusedField: 'region' } : current))}
              style={{ flexGrow: 1, backgroundColor: '#18324d', color: '#f7f4ea' }}
            />
          </box>
          <box title="Region" border style={{ height: 3, borderColor: '#7bd389' }}>
            <input
              focused={editingTournament.focusedField === 'region'}
              value={editingTournament.region}
              onInput={(value) => setEditingTournament((current) => (current ? { ...current, region: value } : current))}
              onSubmit={() => {
                void saveTournamentEditor();
              }}
              style={{ flexGrow: 1, backgroundColor: '#18324d', color: '#f7f4ea' }}
            />
          </box>
          <text fg="#f7f4ea">tab next field | enter advance/save | esc cancel</text>
        </box>
      ) : null}

      {confirmDeleteTournament ? (
        <box
          style={{
            position: 'absolute',
            left: 22,
            top: 8,
            width: 46,
            border: true,
            borderColor: '#ff6b6b',
            padding: 1,
            backgroundColor: '#34161a',
            flexDirection: 'column',
            gap: 1
          }}
        >
          <text fg="#ffe9e9">Delete Tournament {context.tournament?.id}?</text>
          <text fg="#ffe9e9">{context.tournament?.title ?? context.tournament?.name ?? ''}</text>
          <text fg="#ffd7d7">Press `y` or Enter to confirm.</text>
          <text fg="#ffd7d7">Press `n` or Esc to cancel.</text>
        </box>
      ) : null}
    </box>
  );
}

const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  useAlternateScreen: true,
  useMouse: true
});

createRoot(renderer).render(<App />);
