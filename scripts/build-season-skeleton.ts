import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { SeasonImport } from '../src/domain/season-import';

const retrievedAt = '2026-10-16T00:00:00Z';
const f1Calendar = 'https://www.formula1.com/en/racing/2026';
const f1StartTimes = 'https://www.formula1.com/en/latest/article/official-grand-prix-start-times-for-2026-f1-season-confirmed.2UgPfArqH76tzlOYh21jSG';
const f1Drivers = 'https://www.formula1.com/en/drivers';
const f1Teams = 'https://www.formula1.com/en/teams';
const fiaClassifications = 'https://www.fia.com/events/fia-formula-one-world-championship/season-2026/2026-classifications';
const fiaEntryList = 'https://www.fia.com/events/fia-formula-one-world-championship/season-2026/2026-fia-formula-one-world-championship-entry';

const constructors = [
  ['mercedes', 'Mercedes', '#27F4D2'],
  ['ferrari', 'Ferrari', '#E80020'],
  ['mclaren', 'McLaren', '#FF8000'],
  ['red-bull', 'Red Bull Racing', '#3671C6'],
  ['racing-bulls', 'Racing Bulls', '#6692FF'],
  ['alpine', 'Alpine', '#FF87BC'],
  ['haas', 'Haas F1 Team', '#B6BABD'],
  ['audi', 'Audi', '#BB0A30'],
  ['williams', 'Williams', '#64C4FF'],
  ['aston-martin', 'Aston Martin', '#229971'],
  ['cadillac', 'Cadillac', '#C0C0C0'],
] as const;

const drivers = [
  ['RUS', 'George Russell', 'mercedes'], ['ANT', 'Kimi Antonelli', 'mercedes'],
  ['LEC', 'Charles Leclerc', 'ferrari'], ['HAM', 'Lewis Hamilton', 'ferrari'],
  ['NOR', 'Lando Norris', 'mclaren'], ['PIA', 'Oscar Piastri', 'mclaren'],
  ['VER', 'Max Verstappen', 'red-bull'], ['HAD', 'Isack Hadjar', 'red-bull'],
  ['LAW', 'Liam Lawson', 'racing-bulls'], ['LIN', 'Arvid Lindblad', 'racing-bulls'],
  ['GAS', 'Pierre Gasly', 'alpine'], ['COL', 'Franco Colapinto', 'alpine'],
  ['OCO', 'Esteban Ocon', 'haas'], ['BEA', 'Oliver Bearman', 'haas'],
  ['HUL', 'Nico Hulkenberg', 'audi'], ['BOR', 'Gabriel Bortoleto', 'audi'],
  ['SAI', 'Carlos Sainz', 'williams'], ['ALB', 'Alexander Albon', 'williams'],
  ['ALO', 'Fernando Alonso', 'aston-martin'], ['STR', 'Lance Stroll', 'aston-martin'],
  ['PER', 'Sergio Perez', 'cadillac'], ['BOT', 'Valtteri Bottas', 'cadillac'],
] as const;

// Race timestamps are the official race start times converted from the official
// local-time schedule to UTC. They are used only to lock picks; results remain empty.
const races = [
  ['australia', 1, 'Australian Grand Prix', '2026-03-08T04:00:00Z'],
  ['china', 2, 'Chinese Grand Prix', '2026-03-15T07:00:00Z'],
  ['japan', 3, 'Japanese Grand Prix', '2026-03-29T05:00:00Z'],
  ['miami', 4, 'Miami Grand Prix', '2026-05-03T20:00:00Z'],
  ['canada', 5, 'Canadian Grand Prix', '2026-05-24T20:00:00Z'],
  ['monaco', 6, 'Monaco Grand Prix', '2026-06-07T13:00:00Z'],
  ['barcelona', 7, 'Spanish Grand Prix — Barcelona-Catalunya', '2026-06-14T13:00:00Z'],
  ['austria', 8, 'Austrian Grand Prix', '2026-06-28T13:00:00Z'],
  ['great-britain', 9, 'British Grand Prix', '2026-07-05T14:00:00Z'],
  ['belgium', 10, 'Belgian Grand Prix', '2026-07-19T13:00:00Z'],
  ['hungary', 11, 'Hungarian Grand Prix', '2026-07-26T13:00:00Z'],
  ['netherlands', 12, 'Dutch Grand Prix', '2026-08-23T13:00:00Z'],
  ['italy', 13, 'Italian Grand Prix', '2026-09-06T13:00:00Z'],
  ['spain', 14, 'Spanish Grand Prix — Madrid', '2026-09-13T13:00:00Z'],
  ['azerbaijan', 15, 'Azerbaijan Grand Prix', '2026-09-26T11:00:00Z'],
  ['bahrain-malaysia', 16, 'Bahrain Grand Prix in Malaysia', '2026-10-04T12:00:00Z'],
  ['singapore', 17, 'Singapore Grand Prix', '2026-10-11T12:00:00Z'],
  ['united-states', 18, 'United States Grand Prix', '2026-10-25T20:00:00Z'],
  ['mexico', 19, 'Mexico City Grand Prix', '2026-11-01T20:00:00Z'],
  ['brazil', 20, 'São Paulo Grand Prix', '2026-11-08T18:00:00Z'],
  ['las-vegas', 21, 'Las Vegas Grand Prix', '2026-11-22T04:00:00Z'],
  ['qatar', 22, 'Qatar Grand Prix', '2026-11-29T16:00:00Z'],
  ['abu-dhabi', 23, 'Abu Dhabi Grand Prix', '2026-12-06T13:00:00Z'],
] as const;

const season: SeasonImport = {
  source: {
    provider: 'Formula 1 official calendar and FIA official championship records',
    retrievedAt,
    notes: 'Roster and schedule skeleton only. Results are intentionally empty until each final FIA classification is reviewed.',
    references: [
      { kind: 'calendar', url: f1Calendar, retrievedAt },
      { kind: 'calendar', url: f1StartTimes, retrievedAt },
      { kind: 'entry_list', url: f1Drivers, retrievedAt },
      { kind: 'entry_list', url: f1Teams, retrievedAt },
      { kind: 'entry_list', url: fiaEntryList, retrievedAt },
      { kind: 'results', url: fiaClassifications, retrievedAt },
    ],
  },
  season: {
    year: 2026,
    status: 'draft',
    rules: { totalRaces: races.length, maxConstructorUses: 3, constructorsAtMax: 2, pointsFormula: '23 - finishing_position' },
  },
  constructors: constructors.map(([key, name, color]) => ({ key, name, color })),
  drivers: drivers.map(([code, name]) => ({ code, name })),
  races: races.map(([key, roundNumber, name, startsAt]) => ({ key, roundNumber, name, startsAt, status: 'scheduled' as const })),
  assignments: races.flatMap(([raceKey]) => drivers.map(([driverCode, , constructorKey]) => ({ raceKey, driverCode, constructorKey }))),
  results: [],
};

const outputPath = resolve('data/season-2026.json');
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(season, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify({ races: races.length, constructors: constructors.length, drivers: drivers.length, assignments: season.assignments.length, results: season.results.length }, null, 2));
