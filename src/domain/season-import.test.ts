import { describe, expect, it } from 'vitest';
import { validateSeasonImport } from './season-import';
import type { SeasonImport } from './season-import';

const validImport: SeasonImport = {
  source: { provider: 'reviewed-source', retrievedAt: '2026-01-01T00:00:00Z' },
  season: {
    year: 2026,
    status: 'draft',
    rules: { totalRaces: 1, maxConstructorUses: 3, constructorsAtMax: 0, pointsFormula: '23 - finishing_position' },
  },
  constructors: [{ key: 'team-a', name: 'Team A', color: '#E8002D' }],
  drivers: [{ code: 'AAA', name: 'Driver A' }, { code: 'BBB', name: 'Driver B' }],
  races: [{ key: 'round-01', roundNumber: 1, name: 'Example Grand Prix', startsAt: '2026-03-01T14:00:00Z', status: 'scheduled' }],
  assignments: [
    { raceKey: 'round-01', driverCode: 'AAA', constructorKey: 'team-a' },
    { raceKey: 'round-01', driverCode: 'BBB', constructorKey: 'team-a' },
  ],
  results: [{ raceKey: 'round-01', driverCode: 'AAA', finishingPosition: null, status: 'dns' }],
};

describe('season import validation', () => {
  it('accepts a structurally valid provider-neutral import', () => {
    expect(validateSeasonImport(validImport)).toMatchObject({ valid: true, errors: [] });
  });

  it('rejects unknown references and malformed result status data', () => {
    const invalid = {
      ...validImport,
      assignments: [{ raceKey: 'missing-race', driverCode: 'AAA', constructorKey: 'team-a' }],
      results: [{ raceKey: 'round-01', driverCode: 'AAA', finishingPosition: 4, status: 'dns' as const }],
    };
    const validation = validateSeasonImport(invalid);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(expect.arrayContaining([
      'assignment references unknown race: missing-race',
      'result has no constructor assignment: round-01:AAA',
      'non-finished result round-01:AAA must have a null finishingPosition',
    ]));
  });

  it('rejects duplicate finishing positions within a race', () => {
    const invalid = {
      ...validImport,
      results: [
        { raceKey: 'round-01', driverCode: 'AAA', finishingPosition: 1, status: 'finished' as const },
        { raceKey: 'round-01', driverCode: 'BBB', finishingPosition: 1, status: 'finished' as const },
      ],
    };
    expect(validateSeasonImport(invalid).errors).toContain('duplicate finishing position 1 in race round-01');
  });
});
