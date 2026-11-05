# Architecture

## Shape

```
UI (Next.js App Router, React)  ──►  Store (local-first)  ──►  Engine (pure TS)  ◄──  Game modules
        ▲                                │
        └─ GameUI plug-ins (per game)    └─ Repository port → LocalRepository (today) / Supabase (planned)
```

- **Engine** (`src/engine`): no React, I/O, clock or randomness. Session lifecycle, event log, replay, stats.
- **Game modules** (`src/games/<id>/module.ts`): rules, scoring, validation, winner logic, rules documentation. Independent of each other and of the UI.
- **GameUI** (`src/games/<id>/ui.tsx`): the only game-specific React. Registered in `src/games/ui.ts`.
- **Shell** (`src/components/play`): session header, history, undo, pause, audit. Game-agnostic. Contains no game names.
- **Store** (`src/store`): holds players, sessions, favorites; saves after every change through a `Repository` port.

## Key decisions

| Decision | Reason | Trade-off |
|---|---|---|
| Event-sourced sessions (state = replay of live actions) | Deterministic, auditable undo/correction, free resume | Replay cost grows with events (tiny here) |
| Corrections replay the whole game | A fix cannot silently invalidate later rounds | A correction can be refused with a reason |
| Local-first persistence | Works offline at a table, no account friction, MVP needs one shared device | No cross-device sync until Supabase adapter exists |
| Zod on every action and config | Input is validated at the engine boundary, not in components | Schemas live beside modules |
| Warnings vs errors in `Issue` | Unusual-but-possible input (e.g. 300 card points) asks for confirmation instead of being blocked | Extra confirm step |
| Rules metadata is data, with verification status | Never present unverified rules as official | Needs ongoing review |
| Tailwind v4 tokens, DM Serif Display + Manrope (self-hosted via Fontsource) | Brief's palette; no external font request at runtime | Own components instead of default shadcn |

## Folder structure

```
src/
  app/                 routes: / /games /games/[id] /new/[id] /session/[sid] /players /history /rules /rules/[id]
  components/          ui primitives, nav, cover art, play shell, setup form, views
  engine/              types, registry, session (lifecycle), stats, util
  games/<id>/          module.ts, rules.ts, scoring.ts, ui.tsx   (phase10, uno, ticket-to-ride, ono99, poker)
  store/               store, repository port, local repository
  lib/                 format, session-view, supabase factory
supabase/migrations/   0001_init.sql
tests/                 vitest (engine, games, store, schema)
e2e/                   playwright (journeys, a11y)
```

## Security

- All scoring is deterministic code; no LLM at runtime.
- Supabase: RLS on every table (tested), audit log is append-only for clients, `service_role` key is never read by client code.
- Today there is no server data, so no cross-user exposure exists. Treat the RLS tests as the contract for the Supabase adapter.

## Technical risks

1. **Unverified rules** (see README). Mitigation: per-rule status labels, versioned rules, configurable defaults.
2. **Local storage limits / clearing.** Mitigation: save errors surface in a banner; Supabase sync is the durable fix.
3. **Schema drift of stored actions** when a module changes. Mitigation: `rulesVersion` is stored on each session; replay errors are shown, never silently ignored. A migration hook per module is future work.
4. **Real-time multiplayer** needs ordering/conflicts. Mitigation: `append_session_event` with expected sequence and idempotency keys is already in SQL and tested.
