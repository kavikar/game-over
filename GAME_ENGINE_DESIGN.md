# Game engine design

## `GameModule<Config, State, Action>` (`src/engine/types.ts`)

| Capability | Member |
|---|---|
| Metadata, player counts, editions | `meta` |
| Rules reference + versioning | `rules`, `rulesVersion` |
| Setup | `configSchema`, `defaultConfig`, `setupFields`, `validateSetup` |
| Initial state / round init | `init` |
| Action validation | `actionSchema` (Zod) + `validate(state, action): Issue[]` |
| Score calculation, progression, round completion | `reduce(state, action)` |
| Winner, tiebreak, completion | `outcome(state)` |
| Rankings and result formatting | `standings`, `history`, `progressLabel`, `describeAction` |

Modules are pure. `Issue.severity` is `error` (blocks) or `warning` (needs confirmation).

## Session lifecycle (`src/engine/session.ts`)

`createSession → submit | correct | undo | pause | resume | end | cancel`, all through `dispatch(module, session, command, clock)`, which returns a new `Session` or `Issue[]`.

- The session is an ordered **event log** (`created, action, correct, undo, pause, resume, complete, reopen, cancel`).
- `liveActions` folds the log (undo removes, correct replaces). `replay` rebuilds state through `init` + `validate` + `reduce`.
- `submit` is idempotent on `actionId`. A second tap returns the same session (`duplicate: true`).
- `correct` revalidates every later action; if any becomes invalid the correction is refused.
- Completion is derived: after each change the engine checks `outcome().finished` and appends `complete` / `reopen`.
- `rulesVersion` is stored on the session at creation.

## Game notes

- **Phase 10**: per-player phase, totals, `wentOutId`. A phase completes when laid down, so a player can complete without going out. Phase-10 finishers compare cumulative totals; lowest wins; a tie sets `contenders` and play continues (unverified procedure).
- **UNO**: `traditional` (winner collects the sum of others' hands, first to target wins) and `lowest` (each player accumulates own hand points; lowest wins when someone reaches target).
- **Ticket to Ride**: edition tables in `scoring.ts`; one `final` action with components per player.
- **ONO 99**: gameplay-state machine (pile, direction, turns owed, lives, elimination). Legal cards are derived from state.
- **Poker**: integer cents, buy-ins, rebuys, chip counts, cash-outs / busts, tournament payouts with remainder to first place, chip-balance warning.

## Adding a game

Implement `GameModule`, write fixtures-based tests first, add `GameUI`, register both. The registry (`registerGame`) means the library, setup, rules pages, history and stats pick it up automatically.
