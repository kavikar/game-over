import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Applies the real migration to an in-process Postgres with a stub of Supabase's `auth` schema. */
async function db() {
  const pg = new PGlite();
  await pg.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
    create role authenticated;
  `);
  await pg.exec(readFileSync("supabase/migrations/0001_init.sql", "utf8"));
  return pg;
}

const U1 = "11111111-1111-1111-1111-111111111111";
const U2 = "22222222-2222-2222-2222-222222222222";

describe("database schema", () => {
  it("applies cleanly and enforces constraints", async () => {
    const pg = await db();
    await pg.exec(`insert into auth.users values ('${U1}'), ('${U2}');
      insert into games values ('phase10','Phase 10',2,6);
      insert into game_versions (id, game_id, rules_version) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','phase10','p10-classic-2026.1');`);
    await pg.exec(`insert into players (owner_id, name) values ('${U1}','Karthik');`);
    await expect(pg.exec(`insert into players (owner_id, name) values ('${U1}','karthik');`)).rejects.toThrow(); // case-insensitive unique
    await expect(pg.exec(`insert into games values ('x','X',5,2)`)).rejects.toThrow(); // max >= min
    await expect(pg.exec(`insert into game_sessions (owner_id, game_id, game_version_id, status) values ('${U1}','phase10','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bogus')`)).rejects.toThrow();
  });

  it("append_session_event is ordered, idempotent and detects stale writers", async () => {
    const pg = await db();
    await pg.exec(`insert into auth.users values ('${U1}');
      insert into games values ('phase10','Phase 10',2,6);
      insert into game_versions (id, game_id, rules_version) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','phase10','v1');
      insert into game_sessions (id, owner_id, game_id, game_version_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','${U1}','phase10','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      set app.uid = '${U1}';`);
    const A = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    const call = (seq: number, type: string, action: string | null) =>
      pg.query(`select (append_session_event('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', ${seq}, '${type}', ${action ? `'${action}'` : "null"}, null, '{"x":1}', null)).seq as seq`);
    expect((await call(0, "created", null)).rows[0]).toEqual({ seq: 1 });
    expect((await call(1, "action", A)).rows[0]).toEqual({ seq: 2 });
    expect((await call(1, "action", A)).rows[0]).toEqual({ seq: 2 }); // duplicate submission returns the original
    await expect(call(1, "action", "dddddddd-dddd-dddd-dddd-dddddddddddd")).rejects.toThrow(/stale/);
    const n = await pg.query(`select count(*)::int as n from game_events`);
    expect(n.rows[0]).toEqual({ n: 2 });
    const st = await pg.query(`select last_seq from game_sessions`);
    expect(st.rows[0]).toEqual({ last_seq: 2 });
    await call(2, "complete", null);
    expect((await pg.query(`select status from game_sessions`)).rows[0]).toEqual({ status: "completed" });
  });

  it("RLS: users only see and change their own sessions, players and events", async () => {
    const pg = await db();
    await pg.exec(`insert into auth.users values ('${U1}'), ('${U2}');
      insert into games values ('phase10','Phase 10',2,6);
      insert into game_versions (id, game_id, rules_version) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','phase10','v1');
      insert into game_sessions (id, owner_id, game_id, game_version_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','${U1}','phase10','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      insert into game_events (session_id, seq, type) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',1,'created');
      insert into players (owner_id, name) values ('${U1}','Karthik');
      grant usage on schema auth to authenticated;
      grant select, insert, update, delete on all tables in schema public to authenticated;
      grant execute on all functions in schema public to authenticated;
      grant select on all tables in schema auth to authenticated;`);
    const count = async (uid: string, table: string) => {
      await pg.exec(`set role authenticated; set app.uid = '${uid}';`);
      const r = await pg.query<{ n: number }>(`select count(*)::int as n from ${table}`);
      await pg.exec(`reset role`);
      return r.rows[0]!.n;
    };
    expect(await count(U1, "game_sessions")).toBe(1);
    expect(await count(U2, "game_sessions")).toBe(0);
    expect(await count(U2, "game_events")).toBe(0);
    expect(await count(U2, "players")).toBe(0);
    expect(await count(U2, "games")).toBe(1); // catalog is public
    // U2 cannot write events into U1's session, and nobody can delete audit events.
    await pg.exec(`set role authenticated; set app.uid = '${U2}';`);
    await expect(pg.exec(`insert into game_events (session_id, seq, type) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',2,'action')`)).rejects.toThrow();
    await pg.exec(`reset role; set role authenticated; set app.uid = '${U1}';`);
    await pg.exec(`delete from game_events`);
    await pg.exec(`reset role`);
    expect((await pg.query<{ n: number }>(`select count(*)::int as n from game_events`)).rows[0]!.n).toBe(1); // no delete policy => 0 rows deleted
  });
});
