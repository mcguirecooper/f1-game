# 2026 F1 source register

The recommended source set is free and first-party:

| Data | Source | Use |
| --- | --- | --- |
| Current calendar and official race weekend dates | [Formula 1 2026 race calendar](https://www.formula1.com/en/racing/2026) | Schedule and current season status |
| Official published race results | [Formula 1 2026 race results](https://www.formula1.com/en/results/2026/races) | Cross-check winners and completed races |
| Driver classifications by race | [FIA 2026 classifications](https://www.fia.com/events/fia-formula-one-world-championship/season-2026/2026-classifications) | Driver results, DNF/DNS status, and official championship record |
| Entry lists and final classifications | [FIA 2026 decision documents](https://www.fia.com/documents/season/season-2026-1130/world-championships-2/formula-1-world-championship-16) | Race-specific authoritative documents and corrections |
| Sporting rules and championship structure | [FIA Formula One regulations](https://www.fia.com/regulation/category/110) | Rules and official terminology |

## Source policy

Use the FIA documents as the authority for final classifications, driver status, and corrections. Use the Formula 1 calendar as the current schedule presentation, then verify any disputed round or time against the FIA calendar and race documents. Formula 1's official results page is a convenient cross-check, not a substitute for an FIA final classification document when the two disagree.

## Current reconciliation flag

As of the initial source review, the Formula 1 calendar page presents 23 2026 rounds and lists the United States race as round 18. The FIA classifications page still exposes a 24-column layout containing Saudi Arabia and three United States columns. This must be resolved before the production seed is generated; the importer should reject a season file whose race count or round keys are not reconciled against the selected calendar snapshot.

The reviewed 2026 schedule, roster, completed-race results, and historical picks have been loaded into the linked Supabase project. The checked-in JSON/SQL files remain reviewable import artifacts; the spreadsheet pick import was a one-off production operation and is intentionally not represented as a rerunnable seed.
