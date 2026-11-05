-- GameNight schema. Event log (game_events) is the source of truth; rounds/results/score_entries are
-- projections kept in sync by the server so history can be queried relationally.
-- Auth: Supabase Auth (auth.users). Guests use anonymous sign-ins, so every owner is an auth user.


create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player' check (char_length(display_name) between 1 and 40),
  is_guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reusable players. No account needed: owned by the person keeping score.
create table players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 24),
  linked_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index players_owner_name_uq on players (owner_id, lower(name));

-- Catalog. `id` matches the code-side registry id (e.g. 'phase10').
create table games (
  id text primary key,
  name text not null,
  min_players int not null check (min_players >= 1),
  max_players int not null check (max_players >= min_players),
  created_at timestamptz not null default now()
);

-- One row per rules version a game has shipped. Sessions pin to a version; completed games never change.
create table game_versions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id) on delete cascade,
  rules_version text not null,
  released_at timestamptz not null default now(),
  unique (game_id, rules_version)
);

-- Verified-rules metadata per version (publisher, source, verification status).
create table game_rules (
  id uuid primary key default gen_random_uuid(),
  game_version_id uuid not null references game_versions(id) on delete cascade,
  publisher text not null,
  edition text not null,
  source_url text not null,
  source_type text not null check (source_type in ('publisher','secondary','community')),
  verification text not null check (verification in ('verified','partial','unverified')),
  last_verified date,
  notes text
);

create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references games(id),
  game_version_id uuid not null references game_versions(id),
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  config jsonb not null default '{}'::jsonb,      -- game-specific setup only
  join_code text unique check (join_code is null or join_code ~ '^[A-Z0-9]{6}$'),
  last_seq int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index game_sessions_owner_idx on game_sessions (owner_id, status, updated_at desc);
create index game_sessions_game_idx on game_sessions (game_id);

create table teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40)
);
create table session_teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  name text not null,
  unique (session_id, name)
);

create table session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  display_name text not null,                      -- snapshot: renames never rewrite history
  seat int not null check (seat >= 0),
  session_team_id uuid references session_teams(id) on delete set null,
  is_guest boolean not null default false,
  final_rank int,
  final_value numeric,
  is_winner boolean not null default false,
  unique (session_id, seat)
);
create index session_players_player_idx on session_players (player_id);

-- Append-only audit log. seq is gapless per session; action_id makes retries idempotent.
create table game_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  seq int not null check (seq >= 1),
  type text not null check (type in ('created','action','correct','undo','pause','resume','complete','reopen','cancel')),
  action_id uuid,
  target_event_id uuid references game_events(id),
  payload jsonb,
  note text,
  actor_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);
create unique index game_events_action_uq on game_events (session_id, action_id) where action_id is not null;

-- Projections of live (non-undone) actions for relational queries.
create table rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  number int not null check (number >= 1),
  event_id uuid not null references game_events(id),
  state jsonb,
  unique (session_id, number)
);
create table player_round_results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  session_player_id uuid not null references session_players(id) on delete cascade,
  detail jsonb not null default '{}'::jsonb,       -- e.g. {"completed":true,"phaseBefore":4}
  unique (round_id, session_player_id)
);
create table score_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  round_id uuid references rounds(id) on delete cascade,
  session_player_id uuid not null references session_players(id) on delete cascade,
  component text not null default 'total',          -- 'cards', 'routes', 'tickets', 'net', ...
  points numeric not null,
  event_id uuid not null references game_events(id)
);
create index score_entries_session_idx on score_entries (session_id, session_player_id);

create table favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null references games(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- Statistics derive from completed sessions only, never stored separately (no drift).
create view player_statistics with (security_invoker = true) as
select
  p.owner_id, p.id as player_id, gs.game_id,
  count(*) as games_played,
  count(*) filter (where sp.is_winner) as wins,
  case when count(*) >= 3 then round(100.0 * count(*) filter (where sp.is_winner) / count(*), 1) end as win_pct,
  case when count(*) >= 3 then round(avg(sp.final_value), 2) end as avg_value,
  max(sp.final_value) as best_value
from session_players sp
join players p on p.id = sp.player_id
join game_sessions gs on gs.id = sp.session_id and gs.status = 'completed'
group by p.owner_id, p.id, gs.game_id;

-- Server-side append: ordered, idempotent, and atomic with the session counter.
create function append_session_event(
  p_session uuid, p_expected_seq int, p_type text, p_action_id uuid, p_target uuid, p_payload jsonb, p_note text
) returns game_events language plpgsql security invoker as $$
declare s game_sessions; e game_events;
begin
  select * into s from game_sessions where id = p_session for update;
  if not found then raise exception 'session not found' using errcode = 'P0002'; end if;
  if p_action_id is not null then
    select * into e from game_events where session_id = p_session and action_id = p_action_id;
    if found then return e; end if;                         -- duplicate submission: return original
  end if;
  if s.last_seq <> p_expected_seq then
    raise exception 'stale session (expected %, have %)', p_expected_seq, s.last_seq using errcode = '40001';
  end if;
  insert into game_events (session_id, seq, type, action_id, target_event_id, payload, note, actor_id)
  values (p_session, s.last_seq + 1, p_type, p_action_id, p_target, p_payload, p_note, auth.uid())
  returning * into e;
  update game_sessions set last_seq = e.seq, updated_at = now(),
    status = case p_type when 'pause' then 'paused' when 'resume' then 'active' when 'reopen' then 'active'
                         when 'complete' then 'completed' when 'cancel' then 'cancelled' else status end,
    completed_at = case p_type when 'complete' then now() when 'reopen' then null else completed_at end
  where id = p_session;
  return e;
end $$;

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table players enable row level security;
alter table games enable row level security;
alter table game_versions enable row level security;
alter table game_rules enable row level security;
alter table game_sessions enable row level security;
alter table teams enable row level security;
alter table session_teams enable row level security;
alter table session_players enable row level security;
alter table game_events enable row level security;
alter table rounds enable row level security;
alter table player_round_results enable row level security;
alter table score_entries enable row level security;
alter table favorites enable row level security;

create policy profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy players_owner on players for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy teams_owner on teams for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy favorites_owner on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Catalog and rules are public read-only; writes happen with the service role in migrations/seeds only.
create policy games_read on games for select using (true);
create policy game_versions_read on game_versions for select using (true);
create policy game_rules_read on game_rules for select using (true);

create policy sessions_owner on game_sessions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Child tables: allowed iff the parent session belongs to the caller.
create policy session_players_owner on session_players for all
  using (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()));
create policy session_teams_owner on session_teams for all
  using (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()));
create policy rounds_owner on rounds for all
  using (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()));
create policy score_entries_owner on score_entries for all
  using (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()));
create policy player_round_results_owner on player_round_results for all
  using (exists (select 1 from rounds r join game_sessions s on s.id = r.session_id where r.id = round_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from rounds r join game_sessions s on s.id = r.session_id where r.id = round_id and s.owner_id = auth.uid()));

-- The audit log is append-only for clients: read and insert, never update or delete.
create policy game_events_read on game_events for select
  using (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()));
create policy game_events_insert on game_events for insert
  with check (exists (select 1 from game_sessions s where s.id = session_id and s.owner_id = auth.uid()));
