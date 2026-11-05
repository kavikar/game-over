# Database schema

Source: `supabase/migrations/0001_init.sql`. Applied and tested on Postgres (PGlite) in `tests/schema.test.ts`, including RLS and the append function.

```
auth.users ─┬─ profiles
            ├─ players ─────────────┐
            ├─ teams                │
            ├─ favorites ── games ──┤
            └─ game_sessions ── session_players ── player_round_results ── rounds
                    │   │             └─ session_teams                         │
                    │   └─ game_events (append-only, source of truth) ◄────────┤ score_entries
                    └─ game_version ── game_rules          games ── game_versions
```

- **Source of truth**: `game_events` (gapless `seq` per session, `action_id` unique for idempotency).
- **Projections**: `rounds`, `player_round_results`, `score_entries` for relational queries.
- **JSONB** only for game-specific `config`, event `payload`, round `state`, per-player round `detail`.
- **History safety**: sessions reference a `game_version`; `session_players.display_name` is a snapshot.
- **Statistics**: `player_statistics` is a view over completed sessions (hidden below 3 games).
- **Concurrency**: `append_session_event(session, expected_seq, ...)` locks the session row, returns the original event for a repeated `action_id`, and raises on a stale sequence.
- **RLS**: owner-only for sessions and children; catalog and rules are public read; events are insert/select only.

Not yet in SQL: join-code flow, session members/permissions for multiplayer (planned `session_members` table).
