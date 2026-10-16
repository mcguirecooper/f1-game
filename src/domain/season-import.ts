export type SeasonStatus = 'draft' | 'active' | 'complete' | 'archived';
export type RaceStatus = 'scheduled' | 'completed' | 'cancelled';
export type DriverResultStatus = 'finished' | 'dnf' | 'dns' | 'dsq';

export interface SeasonImport {
  source: {
    provider: string;
    retrievedAt: string;
    notes?: string;
  };
  season: {
    year: number;
    status: SeasonStatus;
    rules: {
      totalRaces: number;
      maxConstructorUses: number;
      constructorsAtMax: number;
      pointsFormula: '23 - finishing_position';
    };
  };
  constructors: Array<{
    key: string;
    name: string;
    color: string;
  }>;
  drivers: Array<{
    code: string;
    name: string;
  }>;
  races: Array<{
    key: string;
    roundNumber: number;
    name: string;
    startsAt: string;
    status: RaceStatus;
  }>;
  assignments: Array<{
    raceKey: string;
    driverCode: string;
    constructorKey: string;
  }>;
  results: Array<{
    raceKey: string;
    driverCode: string;
    finishingPosition: number | null;
    status: DriverResultStatus;
  }>;
}

export interface SeasonImportValidation {
  valid: boolean;
  errors: string[];
  summary: {
    year: number | null;
    races: number;
    constructors: number;
    drivers: number;
    assignments: number;
    results: number;
  };
}

function duplicateValues(values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value)) && value.includes('T') && value.endsWith('Z');
}

export function validateSeasonImport(input: SeasonImport): SeasonImportValidation {
  const errors: string[] = [];
  const constructors = input?.constructors ?? [];
  const drivers = input?.drivers ?? [];
  const races = input?.races ?? [];
  const assignments = input?.assignments ?? [];
  const results = input?.results ?? [];
  const rules = input?.season?.rules;
  const summary = {
    year: Number.isInteger(input?.season?.year) ? input.season.year : null,
    races: races.length,
    constructors: constructors.length,
    drivers: drivers.length,
    assignments: assignments.length,
    results: results.length,
  };

  if (!input?.source?.provider?.trim()) errors.push('source.provider is required');
  if (!isValidDate(input?.source?.retrievedAt ?? '')) errors.push('source.retrievedAt must be an ISO UTC timestamp');
  if (!Number.isInteger(input?.season?.year) || input.season.year < 1950 || input.season.year > 2200) {
    errors.push('season.year must be an integer from 1950 through 2200');
  }
  if (!rules || rules.pointsFormula !== '23 - finishing_position') {
    errors.push('season.rules.pointsFormula must be "23 - finishing_position"');
  }
  if (!Number.isInteger(rules?.totalRaces) || (rules?.totalRaces ?? 0) <= 0) errors.push('season.rules.totalRaces must be positive');
  if (!Number.isInteger(rules?.maxConstructorUses) || (rules?.maxConstructorUses ?? 0) <= 0) errors.push('season.rules.maxConstructorUses must be positive');
  if (!Number.isInteger(rules?.constructorsAtMax) || (rules?.constructorsAtMax ?? -1) < 0) errors.push('season.rules.constructorsAtMax must be zero or greater');
  if (rules && rules.constructorsAtMax > constructors.length) errors.push('season.rules.constructorsAtMax cannot exceed constructor count');
  if (rules && rules.totalRaces !== races.length) errors.push(`season.rules.totalRaces (${rules.totalRaces}) must match races (${races.length})`);

  const constructorKeys = new Set(constructors.map((item) => item.key));
  const driverCodes = new Set(drivers.map((item) => item.code));
  const raceKeys = new Set(races.map((item) => item.key));

  for (const key of duplicateValues(constructors.map((item) => item.key))) errors.push(`duplicate constructor key: ${key}`);
  for (const code of duplicateValues(drivers.map((item) => item.code))) errors.push(`duplicate driver code: ${code}`);
  for (const key of duplicateValues(races.map((item) => item.key))) errors.push(`duplicate race key: ${key}`);
  for (const race of races) {
    if (!race.name.trim()) errors.push(`race ${race.key} must have a name`);
    if (!Number.isInteger(race.roundNumber) || race.roundNumber < 1) errors.push(`race ${race.key} has an invalid roundNumber`);
    if (!isValidDate(race.startsAt)) errors.push(`race ${race.key} startsAt must be an ISO UTC timestamp`);
  }
  const rounds = races.map((race) => String(race.roundNumber));
  for (const round of duplicateValues(rounds)) errors.push(`duplicate race roundNumber: ${round}`);

  for (const constructor of constructors) {
    if (!constructor.name.trim()) errors.push(`constructor ${constructor.key} must have a name`);
    if (!/^#[0-9A-Fa-f]{6}$/.test(constructor.color)) errors.push(`constructor ${constructor.key} has an invalid color`);
  }
  for (const driver of drivers) {
    if (!/^[A-Z0-9]{2,4}$/.test(driver.code)) errors.push(`driver ${driver.code} must use an uppercase 2–4 character code`);
    if (!driver.name.trim()) errors.push(`driver ${driver.code} must have a name`);
  }

  const assignmentKeys = new Set<string>();
  for (const assignment of assignments) {
    const key = `${assignment.raceKey}:${assignment.driverCode}`;
    if (assignmentKeys.has(key)) errors.push(`duplicate assignment: ${key}`);
    assignmentKeys.add(key);
    if (!raceKeys.has(assignment.raceKey)) errors.push(`assignment references unknown race: ${assignment.raceKey}`);
    if (!driverCodes.has(assignment.driverCode)) errors.push(`assignment references unknown driver: ${assignment.driverCode}`);
    if (!constructorKeys.has(assignment.constructorKey)) errors.push(`assignment references unknown constructor: ${assignment.constructorKey}`);
  }

  const resultKeys = new Set<string>();
  const positionsByRace = new Map<string, Set<number>>();
  for (const result of results) {
    const key = `${result.raceKey}:${result.driverCode}`;
    if (resultKeys.has(key)) errors.push(`duplicate result: ${key}`);
    resultKeys.add(key);
    if (!raceKeys.has(result.raceKey)) errors.push(`result references unknown race: ${result.raceKey}`);
    if (!driverCodes.has(result.driverCode)) errors.push(`result references unknown driver: ${result.driverCode}`);
    if (!assignmentKeys.has(key)) errors.push(`result has no constructor assignment: ${key}`);
    if (result.status === 'finished') {
      if (!Number.isInteger(result.finishingPosition) || (result.finishingPosition ?? 0) < 1 || (result.finishingPosition ?? 0) > 22) {
        errors.push(`finished result ${key} must have a position from 1 through 22`);
      } else {
        const finishingPosition = result.finishingPosition as number;
        const positions = positionsByRace.get(result.raceKey) ?? new Set<number>();
        if (positions.has(finishingPosition)) errors.push(`duplicate finishing position ${finishingPosition} in race ${result.raceKey}`);
        positions.add(finishingPosition);
        positionsByRace.set(result.raceKey, positions);
      }
    } else if (result.finishingPosition !== null) {
      errors.push(`non-finished result ${key} must have a null finishingPosition`);
    }
  }

  return { valid: errors.length === 0, errors, summary };
}
