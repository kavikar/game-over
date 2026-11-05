"use client";

import Link from "next/link";
import { ArrowRight, Play, Plus } from "lucide-react";
import "@/games";
import { listGames } from "@/engine/registry";
import { computeStats, MIN_SAMPLE } from "@/engine/stats";
import { GameCover } from "@/components/cover";
import { Button, Eyebrow, PageShell, PlayerToken } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { viewSession } from "@/lib/session-view";
import { useStore } from "@/store/store";

export function HomeView() {
  const { data, hydrated } = useStore();
  const games = listGames();
  const active = data.sessions.filter((s) => s.status === "active" || s.status === "paused");
  const done = data.sessions.filter((s) => s.status === "completed");
  const lead = active[0];
  const leadView = lead ? viewSession(lead) : null;
  const usual = [...new Set([...data.favorites, ...data.recent])].map((id) => games.find((g) => g.meta.id === id)).filter(Boolean) as typeof games;
  const rail = usual.length ? usual : games.filter((g) => g.meta.featured);
  const stats = computeStats(data.sessions);
  const leaders = [...stats.values()].filter((s) => s.winRate !== null).sort((a, b) => b.winRate! - a.winRate!).slice(0, 3);

  return (
    <PageShell>
      <section className="grid items-end gap-8 md:grid-cols-[1.25fr_1fr] md:gap-12">
        <div className="rise">
          <Eyebrow>Tabletop scorekeeper</Eyebrow>
          <h1 className="display mt-3 text-[2.9rem] leading-[0.98] text-forest sm:text-6xl">
            Put the pencil down.
            <br />
            <span className="text-clay-ink">Keep playing.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-charcoal/80">
            Pick a game, seat your players and let the rules do the arithmetic. Every game keeps its own scoring, so a Phase 10 hand never gets scored like a poker pot.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/games"><Button size="lg" className="gap-3">Start a new game <ArrowRight size={18} aria-hidden /></Button></Link>
            <Link href="/rules"><Button size="lg" variant="outline">Read the rules</Button></Link>
          </div>
        </div>

        <div className="felt rise rounded-[10px] p-5 text-ivory shadow-[0_18px_40px_-24px_rgba(24,44,37,0.9)] sm:p-7" aria-label="Game on the table">
          {lead && leadView ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-brass">{lead.status === "paused" ? "Paused" : "On the table"}</p>
                  <h2 className="display mt-1 text-3xl">{leadView.mod.meta.name}</h2>
                  <p className="text-sm text-ivory/70">{leadView.mod.progressLabel(leadView.state)} · started {timeAgo(lead.createdAt)}</p>
                </div>
                <Link href={`/session/${lead.id}`} aria-label={`Resume ${leadView.mod.meta.name}`}>
                  <Button variant="clay" className="gap-2"><Play size={16} aria-hidden /> Resume</Button>
                </Link>
              </div>
              <ol className="mt-5 divide-y divide-ivory/15 border-y border-ivory/15">
                {leadView.standings.slice(0, 4).map((s) => {
                  const p = lead.players.find((x) => x.id === s.playerId)!;
                  return (
                    <li key={s.playerId} className="flex items-center gap-3 py-2.5">
                      <PlayerToken id={p.id} name={p.name} size={32} />
                      <span className="flex-1 truncate font-semibold">{p.name}</span>
                      <span className="text-xs text-ivory/60">{s.detail}</span>
                      <span className="num w-16 text-right text-3xl font-extrabold">{s.display}</span>
                    </li>
                  );
                })}
              </ol>
              {active.length > 1 && <p className="mt-3 text-sm text-ivory/70">+ {active.length - 1} more unfinished — see History.</p>}
            </>
          ) : (
            <>
              <p className="eyebrow text-brass">The table is empty</p>
              <h2 className="display mt-1 text-3xl">Deal the first hand.</h2>
              <p className="mt-2 text-ivory/75">Games in progress stay here until you finish them, even if you close the tab.</p>
              <div className="mt-5 grid grid-cols-5 gap-2" aria-hidden>
                {games.map((g) => (
                  <GameCover key={g.meta.id} meta={g.meta} className="aspect-[3/4] w-full rounded-[4px]" />
                ))}
              </div>
              <Link href="/games" className="mt-5 inline-block"><Button variant="clay" className="gap-2"><Plus size={16} aria-hidden /> Choose a game</Button></Link>
            </>
          )}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="usual">
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>{usual.length ? "Your usuals" : "Featured"}</Eyebrow>
            <h2 id="usual" className="display mt-1 text-3xl">{usual.length ? "Back to the table" : "Start with one of these"}</h2>
          </div>
          <Link href="/games" className="text-sm font-semibold text-clay-ink underline underline-offset-4">All games</Link>
        </div>
        <div className="rail mt-5">
          {rail.map((g, i) => (
            <Link key={g.meta.id} href={`/games/${g.meta.id}`} className={`group block ${i === 0 ? "w-44 sm:w-56" : "w-36 sm:w-44"}`}>
              <GameCover meta={g.meta} className="aspect-[3/4] w-full rounded-[4px] shadow-[0_10px_24px_-16px_rgba(36,37,34,0.8)] transition-transform group-hover:-translate-y-1" />
              <p className="mt-2 font-bold">{g.meta.name}</p>
              <p className="text-sm text-moss-ink">{g.meta.minPlayers}–{g.meta.maxPlayers} players · {g.meta.duration[0]}–{g.meta.duration[1]} min</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-14 grid gap-12 md:grid-cols-2">
        <section aria-labelledby="players">
          <Eyebrow>Saved players</Eyebrow>
          <h2 id="players" className="display mt-1 text-3xl">Who is playing?</h2>
          {hydrated && data.players.length === 0 ? (
            <p className="mt-3 max-w-sm text-charcoal/75">No one saved yet. Add your regulars once and seat them in two taps. Guests can join any game without being saved.</p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-3">
              {data.players.slice(0, 10).map((p) => (
                <li key={p.id} className="flex items-center gap-2 border border-line bg-ivory py-1 pl-1 pr-3">
                  <PlayerToken id={p.id} name={p.name} size={30} />
                  <span className="text-sm font-semibold">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/players" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-clay-ink underline underline-offset-4">Manage players <ArrowRight size={14} aria-hidden /></Link>
        </section>

        <section aria-labelledby="results">
          <Eyebrow>Game history</Eyebrow>
          <h2 id="results" className="display mt-1 text-3xl">Recent results</h2>
          {done.length === 0 ? (
            <p className="mt-3 max-w-sm text-charcoal/75">Finished games appear here with final scores and a round-by-round record.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {done.slice(0, 5).map((s) => {
                const v = viewSession(s);
                if (!v) return null;
                const w = s.players.filter((p) => v.outcome.winnerIds.includes(p.id)).map((p) => p.name).join(" & ");
                return (
                  <li key={s.id}>
                    <Link href={`/session/${s.id}`} className="flex items-baseline justify-between gap-3 py-3 hover:bg-parchment/60">
                      <span><span className="font-bold">{v.mod.meta.name}</span> <span className="text-moss-ink">· won by {w || "—"}</span></span>
                      <span className="text-sm text-moss-ink">{timeAgo(s.completedAt ?? s.updatedAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-5">
            <Eyebrow>Table talk</Eyebrow>
            {leaders.length ? (
              <ul className="mt-2 space-y-1">
                {leaders.map((l, i) => {
                  const p = data.sessions.flatMap((s) => s.players).find((x) => x.id === l.playerId);
                  return <li key={l.playerId} className="text-sm"><span className="num font-extrabold">{i + 1}.</span> {p?.name} — {Math.round(l.winRate! * 100)}% wins <span className="text-moss-ink">({l.wins} of {l.gamesPlayed})</span></li>;
                })}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-charcoal/75">Win rates appear after a player has finished {MIN_SAMPLE} games. Fewer than that would be misleading.</p>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
