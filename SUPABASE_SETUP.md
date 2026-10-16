# Supabase setup

The migration in `supabase/migrations/20261016000000_initial_schema.sql` is intentionally structural only. It does not contain artificial demo data or assume a particular 2026 data provider.

## Create and link the project

1. Create a Supabase project named `f1-game`.
2. Set the Supabase Auth Site URL to `http://localhost:5173/` while developing.
3. Add `https://mcguirecooper.github.io/f1-game/` as an allowed redirect URL before production.
4. Enable email authentication, disable public signup, and use invitations for the league members.
5. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.

In **Authentication → URL Configuration**, set the Site URL to the local URL during development and add both of these redirect URLs:

```text
http://localhost:5173/
https://mcguirecooper.github.io/f1-game/
```

In **Authentication → Providers → Email**, keep email enabled. The frontend now requests magic links through `signInWithOtp`; because public signup is disabled, only invited users can complete the flow.

Then, after installing the Supabase CLI:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
npx supabase gen types typescript --linked > src/services/database.types.ts
```

Review the dry run before applying it. Do not run `supabase db reset --linked` against the hosted project.

## Provisioning order

The first production data load should happen in this order:

1. Create the 2026 season and its `season_rules` row.
2. Load the 2026 race schedule with authoritative UTC start times.
3. Load the 11 constructors and the 22 driver records.
4. Load race-specific `constructor_assignments`.
5. Invite league members and create their `profiles` rows.
6. Load official results through the admin workflow or a reviewed import script.

The application should not import standings or fantasy points directly. The database views calculate them from picks, assignments, and driver results.

## Security boundary

Players submit picks through `submit_pick`, which checks authentication, the race lock time, constructor usage, and the usage allocation rule. Admin result corrections and pick overrides go through audited security-definer functions. No client role receives direct write access to results, picks, or the audit log.

The current dashboard still uses its Phase 1 local-storage prototype. Switching it to `src/services/auth.ts` and `src/services/league.ts` should happen after the first real season seed is reviewed.
