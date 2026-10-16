import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildSeasonSql } from '../src/domain/season-sql';
import { validateSeasonImport } from '../src/domain/season-import';

const inputPath = process.argv[2];
const outputFlag = process.argv.indexOf('--output');
const outputPath = outputFlag >= 0 ? process.argv[outputFlag + 1] : undefined;

if (!inputPath || !outputPath) {
  console.error('Usage: npm run generate:season:sql -- path/to/season.json --output path/to/seed.sql');
  process.exit(2);
}

const input = JSON.parse(await readFile(resolve(inputPath), 'utf8'));
const validation = validateSeasonImport(input);
if (!validation.valid) {
  console.error('Refusing to generate SQL for an invalid season import:');
  for (const error of validation.errors) console.error(`- ${error}`);
  process.exit(1);
}

const resolvedOutputPath = resolve(outputPath);
await mkdir(dirname(resolvedOutputPath), { recursive: true });
await writeFile(resolvedOutputPath, buildSeasonSql(input));
console.log(`Generated ${resolvedOutputPath}. No database changes were made.`);
