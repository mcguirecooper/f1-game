# F1 Game 2026 — GitHub Pages + Supabase Setup

Recommended production stack

We'll use a separate GitHub repository for your F1 fantasy league, keeping your personal website untouched.

PRODUCTION WEBSITE

## [mcguirecooper.github.io/f1-game/](https://mcguirecooper.github.io/f1-game/?utm_source=chatgpt.com)

GitHub repository

`mcguirecooper/f1-game`

Backend

Supabase

Frontend

Vite + TypeScript

UI libraries

ECharts + AG Grid

This setup supports your 13-player fantasy league, 11 constructors, 24-race season, player authentication, private picks, and a few administrators editing results.

## 1. Final technology choices

| Component          | Technology                                    | Package                            |
| ------------------ | --------------------------------------------- | ---------------------------------- |
| Application        | Vanilla TypeScript                            | `typescript`                       |
| Build system       | Vite                                          | `vite`                             |
| Charts             | Apache ECharts                                | `echarts`                          |
| Tables and editing | AG Grid Community                             | `ag-grid-community`                |
| Database / Auth    | Supabase                                      | `@supabase/supabase-js`            |
| Styling            | Tailwind CSS v4                               | `tailwindcss`, `@tailwindcss/vite` |
| Routing            | Lightweight hash router                       | Built in                           |
| Tests              | Vitest                                        | `vitest`                           |
| Hosting            | GitHub Pages                                  | GitHub Actions                     |
| Backend operations | PostgreSQL RPCs + Edge Functions where needed | Supabase CLI                       |

For this small league, I'd use PostgreSQL functions for atomic pick submission and scoring-related changes, reserving Edge Functions for operations that truly require server-side TypeScript.

## 2. Create the repository and install dependencies

First, create a new repository at [github.com/new](https://github.com/new?utm_source=chatgpt.com) with:

- Owner: `mcguirecooper`
- Repository name: `f1-game`
- Visibility: Public (compatible with GitHub Pages on GitHub Free)
- Do not initialize it with a README, `.gitignore`, or license; Vite will generate the starting project.

Then open your terminal:

```

npm create vite@latest f1-game -- --template vanilla-ts
cd f1-game

# App dependencies
npm install echarts ag-grid-community @supabase/supabase-js

# Tailwind integration
npm install -D tailwindcss @tailwindcss/vite

# Testing
npm install -D vitest

# Supabase CLI
npm install -D supabase

# Check that the starter runs
npm run dev

```

Use a supported Node.js LTS release that satisfies the installed Vite version's engine requirements (Node.js 22 LTS is an appropriate choice).

Then initialize Git:

```

git init
git branch -M main

git remote add origin \
  https://github.com/mcguirecooper/f1-game.git

git add .
git commit -m "Initialize F1 fantasy league"
git push -u origin main

```

The commands assume that Git is configured and you have authenticated with GitHub.

## 3. Configure Vite for GitHub Pages

Create or replace `vite.config.ts`:

```

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: '/f1-game/',
  plugins: [tailwindcss()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
  },
});

```

For Vitest's `test` configuration to be recognized by TypeScript, import `defineConfig` from `vitest/config` instead of `vite`, or place the test settings in a separate `vitest.config.ts`.

The most important line is:

```
base: '/f1-game/'
```

Without it, GitHub Pages can fail to load compiled JavaScript and CSS because it looks for assets at the domain root rather than under `/f1-game/`.

Add the Tailwind import to `src/style.css`:

```

@import "tailwindcss";

:root {
  color-scheme: dark;
  --bg: #0b0e14;
  --panel: #121826;
  --panel-2: #171f30;
  --border: #253049;
  --text: #eaeef5;
  --muted: #8f99ad;
  --accent: #e8002d;
  --good: #2fbf71;
  --warn: #f5a623;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: Inter, system-ui, sans-serif;
}

```

These CSS variables carry forward the dark F1-inspired palette from your demo.

## 4. Configure GitHub Actions deployment

Create:

`.github/workflows/deploy.yml`

```

name: Deploy F1 Game

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: github-pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm

      - name: Install
        run: npm ci

      - name: Run tests
        run: npm test -- --run

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Configure Pages
        uses: actions/configure-pages@v5

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    runs-on: ubuntu-latest
    needs: build

    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4

```

Add this script to `package.json`:

```
"test": "vitest"
```

You can retain the other scripts Vite generated, including `dev`, `build`, and `preview`.

GitHub's official deployment actions use the `configure-pages`, `upload-pages-artifact`, and `deploy-pages` sequence shown here.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://docs.github.com\&sz=32)

GitHub Docs



### Enable deployment

In the `f1-game` repository:

1. Go to Settings → Pages.
2. Set Build and deployment → Source to GitHub Actions.
3. Push to `main`.
4. Check the Actions tab for the build and deployment results.

Once the workflow succeeds, the site will be published at `https://mcguirecooper.github.io/f1-game/`.

The repository and live deployment have not yet been created by this conversation; these are the setup instructions.

## 5. Create and configure Supabase

Open [Supabase Dashboard](https://supabase.com/dashboard?utm_source=chatgpt.com) and create a project.

| Field             | Value                                      |
| ----------------- | ------------------------------------------ |
| Project name      | `f1-game`                                  |
| Database region   | Closest suitable US region                 |
| Database password | Strong, unique generated password          |
| Frontend URL      | `https://mcguirecooper.github.io/f1-game/` |

After creation, go to Project Settings → API Keys and copy the project URL and publishable key.

### Local environment variables

Create `.env.local`:

```

VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

```

Confirm `.env.local` is excluded by `.gitignore`.

Create `src/services/supabase.ts`:

```

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

```

### GitHub repository variables

Go to Repository → Settings → Secrets and variables → Actions → Variables.

Add:

| Variable                        | Value                     |
| ------------------------------- | ------------------------- |
| `VITE_SUPABASE_URL`             | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your publishable API key  |

These are intentionally public frontend configuration values. Vite embeds `VITE_` variables in the compiled JavaScript, so never put a Supabase secret key, service-role key, database password, or personal access token in them.

The GitHub Actions workflow from Section 4 reads these variables automatically during the build.

## 6. Configure authentication for your small league

For your 13-player league, I recommend invitation-only email magic links. This eliminates passwords and makes it easy to add a few trusted administrators.

In Supabase:

Authentication → URL Configuration

| Setting                     | Exact URL                                  |
| --------------------------- | ------------------------------------------ |
| Site URL                    | `https://mcguirecooper.github.io/f1-game/` |
| Allowed production redirect | `https://mcguirecooper.github.io/f1-game/` |
| Allowed local redirect      | `http://localhost:5173/`                   |

Then go to Authentication → Providers → Email, enable email authentication, and set up magic-link sign-in.

In Authentication → Settings, disable public new-user signup once your player accounts have been provisioned. For an invitation-only league, also keep anonymous sign-ins disabled. Supabase supports restricting sign-in to existing accounts.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://supabase.com\&sz=32)

Supabase Docs



Use the Supabase admin invitation workflow to invite your players. For each person, create a matching player profile linked to their Supabase Auth user ID.

### Magic-link sign-in

Create `src/services/auth.ts`:

```

import { supabase } from './supabase';

export async function signIn(email: string) {
  const redirectTo = new URL(
    import.meta.env.BASE_URL,
    window.location.origin,
  ).href;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

```

This returns users to the application root, where the Supabase client can process the authentication callback. Supabase documents `signInWithOtp` for magic-link/OTP authentication and requires redirect destinations to be allowlisted.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://supabase.com\&sz=32)

Supabase Docs

+1



If you're sending roughly 13 invitation emails, you'll also want to review the Supabase email service's sending limits. A custom SMTP provider may be needed for reliable ongoing sign-in emails.

## 7. Initialize the database

From the project directory:

```

npx supabase init

npx supabase login

npx supabase link --project-ref YOUR_PROJECT_REF

npx supabase migration new initial_schema

```

This creates a timestamped migration file under `supabase/migrations/`. Migrations let you track every database change in Git, rather than changing production tables manually.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://supabase.com\&sz=32)

Supabase Docs



### Initial schema

The following establishes the core tables for your fantasy league. It intentionally stores individual driver results rather than editing calculated fantasy points directly.

```

create table public.profiles (
  id uuid primary key references auth.users(id),
  display_name text not null,
  role text not null default 'player'
    check (role in ('player', 'admin'))
);

create table public.seasons (
  id bigint generated always as identity primary key,
  year integer not null unique,
  status text not null default 'active'
);

create table public.races (
  id bigint generated always as identity primary key,
  season_id bigint not null references public.seasons(id),
  name text not null,
  round_number integer not null,
  starts_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  unique (season_id, round_number)
);

create table public.constructors (
  id bigint generated always as identity primary key,
  name text not null unique,
  color text not null
);

create table public.drivers (
  id bigint generated always as identity primary key,
  name text not null,
  code text not null unique
);

create table public.driver_results (
  race_id bigint not null references public.races(id),
  driver_id bigint not null references public.drivers(id),
  constructor_id bigint not null
    references public.constructors(id),
  finishing_position integer
    check (finishing_position between 1 and 22),
  status text not null
    check (status in ('finished', 'dnf', 'dns', 'dsq')),
  primary key (race_id, driver_id)
);

create table public.picks (
  player_id uuid not null references public.profiles(id),
  race_id bigint not null references public.races(id),
  constructor_id bigint not null
    references public.constructors(id),
  submitted_at timestamptz not null default now(),
  primary key (player_id, race_id)
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index idx_picks_race
  on public.picks(race_id);

create index idx_races_season
  on public.races(season_id, round_number);

```

This is the initial structural schema, not the entire completed scoring backend. Before live play, you also need a season-rule configuration, a race-specific driver assignment model if drivers change teams, server-enforced pick limits, scoring views/functions, and audited administrative write operations.

### Row Level Security

Enable RLS on every application table:

```

alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.races enable row level security;
alter table public.constructors enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_results enable row level security;
alter table public.picks enable row level security;
alter table public.admin_audit_log enable row level security;

```

Use these as starting read policies:

```

-- Players may view their own profile.
create policy "Read own profile"
on public.profiles
for select to authenticated
using (id = (select auth.uid()));

-- Authenticated league members can view the schedule.
create policy "Read race schedule"
on public.races
for select to authenticated
using (true);

-- Players may see their own picks before a race locks,
-- and all picks for races whose start time has passed.
create policy "Read visible picks"
on public.picks
for select to authenticated
using (
  player_id = (select auth.uid())
  or exists (
    select 1
    from public.races r
    where r.id = race_id
      and r.starts_at <= now()
  )
);

-- Constructors and drivers are readable by league members.
create policy "Read constructors"
on public.constructors
for select to authenticated
using (true);

create policy "Read drivers"
on public.drivers
for select to authenticated
using (true);

-- Published race results are readable.
create policy "Read published results"
on public.driver_results
for select to authenticated
using (
  exists (
    select 1 from public.races r
    where r.id = race_id
      and r.status = 'completed'
  )
);

create policy "Read seasons"
on public.seasons
for select to authenticated
using (true);

```

With these policies, there are deliberately no direct player insert/update permissions on picks or driver results. Those writes will be performed through validated backend operations.

Remember that RLS policies and SQL grants work together. For the read queries above, ensure the authenticated role has the required `SELECT` privileges on the relevant tables. Do not grant write privileges merely to make the admin grid editable.

For the admin interface, use a privileged backend function that verifies the caller's identity and checks their administrator status. Supabase recommends using properly secured functions and database policies to enforce permissions, rather than relying on client-side controls.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://supabase.com\&sz=32)

Supabase Docs



### Apply the migration

After putting the schema and policies into your migration file:

```

# Preview pending changes
npx supabase db push --dry-run

# Apply them to the linked Supabase project
npx supabase db push

# Generate TypeScript types
npx supabase gen types typescript --linked \
  > src/services/database.types.ts

```

For production, review migration SQL before running `db push`. Do not use `db reset --linked` against your live database because it is destructive.

## 8. Secure backend operations for players and admins

I'd implement three server-side operations first:

| Operation             | Who can call it | Backend checks                                          |
| --------------------- | --------------- | ------------------------------------------------------- |
| `submit-pick`         | Player          | Authenticated, race not locked, valid constructor usage |
| `admin-update-result` | Admin           | Admin role, valid result, audit logging                 |
| `admin-override-pick` | Admin           | Admin role, reason provided, audit logging              |

These will be Supabase Edge Functions. You don't need a separate Express backend.

Create them with:

```

npx supabase functions new submit-pick
npx supabase functions new admin-update-result
npx supabase functions new admin-override-pick

```

For each function, the execution pattern should be:

1. Authenticate the request using its Supabase user session.
2. For administrative operations, verify the user's admin role from the database.
3. Validate the requested change against race deadlines and league rules.
4. Perform the database changes atomically, using PostgreSQL functions for transactions.
5. Write an audit record in the same transaction for admin changes.
6. Return the updated result so the frontend can refresh its charts and tables.

For the current Supabase Edge Functions platform, use its documented authenticated-user handling rather than trusting an admin role sent in the request body. Supabase's authenticated user function wrapper is designed for this.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://supabase.com\&sz=32)

Supabase Docs



An important implementation detail: A database transaction must perform the result update and audit insertion together. Two independent JavaScript requests are not sufficient for guaranteed atomicity.

Deploy once the function handlers and validations are implemented:

```
npx supabase functions deploy
```

That deploys the Supabase functions independently of GitHub Pages. The GitHub Pages workflow only deploys frontend assets.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://supabase.com\&sz=32)

Supabase Docs



## 9. Install and configure ECharts

Create `src/components/charts/standingsChart.ts`:

```

import * as echarts from 'echarts';

export interface StandingsPoint {
  race: string;
  points: number;
}

export function renderStandingsChart(
  element: HTMLElement,
  history: StandingsPoint[]
) {
  const chart = echarts.init(element, 'dark');

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: {
      left: 50,
      right: 20,
      top: 30,
      bottom: 70,
    },
    xAxis: {
      type: 'category',
      data: history.map(p => p.race),
      axisLabel: { rotate: 35 },
    },
    yAxis: {
      type: 'value',
      name: 'Points',
    },
    series: [{
      name: 'Championship Points',
      type: 'line',
      smooth: true,
      symbolSize: 7,
      lineStyle: {
        color: '#E8002D',
        width: 3,
      },
      itemStyle: {
        color: '#E8002D',
      },
      areaStyle: {
        opacity: 0.12,
      },
      data: history.map(p => p.points),
    }],
  });

  return chart;
}

```

The chart needs a container with a nonzero height. Call `chart.resize()` when its container changes size, and `chart.dispose()` if its page is removed.

In your full app, this module can evolve into a multi-player championship progression chart with selectable competitors, constructor colors, and detailed race tooltips.

## 10. Configure AG Grid for the admin dashboard

Create `src/components/grids/resultsGrid.ts`:

```

import {
  AllCommunityModule,
  ModuleRegistry,
  createGrid,
  themeQuartz,
  type GridOptions,
} from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export interface DriverResultRow {
  driverId: number;
  driver: string;
  constructor: string;
  position: number | null;
  status: 'finished' | 'dnf' | 'dns' | 'dsq';
}

const f1Theme = themeQuartz.withParams({
  backgroundColor: '#121826',
  foregroundColor: '#EAEef5',
  headerBackgroundColor: '#171F30',
  accentColor: '#E8002D',
  borderColor: '#253049',
});

export function createResultsGrid(
  element: HTMLElement,
  rows: DriverResultRow[],
  saveResult: (row: DriverResultRow) => Promise<void>,
) {
  const options: GridOptions<DriverResultRow> = {
    theme: f1Theme,
    rowData: rows,

    columnDefs: [
      { field: 'driver', editable: false },
      { field: 'constructor', editable: false },

      {
        field: 'position',
        editable: true,
        cellEditor: 'agNumberCellEditor',
      },

      {
        field: 'status',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['finished', 'dnf', 'dns', 'dsq'],
        },
      },
    ],

    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
    },

    onCellValueChanged: async (event) => {
      if (!event.data) return;

      try {
        await saveResult(event.data);
      } catch (error) {
        console.error('Save failed:', error);

        // Restore authoritative data from the server
        // and show the user an error notification.
        // Implement this in the admin page's data service.
      }
    },
  };

  return createGrid(element, options);
}

```

This creates an editable grid with sorting, filtering, number editing, and status dropdowns. AG Grid's current JavaScript integration uses `AllCommunityModule`, `createGrid`, and theme objects.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.ag-grid.com\&sz=32)

AG Grid

+1



For production, I'd make one important improvement: do not automatically commit each edited cell as an official result. Instead, let admins edit a draft, validate the complete race results, preview resulting fantasy scores, and press Publish results.

That's safer than changing live championship points after every cell edit.

## 11. Frontend routing

For GitHub Pages, keep routing lightweight.

Recommended routes

| Home / standings     | `#/dashboard`     |
| -------------------- | ----------------- |
| Player stats         | `#/players`       |
| Constructor analysis | `#/constructors`  |
| My pick              | `#/picks`         |
| Admin overview       | `#/admin`         |
| Admin results        | `#/admin/results` |
| Admin picks          | `#/admin/picks`   |

A simple router can dispatch based on `window.location.hash`. Before rendering admin pages, check the authenticated session and role.

The route guard controls what is visible in the UI, while Supabase remains responsible for actual data authorization.

## 12. Final repository structure

```

f1-game/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
├── src/
│   ├── main.ts
│   ├── style.css
│   ├── app/
│   │   ├── router.ts
│   │   └── authGuard.ts
│   ├── pages/
│   │   ├── dashboard.ts
│   │   ├── players.ts
│   │   ├── constructors.ts
│   │   ├── picks.ts
│   │   └── admin/
│   │       ├── dashboard.ts
│   │       ├── results.ts
│   │       └── picks.ts
│   ├── components/
│   │   ├── charts/
│   │   │   └── standingsChart.ts
│   │   └── grids/
│   │       └── resultsGrid.ts
│   ├── domain/
│   │   ├── scoring.ts
│   │   ├── rules.ts
│   │   └── types.ts
│   └── services/
│       ├── supabase.ts
│       ├── auth.ts
│       ├── races.ts
│       └── picks.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   └── functions/
│       ├── submit-pick/
│       ├── admin-update-result/
│       └── admin-override-pick/
├── tests/
│   ├── scoring.test.ts
│   └── rules.test.ts
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
└── vite.config.ts

```

## 13. Deployment checklist

Project setup progress

0/12

Create mcguirecooper/f1-game repository

Install Vite and frontend dependencies

Configure /f1-game/ base path

Add GitHub Actions workflow

Create Supabase project

Set Supabase authentication redirect URLs

Add GitHub Actions environment variables

Create and apply database migrations

Implement RLS and secure backend mutations

Import historical F1 data and verify scores

Implement player and admin interfaces

Run tests and deploy

&#x20;Copy checklist

## 14. What to build first from your existing demo

Your uploaded HTML already contains the league's initial data, including constructor results, player picks, cumulative scoring, and team usage.

I would reuse it as a migration source rather than manually reentering the entire season.

One complication is that the historical data contains aggregate pick counts and usage totals, but not necessarily a complete per-player/per-race record of selected constructors. We should verify and recover those selections from your original spreadsheet before assuming the full historical `picks` table can be reconstructed.

I would prioritize the following implementation order:

1. Deploy a working frontend to GitHub Pages with ECharts and AG Grid, initially using the demo data.
2. Import and verify the historical season data, comparing the new standings to the demo before enabling edits.
3. Connect Supabase Auth, add invited player accounts, and link historical player records to those accounts.
4. Implement secure pick submission with deadline and constructor-usage validation.
5. Implement admin result editing, using draft results, an impact preview, and an audited publish action.

The SQL above is the starting schema, and the ECharts and AG Grid snippets are component examples. They are not yet a complete runnable league application; the remaining backend functions, scoring views, routing, data migration, and UI integration must still be implemented and tested.

### Final recommendation

Keep this as one GitHub repository, one Vite frontend, and one Supabase project, with PostgreSQL as the authoritative source of truth. For a small private league, this will give you most of the convenience of a larger application without its infrastructure complexity.

Your deployment targets are:

- [GitHub repository](https://github.com/mcguirecooper/f1-game?utm_source=chatgpt.com)
- [F1 Game website](https://mcguirecooper.github.io/f1-game/?utm_source=chatgpt.com)
- [Supabase backend dashboard](https://supabase.com/dashboard?utm_source=chatgpt.com)

The repository and deployed F1 site URLs are intended destinations, not a claim that they are already live.