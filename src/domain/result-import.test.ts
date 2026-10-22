import { describe, expect, it } from 'vitest';
import { classifyResultChanges, type CandidateResult } from './result-import';

const result = (overrides: Partial<CandidateResult> = {}): CandidateResult => ({
  raceKey: 'australia',
  driverCode: 'VER',
  finishingPosition: 1,
  status: 'finished',
  ...overrides,
});

describe('classifyResultChanges', () => {
  it('requires review for the first result data', () => {
    expect(classifyResultChanges([result()], [])).toBe('new');
  });

  it('ignores an unchanged daily snapshot', () => {
    expect(classifyResultChanges([result()], [result()])).toBe('unchanged');
  });

  it('requires review when a new result is added', () => {
    expect(classifyResultChanges([result(), result({ driverCode: 'HAM', finishingPosition: 2 })], [result()])).toBe('new');
  });

  it('keeps corrections reviewable', () => {
    expect(classifyResultChanges([result({ finishingPosition: 2 })], [result()])).toBe('correction');
  });
});
