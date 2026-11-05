# Implementation plan

| Milestone | Scope | Status |
|---|---|---|
| M0 | Inspect repo (empty), docs | Done |
| M1 | Next.js foundation, design system, dashboard, library, players, schema | Done (Supabase not wired) |
| M2 | Engine: registry, lifecycle, events, validation, stats | Done, tested |
| M3 | Phase 10 end to end | Done, unit + e2e tested |
| M4 | UNO, Ticket to Ride, ONO 99, Poker | Done, unit + e2e tested |
| M5 | Rules library with sources and status | Done; **content partly unverified** |
| M6 | Polish: a11y (axe), loading/error states, security notes | Partly done |
| M7 | Supabase adapter (auth, sync), Vercel deploy | **Not started** |

## TODO

- [ ] Verify rules against publisher rulebooks (Phase 10 tie replay, ONO 99 lives/cards/Play 2, TTR route table, tie-breakers, Europe station value). Update `lastVerified` and `verification`.
- [ ] Supabase adapter implementing `Repository` using `append_session_event`; anonymous sign-in for guests.
- [ ] Teams (setup, session_teams, team standings) for games that support them.
- [ ] Multiplayer: game codes, `session_members`, Realtime subscription, permissions.
- [ ] Module migration hook for stored actions when rules versions change.
- [ ] More games and editions (Phase 10 Twist, TTR 1910/Nordic, Rummy, Sequence, Catan, Scrabble).
- [ ] Rule-update review workflow (diff + verify).
- [ ] Per-route `loading.tsx`; PWA/offline manifest. (Global error and not-found pages exist.)
- [ ] Licensed cover art.
- [ ] Vercel project + env docs; CI running vitest and Playwright.
- [ ] Visual regression screenshots in CI.
