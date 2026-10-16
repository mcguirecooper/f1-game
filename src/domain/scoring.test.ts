import { describe, expect, it } from 'vitest';
import { constructorPoints, driverPoints } from './scoring';

describe('F1 fantasy scoring', () => {
  it('awards 22 points for first place and 1 for twenty-second', () => {
    expect(driverPoints({ status: 'finished', finishingPosition: 1 })).toBe(22);
    expect(driverPoints({ status: 'finished', finishingPosition: 22 })).toBe(1);
  });

  it('awards zero for every non-finish status', () => {
    for (const status of ['dnf', 'dns', 'dsq'] as const) {
      expect(driverPoints({ status, finishingPosition: null })).toBe(0);
    }
  });

  it('sums both constructor drivers', () => {
    expect(constructorPoints([
      { status: 'finished', finishingPosition: 2 },
      { status: 'finished', finishingPosition: 5 },
    ])).toBe(39);
  });
});
