export type CandidateResult = {
  raceKey: string;
  driverCode: string;
  finishingPosition: number | null;
  status: string;
};

export type ResultImportChange = 'new' | 'correction' | 'unchanged';

function resultKey(result: CandidateResult): string {
  return `${result.raceKey}:${result.driverCode}`;
}

function resultValue(result: CandidateResult): string {
  return `${result.finishingPosition ?? ''}:${result.status}`;
}

/** Compare the result data, deliberately ignoring retrieval timestamps and source links. */
export function classifyResultChanges(candidate: CandidateResult[], published: CandidateResult[]): ResultImportChange {
  if (published.length === 0) return candidate.length > 0 ? 'new' : 'unchanged';

  const publishedByKey = new Map(published.map((result) => [resultKey(result), resultValue(result)]));
  let hasNew = false;

  for (const result of candidate) {
    const previous = publishedByKey.get(resultKey(result));
    if (previous === undefined) {
      hasNew = true;
    } else if (previous !== resultValue(result)) {
      return 'correction';
    }
  }

  return hasNew ? 'new' : 'unchanged';
}
