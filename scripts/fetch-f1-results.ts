import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import * as cheerio from 'cheerio';
import type { SeasonImport } from '../src/domain/season-import';

type OfficialRaceLink = { raceId: number; slug: string; url: string };
const retrievedAt = new Date().toISOString();
const year = 2026;
const calendarUrl = `https://www.formula1.com/en/results/${year}/races`;

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

function discoverOfficialRaceLinks(html: string): OfficialRaceLink[] {
  const $ = cheerio.load(html);
  const links = new Map<string, OfficialRaceLink>();
  $('a[href*="/en/results/"]').each((_, anchor) => {
    const href = $(anchor).attr('href') ?? '';
    const match = href.match(new RegExp(`/en/results/${year}/races/(\\d+)/([^/]+)/race-result$`));
    if (!match) return;
    const url = new URL(href, 'https://www.formula1.com').toString();
    links.set(url, { raceId: Number(match[1]), slug: match[2], url });
  });
  return [...links.values()];
}

function raceForOfficialSlug(slug: string, races: SeasonImport['races']): SeasonImport['races'][number] | undefined {
  if (slug === 'bahrain') return races.find((race) => race.key === 'bahrain-malaysia');
  if (slug === 'barcelona-catalunya') return races.find((race) => race.key === 'barcelona');
  return races.find((race) => race.key === slug);
}

const outputFlag = process.argv.indexOf('--output');
const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : 'data/season-2026-results.json';
const season = JSON.parse(await readFile(resolve('data/season-2026.json'), 'utf8')) as SeasonImport;
const calendarResponse = await fetch(calendarUrl);
if (!calendarResponse.ok) throw new Error(`${calendarResponse.status} while fetching ${calendarUrl}`);
const officialRaceLinks = discoverOfficialRaceLinks(await calendarResponse.text());
if (officialRaceLinks.length === 0) throw new Error(`No race-result links found at ${calendarUrl}`);

const eligibleRaces = season.races.filter((race) => race.status !== 'cancelled' && Date.parse(race.startsAt) <= Date.now());
const resultRows: SeasonImport['results'] = [];
const resultReferences: SeasonImport['source']['references'] = [];
const completedRaceKeys = new Set<string>();

for (const race of eligibleRaces) {
  const official = officialRaceLinks.find((link) => raceForOfficialSlug(link.slug, season.races)?.key === race.key);
  if (!official) {
    console.log(`${race.key}: no official result link found yet`);
    continue;
  }
  const response = await fetch(official.url);
  if (!response.ok) throw new Error(`${response.status} while fetching ${official.url}`);
  const $ = cheerio.load(await response.text());
  const rows = $('table tbody tr');
  if (rows.length === 0) {
    console.log(`${race.key}: result page exists but no classification is published yet`);
    continue;
  }
  let parsedRows = 0;
  rows.each((_, row) => {
    const cells = $(row).find('td').map((__, cell) => normalize($(cell).text())).get();
    const position = cells[0] ?? '';
    const driverCode = (cells[2] ?? '').match(/[A-Z]{3}$/)?.[0];
    if (!driverCode) return;
    const status = statusFromRow(position, cells[5] ?? '');
    resultRows.push({
      raceKey: race.key,
      driverCode,
      finishingPosition: status === 'finished' && /^\d+$/.test(position) ? Number(position) : null,
      status,
    });
    parsedRows += 1;
  });
  if (parsedRows < 15 || parsedRows > 22) throw new Error(`Unexpected row count ${parsedRows} for ${race.key}`);
  completedRaceKeys.add(race.key);
  resultReferences.push({ kind: 'results', url: official.url, retrievedAt });
  console.log(`${race.key}: ${parsedRows} drivers`);
}

season.source = {
  ...season.source,
  retrievedAt,
  notes: 'Schedule/roster skeleton plus official Formula 1 completed-race classifications. Review before loading results.',
  references: [
    ...season.source.references.filter((reference) => reference.kind !== 'results'),
    ...resultReferences,
  ],
};
season.results = resultRows;
season.races = season.races.map((race) => completedRaceKeys.has(race.key) ? { ...race, status: 'completed' as const } : race);

const resolvedOutputPath = resolve(outputPath);
await mkdir(dirname(resolvedOutputPath), { recursive: true });
await writeFile(resolvedOutputPath, `${JSON.stringify(season, null, 2)}\n`);
console.log(`Wrote ${resolvedOutputPath} with ${resultRows.length} result rows from ${completedRaceKeys.size} races. No database changes were made.`);
