import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import * as cheerio from 'cheerio';
import type { SeasonImport } from '../src/domain/season-import';

const retrievedAt = new Date().toISOString();
const races = [
  ['australia', 1279], ['china', 1280], ['japan', 1281], ['miami', 1284],
  ['canada', 1285], ['monaco', 1286], ['barcelona', 1287], ['austria', 1288],
  ['great-britain', 1289], ['belgium', 1290], ['hungary', 1291], ['netherlands', 1292],
  ['italy', 1293], ['spain', 1294], ['azerbaijan', 1295], ['bahrain-malaysia', 1308], ['singapore', 1296],
] as const;

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function statusFromRow(position: string, retired: string): 'finished' | 'dnf' | 'dns' | 'dsq' {
  const value = `${position} ${retired}`.toUpperCase();
  if (value.includes('DNS')) return 'dns';
  if (value.includes('DSQ')) return 'dsq';
  if (value.includes('DNF') || !/^\d+$/.test(position)) return 'dnf';
  return 'finished';
}

const outputFlag = process.argv.indexOf('--output');
const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : 'data/season-2026-results.json';
const resultRows: SeasonImport['results'] = [];

for (const [raceKey, raceId] of races) {
  const slug = raceKey === 'bahrain-malaysia' ? 'bahrain' : raceKey;
  const url = `https://www.formula1.com/en/results/2026/races/${raceId}/${slug}/race-result`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} while fetching ${url}`);
  const html = await response.text();
  const $ = cheerio.load(html);
  const rows = $('table tbody tr');
  if (rows.length === 0) throw new Error(`No result table found at ${url}`);
  let parsedRows = 0;
  rows.each((_, row) => {
    const cells = $(row).find('td').map((__, cell) => normalize($(cell).text())).get();
    const position = cells[0] ?? '';
    const driverCode = (cells[2] ?? '').match(/[A-Z]{3}$/)?.[0];
    if (!driverCode) return;
    const status = statusFromRow(position, cells[5] ?? '');
    resultRows.push({
      raceKey,
      driverCode,
      finishingPosition: status === 'finished' && /^\d+$/.test(position) ? Number(position) : null,
      status,
    });
    parsedRows += 1;
  });
  if (parsedRows < 15 || parsedRows > 22) throw new Error(`Unexpected row count ${parsedRows} for ${raceKey}`);
  console.log(`${raceKey}: ${parsedRows} drivers`);
}

const season = JSON.parse(await readFile(resolve('data/season-2026.json'), 'utf8')) as SeasonImport;
const resultUrls = new Set(races.map(([raceKey, raceId]) => `https://www.formula1.com/en/results/2026/races/${raceId}/${raceKey === 'bahrain-malaysia' ? 'bahrain' : raceKey}/race-result`));
season.source = {
  ...season.source,
  retrievedAt,
  notes: 'Schedule/roster skeleton plus official Formula 1 completed-race classifications. Review before loading results.',
  references: [
    ...season.source.references.filter((reference) => reference.kind !== 'results' || !resultUrls.has(reference.url)),
    ...races.map(([raceKey, raceId]) => ({
      kind: 'results' as const,
      url: `https://www.formula1.com/en/results/2026/races/${raceId}/${raceKey === 'bahrain-malaysia' ? 'bahrain' : raceKey}/race-result`,
      retrievedAt,
    })),
  ],
};
season.results = resultRows;
const completedRaceKeys = new Set(races.map(([raceKey]) => raceKey));
season.races = season.races.map((race) => completedRaceKeys.has(race.key) ? { ...race, status: 'completed' as const } : race);

const resolvedOutputPath = resolve(outputPath);
await mkdir(dirname(resolvedOutputPath), { recursive: true });
await writeFile(resolvedOutputPath, `${JSON.stringify(season, null, 2)}\n`);
console.log(`Wrote ${resolvedOutputPath} with ${resultRows.length} result rows. No database changes were made.`);
