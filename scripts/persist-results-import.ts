import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import type { SeasonImport } from '../src/domain/season-import';
import { validateSeasonImport } from '../src/domain/season-import';

const inputPath = process.argv[2] ?? 'data/season-2026-results.json';
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const payload = JSON.parse(await readFile(inputPath, 'utf8')) as SeasonImport;
const validation = validateSeasonImport(payload);
if (!validation.valid) throw new Error(`Candidate validation failed:\n${validation.errors.join('\n')}`);

const candidateHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: season, error: seasonError } = await supabase.from('seasons').select('id').eq('year', payload.season.year).single();
if (seasonError) throw seasonError;

const { data: existing } = await supabase.from('result_import_runs').select('id,status').eq('season_id', season.id).eq('candidate_hash', candidateHash).maybeSingle();
if (existing) {
  console.log(`Candidate already recorded as ${existing.status}: ${existing.id}`);
  process.exit(0);
}

const { data, error } = await supabase.from('result_import_runs').insert({
  season_id: season.id,
  provider: payload.source.provider,
  retrieved_at: payload.source.retrievedAt,
  candidate_hash: candidateHash,
  payload,
}).select('id,status').single();
if (error) throw error;
console.log(`Recorded review candidate ${data.id} (${validation.summary.results} result rows).`);
