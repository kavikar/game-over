"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw, Trophy, Undo2 } from "lucide-react";
import type { Session } from "@/engine/types";
import { Button, Eyebrow, PageShell, PlayerToken, StatusPill } from "@/components/ui";
import { duration } from "@/lib/format";
import { viewSession } from "@/lib/session-view";
import { useStore } from "@/store/store";
import { AuditLog } from "./audit-log";
import { HistoryTable } from "./history-table";

export function ResultsView({ session }: { session: Session }) {
  const { store } = useStore();
  const router = useRouter();
  const v = viewSession(session)!;
  const cancelled = session.status === "cancelled";
  const winners = session.players.filter((p) => v.outcome.winnerIds.includes(p.id));
  const rematch = () => {
    const r = store.createSession(session.gameId, session.players, session.config);
    if (r.ok) router.push(`/session/${r.value.id}`);
  };
  const manual = session.events.find((e) => e.type === "complete")?.note === "Ended manually";

  return (
    <PageShell>
      <Link href="/history" className="text-sm font-semibold text-clay-ink underline underline-offset-4">← History</Link>
      <div className="felt mt-4 rounded-[10px] p-6 text-ivory sm:p-10">
        <div className="flex items-center justify-between"><Eyebrow className="text-brass">{v.mod.meta.name} · final result</Eyebrow><StatusPill status={session.status} /></div>
        {cancelled ? (
          <h1 className="display mt-3 text-5xl">Cancelled.</h1>
        ) : (
          <>
            <div className="mt-3 flex items-center gap-3"><Trophy aria-hidden className="text-brass" size={34} /><h1 className="display text-5xl sm:text-6xl">{winners.length ? winners.map((w) => w.name).join(" & ") : "No winner"}</h1></div>
            <p className="mt-2 text-lg text-ivory/85">{manual ? "Game ended manually. Ranking reflects the scores at that point." : v.outcome.reason}</p>
            {v.outcome.tiebreak && <p className="mt-1 text-sm text-brass">Tiebreak: {v.outcome.tiebreak}</p>}
            <p className="num mt-3 text-sm text-ivory/65">{session.completedAt ? `Played ${duration(session.createdAt, session.completedAt)} · ` : ""}{new Date(session.completedAt ?? session.updatedAt).toLocaleDateString(undefined, { dateStyle: "long" })} · rules {session.rulesVersion}</p>
          </>
        )}
      </div>

      <section className="mt-10" aria-labelledby="rank">
        <h2 id="rank" className="display text-3xl">Final standings</h2>
        <ol className="mt-3 divide-y divide-line border-y border-line">
          {v.standings.map((s) => {
            const p = session.players.find((x) => x.id === s.playerId)!;
            return (
              <li key={s.playerId} className="flex items-center gap-4 py-3">
                <span className="num display w-8 text-3xl text-clay-ink">{s.rank}</span>
                <PlayerToken id={p.id} name={p.name} size={44} />
                <div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{p.name}</p>{s.detail && <p className="text-sm text-moss-ink">{s.detail}</p>}</div>
                <p className="num text-4xl font-extrabold">{s.display}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-10" aria-labelledby="breakdown">
        <h2 id="breakdown" className="display text-3xl">{v.mod.meta.id === "ticket-to-ride" ? "Score breakdown" : "Round by round"}</h2>
        <div className="mt-3"><HistoryTable data={v.mod.history(v.state)} /></div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        {!cancelled && <Button size="lg" onClick={rematch}><RotateCcw size={18} aria-hidden /> Play again, same players</Button>}
        {!cancelled && <Button size="lg" variant="outline" onClick={() => store.command(session.id, { kind: "undo" })}><Undo2 size={18} aria-hidden /> Undo last entry &amp; reopen</Button>}
      </div>
      <div className="mt-8"><AuditLog session={session} /></div>
    </PageShell>
  );
}
