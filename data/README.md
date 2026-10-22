# Season import data

Season files are intentionally kept out of the application bundle and are not loaded automatically. The expected format is the `SeasonImport` contract in `src/domain/season-import.ts`.

Before loading a reviewed 2026 file, validate it with:

```sh
npm run validate:season -- data/season-2026.json
```

The validator is dry-run only. It checks UTC timestamps, unique keys, race and driver references, constructor assignments, result statuses, and duplicate finishing positions. It makes no Supabase writes.

The `source` block must identify the provider, retrieval timestamp, and at least one URL reference so the league has a reproducible audit trail for the season seed.

The checked-in `season-2026.json` is a draft schedule/roster skeleton generated from the official sources. It contains no race results and has not been loaded into Supabase. Rebuild it with:

```sh
npm run build:season:skeleton
```

Generate the reviewable Supabase seed SQL:

```sh
npm run generate:season:sql -- data/season-2026.json --output supabase/seed/2026-season.sql
```

After reviewing the generated SQL, apply it to the linked project with the Supabase CLI:

```sh
npx supabase db query --linked --file supabase/seed/2026-season.sql
```

This loader is idempotent for season metadata, constructors, drivers, races, and constructor assignments. It does not create results, picks, profiles, or scores. Do not run the apply command until the generated SQL has been reviewed.

Fetch the completed result classifications from the official Formula 1 result pages with:

```sh
npm run fetch:season:results -- --output data/season-2026-results.json
npm run validate:season -- data/season-2026-results.json
```

This creates a reviewed-input candidate only; it does not write to Supabase.

## Results refresh runbook

The results importer discovers race-result URLs from the official Formula 1 2026 race index. It uses the season schedule to select races whose scheduled start has passed, so no race ID or slug needs to be added after each round. Races whose official classification is not published yet are skipped and remain absent from the candidate.

Fetch a new candidate and validate it:

   ```sh
   npm run fetch:season:results -- --output data/season-2026-results.json
   npm run validate:season -- data/season-2026-results.json
   ```

Review the candidate against the final FIA classification and decision documents. Check driver status, finishing positions, disqualifications, and any post-race corrections. Update the source notes/references if the FIA classification differs from Formula 1's snapshot.

Review the generated SQL diff before applying it:

   ```sh
   npm run generate:season:sql -- data/season-2026-results.json --output supabase/seed/2026-season-with-results.sql
   git diff -- supabase/seed/2026-season-with-results.sql
   ```

Apply only the reviewed SQL to the linked project, then verify race status, result-row counts, and affected fantasy scores in Supabase. Never apply an unreviewed fetch output, and do not rerun the historical spreadsheet-pick import.

The scheduled importer runs once every 24 hours. It compares result rows with the latest published candidate and does not create an admin review item for an unchanged snapshot. New result rows and corrections to published rows remain reviewable. The fetch command records its retrieval timestamp and replaces previously recorded Formula 1 result references for the fetched races, so rerunning it does not accumulate duplicate source entries. The output remains a candidate until the FIA review and database verification are complete.
