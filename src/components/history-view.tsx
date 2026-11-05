"use client";

import Link from "next/link";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Empty, Eyebrow, PageShell, StatusPill } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { viewSession } from "@/lib/session-view";
import { useStore } from "@/store/store";

export function HistoryView() {
  const { data, store, hydrated } = useStore();
  const [tab, setTab] = useState<"open" | "done">("open");
  const open = data.sessions.filter((s) => s.status === "active" || s.status === "paused");
  const done = data.sessions.filter((s) => s.status === "completed" || s.status === "cancelled");
  const list = tab === "open" ? open : done;

  return (
    <PageShell className="max-w-4xl">
      <Eyebrow>Saved on this device</Eyebrow>
      <h1 className="display mt-2 text-5xl text-forest sm:text-6xl">Game history.</h1>
      <div role="tablist" aria-label="Sessions" className="mt-6 flex gap-6 border-b border-line">
        {([["open", `In progress (${open.length})`], ["done", `Finished (${done.length})`]] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-11 border-b-4 pb-1 font-bold ${tab === k ? "border-terracotta" : "border-transparent text-charcoal/60"}`}>{l}</button>
        ))}
      </div>
      {hydrated && list.length === 0 ? (
        <div className="mt-8"><Empty title={tab === "open" ? "Nothing in progress." : "No finished games yet."} body={tab === "open" ? "Games you start stay here until you finish them." : "Finish a game and it will be kept here with every round."} action={<Link href="/games"><Button>Start a game</Button></Link>} /></div>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {list.map((s) => {
            const v = viewSession(s);
            if (!v) return <li key={s.id} className="py-4 text-moss-ink">Unknown game “{s.gameId}” (module not installed)</li>;
            const winners = s.players.filter((p) => v.outcome.winnerIds.includes(p.id)).map((p) => p.name).join(" & ");
            return (
              <li key={s.id} className="flex items-center gap-2">
                <Link href={`/session/${s.id}`} className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4 hover:bg-parchment/60">
                  <span>
                    <span className="display text-2xl">{v.mod.meta.name}</span>{" "}
                    <StatusPill status={s.status} />
                    <span className="mt-1 block text-sm text-moss-ink">{s.players.map((p) => p.name).join(", ")}</span>
                  </span>
                  <span className="text-right text-sm text-moss-ink">
                    {s.status === "completed" ? <strong className="text-charcoal">{winners ? `Won by ${winners}` : "Ended"}</strong> : s.status === "cancelled" ? "" : v.mod.progressLabel(v.state)}
                    <span className="block">{timeAgo(s.updatedAt)}</span>
                  </span>
                </Link>
                <button aria-label={`Delete ${v.mod.meta.name} session`} onClick={() => { if (confirm("Delete this session and its history permanently?")) store.deleteSession(s.id); }} className="grid h-11 w-11 place-items-center hover:bg-parchment"><Trash2 size={18} aria-hidden /></button>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
