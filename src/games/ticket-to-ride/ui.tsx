"use client";

import { useState } from "react";
import type { EntryProps, GameUI } from "@/components/play/game-ui";
import { Stepper } from "@/components/play/stepper";
import { Button, PlayerToken } from "@/components/ui";
import type { TtrAction, TtrEntry, TtrState } from "./module";
import { EDITIONS, scoreEntry } from "./scoring";

const blank = (playerId: string): TtrEntry => ({ playerId, routes: {}, ticketsCompleted: 0, ticketsFailed: 0, ticketCount: 0, stationsUnused: 0, longestPath: false });

function Form({ state, players, initial, validate, onSubmit, submitLabel }: EntryProps) {
  const s = state as TtrState;
  const ed = EDITIONS[s.config.edition];
  const init = initial as TtrAction | undefined;
  const [entries, setEntries] = useState<Record<string, TtrEntry>>(() => Object.fromEntries(players.map((p) => [p.id, init?.entries.find((e) => e.playerId === p.id) ?? blank(p.id)])));
  const [issues, setIssues] = useState<{ message: string; severity?: "error" | "warning" }[]>([]);
  const patch = (id: string, p: Partial<TtrEntry>) => setEntries((e) => ({ ...e, [id]: { ...e[id]!, ...p } }));
  const draft: TtrAction = { type: "final", entries: players.map((p) => entries[p.id]!) };
  const live = validate(draft);
  const blocking = live.filter((i) => i.severity !== "warning");
  const warn = [...live, ...issues].filter((i) => i.severity === "warning");

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); const r = onSubmit(draft, warn.length > 0); if (r) setIssues(r); }}>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <p className="text-sm text-moss-ink">{ed.name}: enter what each player claimed. Route points are calculated from the table; you only count routes.</p>
        {players.map((p) => {
          const e = entries[p.id]!;
          const total = (() => { try { return scoreEntry(s.config.edition, e).total; } catch { return null; } })();
          return (
            <section key={p.id} className="mt-5 border-t-2 border-charcoal pt-3" aria-label={`${p.name} scoring`}>
              <div className="flex items-center gap-3"><PlayerToken id={p.id} name={p.name} size={36} /><h3 className="flex-1 text-lg font-bold">{p.name}</h3><p className="num text-3xl font-extrabold" aria-live="polite">{total ?? "–"}</p></div>
              <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
                <div>
                  <p className="eyebrow text-moss-ink">Routes claimed</p>
                  {Object.entries(ed.routeTable).map(([len, pts]) => (
                    <div key={len} className="flex items-center justify-between py-1">
                      <span className="num text-sm">Length {len} <span className="text-moss-ink">({pts} pts)</span></span>
                      <Stepper label={`${p.name} length ${len} routes`} value={e.routes[len] ?? 0} max={40} onChange={(n) => patch(p.id, { routes: { ...e.routes, [len]: n } })} />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="eyebrow text-moss-ink">Tickets &amp; bonuses</p>
                  <Row label="Tickets completed (pts)"><Stepper label={`${p.name} completed ticket points`} value={e.ticketsCompleted} max={300} onChange={(n) => patch(p.id, { ticketsCompleted: n })} /></Row>
                  <Row label="Tickets failed (pts lost)"><Stepper label={`${p.name} failed ticket points`} value={e.ticketsFailed} max={300} onChange={(n) => patch(p.id, { ticketsFailed: n })} /></Row>
                  <Row label="Tickets completed (count)"><Stepper label={`${p.name} completed ticket count`} value={e.ticketCount} max={40} onChange={(n) => patch(p.id, { ticketCount: n })} /></Row>
                  {ed.stations !== null && <Row label={`Unused stations (${ed.stations} pts)`}><Stepper label={`${p.name} unused stations`} value={e.stationsUnused} max={3} onChange={(n) => patch(p.id, { stationsUnused: n })} /></Row>}
                  <label className="flex min-h-11 items-center justify-between gap-3 py-1 text-sm"><span>Longest continuous path (+{ed.longestBonus})</span><input type="checkbox" className="h-6 w-6 accent-[#203B32]" checked={e.longestPath} onChange={(ev) => patch(p.id, { longestPath: ev.target.checked })} /></label>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <div className="safe-b border-t border-line px-4 pt-3 sm:px-6">
        {[...blocking, ...issues.filter((i) => i.severity !== "warning")].map((i, k) => <p key={k} role="alert" className="mb-1 text-sm font-semibold text-clay-ink">{i.message}</p>)}
        {warn.map((i, k) => <p key={k} className="mb-1 text-sm font-semibold">⚠ {i.message}</p>)}
        <Button type="submit" size="lg" className="mb-1 w-full" disabled={blocking.length > 0}>{warn.length ? "Confirm anyway" : submitLabel}</Button>
      </div>
    </form>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-2 py-1"><span className="text-sm">{label}</span>{children}</div>;
}

export const ttrUI: GameUI = { entry: { kind: "sheet", label: "Enter final scoring", Form, correctable: true } };
