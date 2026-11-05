# GameNight

*One place for every game night.*

A scorekeeper and session tracker for board and card games. One app, one universal game engine, and independent game modules that each own their rules and scoring.

**Games:** Phase 10 (reference implementation), UNO, Ticket to Ride (USA, Europe), ONO 99, Poker Night (cash and tournament bankroll tracker).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 46+ unit/integration tests (engine, all games, store, SQL schema + RLS)
npm run build && npm run e2e   # Playwright end-to-end + accessibility (axe) tests
```

No setup is needed. Data is saved in the browser (`localStorage`), so unfinished games survive a refresh or reopen. Supabase is optional and not yet wired in (see below).

If Playwright cannot find Chromium, set `CHROMIUM_PATH` to a Chrome/Chromium binary.

## What works today

- Dashboard, searchable/filterable game library, favorites, recent games.
- Saved players and temporary guests; seat order doubles as turn order.
- Per-game setup generated from each module's `setupFields` (edition, house rules, targets, lives, buy-ins).
- Purpose-built scoring UI per game, mobile-first (sheet entry, large steppers, card counters).
- Undo, corrections (replay of all later entries), pause/resume, manual end, cancel, rematch, audit trail.
- Duplicate-submission protection (idempotency key per entry).
- Results, history, per-player stats (hidden until there are enough games), head to head.
- Rules library with source, verification status and a label on every rule: official / app interpretation / house / unverified.

## Honest status

- **Rules verification is incomplete.** The build environment could not open publisher PDFs. Rules were cross-checked against search summaries only. Every game's page shows a verification badge. Phase 10 tie replay, ONO 99 (lives, ONO 99 card, Play 2), Ticket to Ride tie-breakers and Europe values are marked unverified or partial. Please check them against your rulebooks.
- **Supabase is schema-only.** `supabase/migrations/0001_init.sql` (tables, RLS, an atomic append function) is tested on a real Postgres engine, but the app does not read or write Supabase yet. Authentication, sync and multiplayer are not built.
- **Teams, game codes, live multiplayer, Vercel deployment** are designed for but not implemented.
- Cover art is original placeholder art, not publisher artwork.

See `IMPLEMENTATION_PLAN.md` for the TODO list.

## Docs

`ARCHITECTURE.md` · `GAME_ENGINE_DESIGN.md` · `DATABASE_SCHEMA.md` · `IMPLEMENTATION_PLAN.md`

## Adding a game

1. `src/games/<id>/module.ts` implements `GameModule` (pure TypeScript, Zod schemas, tests).
2. `src/games/<id>/ui.tsx` exports a `GameUI` (board and entry form).
3. One line each in `src/games/index.ts` and `src/games/ui.ts`.

No shared component contains game-specific scoring.
