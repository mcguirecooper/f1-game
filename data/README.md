# Season import data

Season files are intentionally kept out of the application bundle and are not loaded automatically. The expected format is the `SeasonImport` contract in `src/domain/season-import.ts`.

Before loading a reviewed 2026 file, validate it with:

```sh
npm run validate:season -- data/season-2026.json
```

The validator is dry-run only. It checks UTC timestamps, unique keys, race and driver references, constructor assignments, result statuses, and duplicate finishing positions. It makes no Supabase writes.

The `source` block must identify the provider and retrieval timestamp so the league has a reproducible audit trail for the season seed.
