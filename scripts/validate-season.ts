import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateSeasonImport } from '../src/domain/season-import';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npm run validate:season -- path/to/season.json');
  process.exit(2);
}

try {
  const input = JSON.parse(await readFile(resolve(filePath), 'utf8'));
  const validation = validateSeasonImport(input);
  if (!validation.valid) {
    console.error(`Season import is invalid (${validation.errors.length} error${validation.errors.length === 1 ? '' : 's'}):`);
    for (const error of validation.errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('Season import is valid. No database changes were made.');
  console.log(JSON.stringify(validation.summary, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
