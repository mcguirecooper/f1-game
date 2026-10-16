export type DriverStatus = 'finished' | 'dnf' | 'dns' | 'dsq';

export interface DriverResult {
  finishingPosition: number | null;
  status: DriverStatus;
}

/** League formula: 23 - finishing position, with all non-finishes worth zero. */
export function driverPoints(result: DriverResult): number {
  if (result.status !== 'finished' || result.finishingPosition === null) return 0;
  if (!Number.isInteger(result.finishingPosition) || result.finishingPosition < 1 || result.finishingPosition > 22) {
    throw new Error('finished position must be an integer from 1 through 22');
  }
  return 23 - result.finishingPosition;
}

export function constructorPoints(results: DriverResult[]): number {
  return results.reduce((sum, result) => sum + driverPoints(result), 0);
}
