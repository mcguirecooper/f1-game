# F1 Fantasy Automation Roadmap

## Goal

Make the league operational with minimal manual work while keeping official-result changes reviewable, auditable, and reversible.

The target flow is:

```text
Race schedule
   ↓
Scheduled result check
   ↓
Fetch candidate results
   ↓
Validate + compare against stored results
   ↓
Publish approved results atomically
   ↓
Scores and standings recalculate from database views
   ↓
Next race becomes pickable; previous race remains locked
```

## Recommended operating model

Use a scheduled GitHub Actions job for the first production version because the existing importer is Node/TypeScript and already runs in GitHub Actions. Keep all database mutations behind a privileged server-side workflow or an admin-only RPC. Do not put a service-role key in the browser.

For the first version, automate detection and preparation, but retain a human approval step before official publication. Fully automatic publication should be an explicit later decision because FIA corrections, disqualifications, and delayed classifications can change fantasy scores.

## Phase 1 — Make the current manual process safe and repeatable

### 1. Add import and publication metadata

Add tables such as:

- `result_import_runs`: source, retrieved time, race, status, checksum, error, row count
- `result_import_rows`: candidate rows and normalized source values
- `race_publications`: race, published-at, published-by, source run, publication status

Keep these in a private schema or protect them with RLS. Store the raw candidate artifact outside the public application data path, preferably as a private Storage object or CI artifact.

### 2. Add an atomic publish operation

Create one server-side operation that:

1. verifies the import is validated and complete;
2. verifies every result driver belongs to the race;
3. verifies finished positions are unique;
4. upserts all `driver_results` rows;
5. marks the race `completed`;
6. records the publication and audit entry;
7. returns result counts and score-impact counts.

The operation must run transactionally. A partial result import must never leave a race looking completed.

### 3. Strengthen validation

Add checks for:

- expected driver count for the race;
- exactly one result row per assigned driver, unless the source explicitly documents an exception;
- unique finishing positions;
- valid status/position combinations;
- duplicate or missing source rows;
- race identity and season identity;
- no publication of a race whose official result is still provisional.

### 4. Make imports idempotent

A retry for the same race and source snapshot should produce no duplicate rows or score changes. Identify imports by race plus source checksum and retain the previous published snapshot for rollback.

## Phase 2 — Automate result detection

### 5. Add a scheduled workflow

Create `.github/workflows/results-refresh.yml` with:

- a daily schedule during the season;
- a more frequent schedule around race weekends if desired;
- `workflow_dispatch` for manual reruns;
- Node setup and `npm ci`;
- fetch, validate, and import commands;
- artifact upload for the candidate JSON and validation report;
- failure notifications.

The job should discover races from the database or the season data instead of requiring the race list in `fetch-f1-results.ts` to be edited every round.

### 6. Separate “candidate” from “published”

The scheduled job should automatically fetch and validate a candidate, then:

- publish automatically only when all validation rules pass and the source is marked final;
- otherwise leave the race as `results_pending_review` and notify the administrator.

The safer first release is to always require approval, with a one-click admin “Publish results” action after reviewing the candidate.

### 7. Add source-change detection

On every scheduled run, compare the new candidate with the currently published result:

- no change: mark the run unchanged;
- changed position/status: create a correction candidate;
- new race result: create a new publication candidate;
- incomplete result: reject and alert.

Never silently overwrite a published result when the source changes.

## Phase 3 — Automate race lifecycle and player experience

### 8. Add explicit race lifecycle fields

The current `scheduled/completed/cancelled` state is insufficient for operations. Add either a lifecycle table or fields such as:

- `scheduled`
- `locked`
- `results_pending`
- `review_required`
- `completed`
- `cancelled`

The lock itself should remain timestamp-based and server-enforced. The lifecycle status is for display, operations, and monitoring—not for trusting the browser.

### 9. Add a lifecycle reconciliation job

Run a small scheduled database job that:

- marks races as locked when `starts_at <= now()`;
- finds the next eligible scheduled race;
- detects races that started but have no result candidate;
- marks the season complete after the final race is published;
- never unlocks an already locked race.

This is not a “reset” operation. Each race has its own pick row and deadline. After one race locks, the next race becomes available because it has a separate future deadline.

### 10. Refresh the frontend without requiring a manual reload

Add one of:

- Supabase Realtime subscriptions for race status and publication changes;
- a lightweight polling interval while the page is open;
- refresh-on-focus plus a countdown timer for the visible lock.

At minimum, refresh on window focus and after the displayed lock expires. The UI should not claim results are scored until the published race status is `completed`.

### 11. Add notifications

Notify players when:

- picks open for the next race;
- a pick is approaching its lock deadline;
- results are published;
- a published result is corrected.

Email delivery can be a later phase; in-app banners and realtime updates are enough for the first release.

## Phase 4 — Reliability, security, and observability

### 12. Add operational alerts

Alert the administrator when:

- a scheduled fetch fails;
- the source page changes shape;
- a result has fewer or more rows than expected;
- a race is past its start time with no candidate;
- a candidate differs from published data;
- publication fails transactionally;
- the importer has not run within the expected window.

### 13. Add an admin import inbox

The admin control room should show:

- pending candidate imports;
- source retrieval time and source URLs;
- validation errors and warnings;
- before/after result differences;
- estimated score and leaderboard changes;
- Publish, Reject, and Retry actions;
- full audit history.

### 14. Add rollback and correction support

Provide a transactionally audited correction flow for post-race changes. A correction should show affected driver points, constructor points, player race scores, and standings before it is committed.

Do not delete old result snapshots. Store the correction reason, source evidence, operator, and timestamp.

### 15. Add tests and a staging rehearsal

Add automated tests for:

- duplicate positions;
- missing drivers;
- DNF/DNS/DSQ handling;
- unchanged reruns;
- source corrections;
- partial publication rollback;
- lock enforcement around the exact race start timestamp;
- next-race selection;
- season completion;
- admin-only publication permissions.

Run a simulated race weekend against a staging Supabase project before enabling production publication.

## Suggested implementation order

1. Atomic publish RPC and stronger validation.
2. Import-run/publication audit tables.
3. Dynamic race discovery and idempotent importer.
4. Scheduled candidate-fetch workflow.
5. Admin review and Publish action.
6. Realtime or focus-based frontend refresh.
7. Lifecycle reconciliation and season completion.
8. Notifications, alerts, rollback previews, and staging rehearsals.

## Definition of done

The automation is complete when an ordinary race weekend requires no code edits and no direct SQL:

1. The scheduler discovers the race and fetches the result.
2. Validation either publishes safely or creates an admin review item.
3. Publishing atomically stores results and completes the race.
4. Scores and standings update from the existing database views.
5. The frontend displays the next race and its lock without a hard reload.
6. Players receive the relevant status notification.
7. Every automated attempt, approval, correction, and failure is auditable.
