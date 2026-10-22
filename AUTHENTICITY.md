After reviewing your [live F1 Fantasy site](https://mcguirecooper.github.io/f1-game/?utm_source=chatgpt.com) and the actual TypeScript/CSS in your [GitHub repository](https://github.com/mcguirecooper/f1-game?utm_source=chatgpt.com), I think the biggest opportunity is to stop designing it like a data dashboard and start designing it like a fantasy sports product.

Your underlying technology is already reasonable for production: TypeScript, Vite, Supabase, Apache ECharts, and AG Grid. I wouldn't replace that stack.

What needs improvement is the information architecture, visual hierarchy, personality, and interaction design.

One caveat: I could inspect the published application source and styling, but I couldn't capture a rendered browser screenshot, so this is a source-informed design review rather than a visual pixel-by-pixel audit.

## 1. What's making your website feel like a demo?

I found six issues worth addressing, ordered by their impact.

1\. Everything is on one giant page

Your navigation scrolls to Leaderboard, Title Race, Players, Constructors, and My Pick. Then the page continues through administrative tools and the scoring system. This is convenient during development but makes the product feel like a collection of features rather than a cohesive application.

2\. Charts get too much visual priority

You have cumulative points, per-race scoring, championship rank, team averages, team results, and constructor usage charts. They're useful, but nearly every section presents another visualization. A production fantasy app should prioritize decisions, standings, and competition over analytics.

3\. The styling is overly uniform

Your CSS relies heavily on the same dark panel backgrounds, thin borders, rounded rectangles, and similar spacing. It creates the familiar AI-generated dashboard aesthetic: technically clean, but without many distinctive visual moments.

4\. Your typography lacks a distinctive identity

Most headings use similar sizes and weights, and much of the interface uses compact Inter/system typography. Important league information, secondary statistics, and page headings aren't sufficiently differentiated.

5\. It doesn't feel sufficiently connected to Formula 1

You have F1 team colors, but the visible interface structure is still fairly generic. Race-specific imagery, flags, circuits, constructor identities, racing terminology, and race-week context would give the website much more character.

6\. Navigation and user actions don't feel distinct enough

Choosing a constructor, viewing your standings, investigating another player, and maintaining league data are very different jobs. The UI currently puts them into a largely continuous flow rather than giving each one its own intentional experience.

These observations are reflected directly in your current [application structure](https://raw.githubusercontent.com/mcguirecooper/f1-game/main/src/main.ts?utm_source=chatgpt.com) and [CSS](https://raw.githubusercontent.com/mcguirecooper/f1-game/main/src/style.css?utm_source=chatgpt.com).&#x20;

[image](https://www.google.com/s2/favicons?domain=https://raw.githubusercontent.com\&sz=32)

GitHub

+1



## 2. My recommended design direction

I would aim for a premium motorsport broadcast aesthetic combined with a polished fantasy sports application.

Not a corporate analytics dashboard. Not a flashy marketing landing page. Something that feels like a real league that people come back to every race weekend.

[Las Vegas Grand Prix 2023 - Mercedes-AMG PETRONAS F1 Team](https://images.openai.com/static-rsc-4/b6w7SVELoEKgdfjh1gJhUaeC737M9TJnP9xddFM-SsYlixGdw26xXwtII1P5aH1bRfyvTbZRGSvteEO15PeFwPLyTgJPqNJthUGl_NeruybxeZ9mu6f5zb3DSvGnxAsRYQl5xkbOwgKyz__zEaipdqvKj3E9hdQiwRwGg3mgZb4?purpose=inline)

Motorsport atmosphere

Photography and circuit details create a recognizable identity.

[How to Read F1 Lap Time Data Like a Race Engineer](https://images.openai.com/static-rsc-4/bT2X0EYtjrmrspzHTOzAbzeERobNlq1OhW7UDCbgJeJ3gVyhMLYqPPAIjZ-dBpGg2hVVxtfcJdOBjJRUEG0Prp4ynxRX0fEbHiOAqhdsEnarcIszaz_BRisRpmMWkcHmAEn332H9oPZiS8A3ke6QVMGWvrMlDphndyTnTyxCHGE?purpose=inline)

Broadcast-inspired data

Precise numbers, confident hierarchy, and restrained accent colors.

I'd preserve your charcoal backgrounds and red accent, but make them more deliberate.

| Design element  | Direction                                                       |
| --------------- | --------------------------------------------------------------- |
| Main background | Near-black `#0B0D12`                                            |
| Surface         | Dark graphite `#171A21`                                         |
| Primary accent  | Racing red `#E10600`                                            |
| Typography      | Inter for interface, a condensed display face for race headings |
| Borders         | Subtle separators, fewer outlined cards                         |
| Layout          | Purposeful asymmetry and stronger hierarchy                     |
| Imagery         | Circuit layouts, race photography, team identifiers             |
| Charts          | Minimalist, embedded within contextual screens                  |

The key is to make the visual personality come from the racing experience, not just from using a red accent color.

## 3. Reorganize the entire experience

This would be my biggest architectural change.

Instead of a long scrolling page with anchor links, use distinct pages, a consistent application shell, and navigation that reflects how someone actually plays the game.

GRID / 26

Conceptual navigation

Home

Race weekend

Standings

League rankings

My Picks

Selections

Players

Competitors

Statistics

Deep analysis

Admin

Admins only

These pages should each have a clear job:

- Home: What race is next? Have I made my pick? Where am I in the standings?
- Standings: Who's winning? By how much? How have positions changed?
- My Picks: Make selections, check remaining constructor allocations, and review history.
- Players: Explore competitors and their performance.
- Statistics: Keep your detailed ECharts visualizations here.
- Admin: Separate management tools with their own navigation.

In particular, move Admin out of the public dashboard entirely. You already have role checks and protected backend operations, which is good. The interface should also feel like a separate professional workflow.

## 4. What I would make your home page look like

The home page should communicate the state of the league within about five seconds.

Here's the layout I'd build using your current information, with illustrative values:

## GRID /26

SEASON 2026

Overview

Standings

My Picks

Statistics

[COTA Leans Into Connectivity To Fuel The Fan Experience](https://images.openai.com/static-rsc-4/yktqAbJw-fbhfCQKhCwvM9Wr8D-nR0H8By3tCewRaw_MWYANFsR46g_8NO4PnBj3CEFOwXBZJNTPkwHez9omVv7fs4Pkc_njocbkck_YAgd3v1z5hZ46kqfZATWWXmwYcgJg0BxXmK_qYyZbP0vyigIOdKVCivQkzwZ63zn4P30?purpose=inline)

[forbes.com](https://www.forbes.com/sites/moorinsights/2023/09/21/cota-leans-into-connectivity-to-fuel-the-fan-experience/?utm_source=chatgpt.com)

ROUND 19 · RACE WEEK

AUSTIN, TEXAS

# United States Grand Prix

October 25, 2026 · Circuit of the Americas

Pick deadline approaching

Make your pick →

YOUR POSITION

# P4

↑ 2 places

TOTAL POINTS

# 642

+38 last race

GAP TO LEADER

# −87

Points behind

Championship standings

Full standings →

01

Alex

729

02

Jordan

702

03

Taylor

671

04

You

642

Illustrative design mockup. Player names, rankings, and scores are placeholders, not your actual league data.

Notice what's different from your current approach:

- There is one unmistakable focal point: the upcoming Grand Prix.
- The user's position matters more than general-purpose analytics.
- The leaderboard becomes a compelling competition rather than just a grid.
- Charts no longer dominate every screen.
- The visual hierarchy is more editorial and less repetitive.

This is the type of change that would significantly elevate the perceived quality of your website.

## 5. Make the individual features feel intentionally designed

[2025 Formula 1 Teams & Drivers | DIRECTV Insider](https://images.openai.com/static-rsc-4/CfKUK638TDp70iOtt-4NOY9jXAxa75Uq6glTLmoYJVRN6h0QKjy1jNqKHZ2o6T06Hj_HnzROH9ZHZ4EA4D5aCSWV8NXN44vvKn7Zi82tyV3YExJxv-JuiJ49VAvsXwN8KJCJ2usMiepJUjlD_K-BI7q0uMTK_1o53aCUzWz9iOs?purpose=inline)

My Picks → a constructor selection experience

Replace the current mostly text-based constructor buttons with selectable team tiles showing an identity, availability, and remaining uses. Keep the actual submission extremely clear, with an explicit confirmation state.

[2018 United States GP](https://images.openai.com/static-rsc-4/RPollqssxWTI9xljWoKN_gXE9lbDGUFsy8Sad8A_7VnxJHNdgf61t5Ri51gaOqvEuxJTuymo1TIxaEjQ4DJUoWbgWoS2MH7VLkssO1_8HK5s22WUhNzP22L7XMhn50ThVd5uIkH025ehG9XP4SmEVclKuvSDbPDegSrFGlnAjQshkADVAd-mDgWJt91x6iK5?purpose=inline)

Standings → a competition experience

Visually distinguish the top three players, highlight the signed-in user, and show position changes. Clicking a player should open their profile rather than forcing the user to scroll to an unrelated selector.

[How do teams analyse F1 race strategy? | The MIA](https://images.openai.com/static-rsc-4/oU6IGIpFmPqYHrk47Hf3Ti2MS5FJBvjh2ytLJb3fPt5Y0KKbvy7Bc6HzF0Co83GthrwRUlCVG3Rd12_BnhjRA-q2bNUa2Ly61o_6BukiLMu8lwp_Za8w68XgdrBadBtMqx4XkNlW3Ftp2QtR8mp_COEcdqanJuOrYwnOG2IUr18?purpose=inline)

Statistics → an analytics experience

Retain ECharts, but organize analysis into intentional subsections like Championship Progression, Constructor Performance, and Pick Distribution. Give users filters instead of simply displaying every chart.

Your current use of AG Grid for standings is functional, but for a league of roughly 13 players, I'd seriously consider replacing the public leaderboard with a custom standings component. Keep AG Grid for dense administrative tables where filtering, sorting, and editing actually matter.

## 6. Polish the small details that make a product feel real

These are less dramatic individually, but collectively they make a major difference.

| Area          | What I would change                                                                       |
| ------------- | ----------------------------------------------------------------------------------------- |
| Branding      | Replace the generic red-square mark and “F1 GAME 2026” with a distinctive league identity |
| URL           | Consider a custom domain instead of a GitHub Pages subdirectory                           |
| Browser tab   | Add a custom favicon and proper metadata                                                  |
| Navigation    | Show the active page, not just hover styling                                              |
| Copy          | Replace “Player deep dive” with “Player Profile”; “Scoring system” with “Rules”           |
| Content       | Remove any user-facing “demo,” “prototype,” or implementation-language references         |
| Data          | Show when scores were last updated and whether results are provisional or official        |
| Loading       | Use skeletons for key sections rather than raw loading text                               |
| Empty states  | Give relevant instructions rather than leaving blank charts/tables                        |
| Feedback      | After saving a pick, clearly show the selected constructor and saved status               |
| Mobile        | Use a compact responsive navigation instead of wrapping all links across rows             |
| Accessibility | Maintain clear focus states, keyboard navigation, and reduced-motion support              |

One particularly important point: I noticed that your code supports demo-data fallbacks and contains prototype-specific wording. Those capabilities are useful for development, but a production user should never have to guess whether the leaderboard represents actual saved league data. Make production mode explicit, and handle failed data loading as a real error rather than silently presenting sample information.

## 7. What I would change first

I wouldn't undertake a complete rewrite. I'd do a focused design overhaul in stages.

## 01

Restructure the navigation and pages

Highest impact

Introduce Home, Standings, My Picks, Players, Statistics, and Admin routes. Create a reusable navigation shell and page headers. Preserve your existing data services and backend.

## 02

Build a proper league home page

Put the next race, pick status, personal standing, and championship leaderboard above the fold. This should become the primary reason someone visits the website.

## 03

Establish a visual design system

Define typography, color tokens, spacing, navigation styles, buttons, tables, and feedback patterns. Eliminate repeated ad hoc card styling.

## 04

Redesign the pick and standings experiences

These are your two most important recurring interactions. Make them more distinctive and easier to use before polishing secondary charts.

## 05

Redesign the admin experience

Build a separate admin shell with a race-oriented workflow: race status, pending result imports, member management, corrections, and audit history. Add clear validation, confirmation, and success states.

## 8. One implementation decision I'd make

Your current `src/main.ts` mixes markup, chart initialization, navigation, authentication, and administrative behavior inside one large application entry point.

That makes it harder to build a consistent product experience as features expand.

I'd refactor toward something like:

```
src/
  app/
    router.ts
    layout.ts
  components/
    navigation/
    ui/
    standings/
    race-week/
    charts/
  pages/
    home.ts
    standings.ts
    picks.ts
    players.ts
    statistics.ts
    admin/
      overview.ts
      races.ts
      results.ts
      members.ts
      audit.ts
  styles/
    tokens.css
    typography.css
    layout.css
    components.css
  services/
    auth.ts
    league.ts
    supabase.ts
```

You can accomplish this with your existing Vite + TypeScript approach. There is no compelling need to migrate to React solely for a visual redesign.

## My overall recommendation

Your website doesn't need more features or more charts. It needs stronger product design decisions.

If you make only three changes, I would choose:

1. Replace the one-page dashboard with purpose-built pages.
2. Make the next race, player standing, and weekly pick the center of the experience.
3. Introduce a distinctive motorsport visual language instead of relying primarily on dark cards and red buttons.

I would also resist the temptation to make everything look exactly like Formula 1's official website. Your league should have its own brand and character, with inspiration from motorsport rather than simply imitating it.

The goal is for someone visiting your website to think “This is our fantasy racing league”, not “This is a dashboard someone built to visualize F1 data.”

And because your existing Supabase, ECharts, and AG Grid stack can support that experience, most of this work can happen in the frontend without jeopardizing the functionality you've already built.