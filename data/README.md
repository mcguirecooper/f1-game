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
