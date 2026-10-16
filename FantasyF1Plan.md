# Recommended tech stack for F1 Game 2026

For a small fantasy league with approximately 13 players, a few administrators, and one season's worth of race data, I recommend a single-page TypeScript application backed by Supabase, using Apache ECharts for visualizations and AG Grid Community for data tables.

I would not use React, Next.js, a custom Node.js backend, or microservices initially. They aren't necessary for this scale, and your existing vanilla JavaScript demo gives us a useful starting point.

## 1. The complete technology stack

| Layer          | Recommendation                                 | Why                                             |
| -------------- | ---------------------------------------------- | ----------------------------------------------- |
| Frontend       | Vite + TypeScript                              | Lightweight, typed, fast development            |
| Styling        | Tailwind CSS + CSS variables                   | Retain and refine your dark F1 theme            |
| Charts         | Apache ECharts                                 | Rich interactive visualizations                 |
| Tables         | AG Grid Community                              | Sorting, filtering, cell editing                |
| Authentication | Supabase Auth                                  | Real player and admin accounts                  |
| Database       | Supabase PostgreSQL                            | Persistent shared data                          |
| Backend logic  | Supabase Edge Functions + PostgreSQL functions | Secure pick submission and score updates        |
| Authorization  | Supabase Row Level Security                    | Restrict admin access and protect player picks  |
| Deployment     | Github Pages + Github Actions                  | Host the static frontend                        |
| Testing        | Vitest + Playwright                            | Scoring-rule tests and critical user-flow tests |
| Source control | GitHub                                         | Version history and deployments                 |

This stack uses managed infrastructure rather than maintaining your own server. ECharts supports npm-based integration, AG Grid supports editable cells with validation, and Supabase provides database-level access policies.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://echarts.apache.org\&sz=32)

Apache ECharts

+2



## 2. Architecture

One frontend application, one managed backend, two role-based experiences. No dedicated application server to maintain.

The user and admin interfaces should share components, data queries, and the same scoring rules. Admins simply have additional pages and permissions.

## 3. Recommended pages

I recommend keeping your portfolio intact and deploying F1 Game 2026 as a separate GitHub Pages project.
Recommended repository
mcguirecooper/f1-game

Preferred

mcguirecooper.github.io/f1-game/
Keeps the F1 application separate from your personal website, with its own deployment workflow.

For that configuration, use these settings.
vite.config.ts

import { defineConfig } from 'vite';

export default defineConfig({
  base: '/f1-game/',
});

Vite's official deployment instructions confirm that project sites should use the repository name as their base path. 

[F1 Data Dashboard | Jason Cozy](https://images.openai.com/static-rsc-4/FXnHm_k9fDONr_h5rjYxBkuTHE1VE8VZ8UmGxJkG8t8fMzQsO5GdPMuGhITpd2tyNeAZu2RDD__ADcaiXq5ADFsFIcKKP5OyFiZisAT7jIE0utnL-0aJRQr0mZj4VmoOODqVSLlekuJ3lnLZFFD95PKyuSibrCNrThLVu77Tsbk?purpose=inline)

Player dashboard — `/dashboard`

Leaderboard, title-race progression, player statistics, constructor analysis, and personal pick history. Use ECharts for trends and AG Grid in read-only mode for standings and historical tables.

[CommerceO - Shadcn eCommerce Admin Dashboard Template - Shadcn Studio](https://images.openai.com/static-rsc-4/3VsGddYL4DdiWu0h6cvkZDIWTLMkPxk71FlliN-ncnYjinQSsBvDI822Gt1g8g8u8wKDnBGpqcS4VVGesD6ionJWGzKhFtM9xKb8VQWmpAcCSWmNVVeFemaWhDGtb6whkifSS1uRbtZik-ab6E9AScrP_W2yf7rDptAhdPfluNs?purpose=inline)

Admin dashboard — `/admin`

Editable driver results, constructor scoring, player pick overrides, race scheduling, and an audit trail. Use AG Grid for editing and ECharts for displaying the impact of corrections.

The administrative pages I'd build first are:

- `/admin/races` — race schedule, start times, scoring status, and pick-lock status.
- `/admin/results` — enter or correct driver finishing positions and DNF/DNS outcomes.
- `/admin/picks` — view and override players' selections with an audit reason.
- `/admin/audit` — review previous corrections and identify who made them.

The normal player also gets a `/picks` page for selecting their constructor before each race.

## 4. Database design

I would start with seven core tables rather than creating separate databases or complicated services.

| Table            | Important fields                             | Purpose                            |
| ---------------- | -------------------------------------------- | ---------------------------------- |
| `profiles`       | `id`, `display_name`, `role`                 | Player accounts and admin roles    |
| `seasons`        | `id`, `year`, `status`                       | Supports future seasons            |
| `races`          | `id`, `season_id`, `starts_at`, `status`     | Race schedule and deadlines        |
| `constructors`   | `id`, `name`, `color`                        | The 11 F1 teams                    |
| `drivers`        | `id`, `constructor_id`, `name`               | Drivers and team affiliation       |
| `picks`          | `player_id`, `race_id`, `constructor_id`     | Each player's selection            |
| `driver_results` | `race_id`, `driver_id`, `position`, `status` | Official results entered by admins |

Additional small tables:

- `admin_audit_log` — every administrator correction, previous value, new value, timestamp, and reason.
- `season_rules` — points formula, usage limits, and other configurable settings.
- `constructor_assignments` — driver-to-team mappings by race if mid-season driver changes need to be supported.

I would not initially maintain a separate manually editable `scores` table. Instead, calculate scores from the stored results and picks using shared server-side logic or database views.

### Important rules to enforce

Your demo's game rules are more specific than an ordinary fantasy sports application.

Scoring and validation

Driver points

# 23 − P

For eligible classified finishes

Non-finishes

# 0 pts

DNF, DNS, disqualified

Constructor score

## Driver A + B

Sum of both driver scores

Season usage

## 9×2 + 2×3

24 selections across 11 teams

Enforce these rules on the backend:

1. A player can have only one active pick per race.
2. Picks lock at the scheduled race start, using server time rather than browser time.
3. Player picks remain private until the lock; admins have controlled access for corrections.
4. Constructor usage must respect the league's 2×/3× allocation rule across the season.
5. A driver result correction automatically updates affected scoring calculations.
6. Missing picks remain distinct from zero-point picks.
7. All admin overrides require an audit record.

Your uploaded demo currently keeps user sessions and picks in `localStorage`. That's acceptable for a prototype, but a real multiplayer implementation needs authenticated, server-side storage and validation.

One detail worth preserving: your demo includes historical scoring corrections and a constructor-usage exception. The initial data migration should import those faithfully, flag irregularities for administrator review, and avoid silently changing the standings.

## 5. Project structure

I'd use a single Git repository with frontend, database migrations, and Edge Functions together.

Proposed directory structure

&#x20;Copy

f1-game/ ├── src/ │   ├── main.ts │   ├── app/ │   │   ├── router.ts │   │   └── auth.ts │   ├── pages/ │   │   ├── dashboard.ts │   │   ├── player.ts │   │   ├── picks.ts │   │   └── admin/ │   │       ├── overview\.ts │   │       ├── races.ts │   │       ├── results.ts │   │       ├── picks.ts │   │       └── audit.ts │   ├── components/ │   │   ├── charts/ │   │   ├── grids/ │   │   ├── navigation/ │   │   └── ui/ │   ├── services/ │   │   ├── supabase.ts │   │   ├── races.ts │   │   ├── picks.ts │   │   └── standings.ts │   ├── domain/ │   │   ├── scoring.ts │   │   ├── rules.ts │   │   └── types.ts │   └── styles/ │       ├── theme.css │       └── main.css ├── supabase/ │   ├── migrations/ │   ├── functions/ │   │   ├── submit-pick/ │   │   ├── admin-update-result/ │   │   └── admin-override-pick/ │   └── seed.sql ├── tests/ │   ├── scoring.test.ts │   ├── rules.test.ts │   └── pick-flow\.spec.ts ├── public/ ├── index.html ├── package.json ├── vite.config.ts └── tsconfig.json

The key organizational decision is keeping `domain/scoring.ts` separate from both the visualizations and database access. It can be unit-tested against your existing race data, while the backend remains authoritative for official results.

Any sensitive write should go through an authorized server-side operation. Supabase RLS policies should also protect underlying tables, so hiding admin controls in the frontend isn't the only security measure.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://supabase.com\&sz=32)

Supabase Docs

+1



## 6. Implementation roadmap

I'd implement the project in four stages, keeping your current demo operational during migration.

Phase 1 — Frontend foundation

Move the existing HTML/CSS/JavaScript into a Vite TypeScript project. Replace Chart.js with ECharts, replace leaderboard tables with AG Grid, and retain your F1 color scheme.

Deliverable: polished dashboard using existing demo data.

Phase 2 — Shared data and authentication

Create Supabase tables, import the historical records, configure player/admin roles, and replace localStorage with persisted picks and sessions.

Deliverable: players sign in and submit real, shared picks.

Phase 3 — Admin editing

Implement AG Grid editing for race results and picks, backend validations, automatic scoring calculations, and audit history.

Deliverable: admins can safely operate the league without editing source code.

Phase 4 — Test and deploy

Test scoring against historical data, race locking, permissions, and score corrections. Deploy to Cloudflare Pages, configure the domain, and enable database backups.

Deliverable: production-ready fantasy league.

## 7. What I would intentionally avoid

For a small, private league, skip Redux, Docker/Kubernetes, a separate Express or NestJS API, a cache server, and complicated real-time infrastructure. None is justified by 13 players.

You also don't need automatic external race-data ingestion for the first release. Admins can enter official results manually, and you can add an automated source later if useful.

For live updates, simply re-fetch standings after a saved correction and when players open or return to the dashboard. A real-time subscription system can come later.

## Final stack decision

Vite + TypeScript + ECharts + AG Grid Community + Supabase + Cloudflare Pages

This is what I would build for your use case. It minimizes infrastructure, preserves your existing design and game logic, and supports both player-facing analytics and secure administrative editing.

One final recommendation: build the scoring engine and database rules before implementing admin editing. Incorrect administrative changes that silently corrupt standings would be substantially harder to fix than a missing chart or UI feature.

The biggest remaining product decision is whether normal players should use email/password login or a simpler email magic-link login. For a small invitation-only league, I'd favor email magic links, with an admin-managed whitelist of invited accounts.