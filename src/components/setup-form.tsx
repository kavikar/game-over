"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import "@/games";
import { getGame } from "@/engine/registry";
import type { Issue, PlayerRef, SetupField } from "@/engine/types";
import { Button, Eyebrow, PageShell, PlayerToken } from "@/components/ui";
import { StatusTag } from "@/components/rules-view";
import { cn } from "@/lib/cn";
import { useStore } from "@/store/store";

export function SetupForm(props: { gameId: string }) {
  return (
    <Suspense fallback={<PageShell><p>Loading…</p></PageShell>}>
      <Inner {...props} />
    </Suspense>
  );
}

function Inner({ gameId }: { gameId: string }) {
  const mod = getGame(gameId)!;
  const router = useRouter();
  const params = useSearchParams();
  const { data, store, hydrated } = useStore();
  const m = mod.meta;

  // "Play again" passes the previous roster in the query string.
  const initial = useMemo(() => (params.get("players") ?? "").split(",").filter(Boolean), [params]);
  const [seated, setSeated] = useState<PlayerRef[]>([]);
  const [seeded, setSeeded] = useState(false);
  if (hydrated && !seeded) {
    setSeeded(true);
    const fromPrev = data.players.filter((p) => initial.includes(p.id)).map((p) => ({ id: p.id, name: p.name }));
    if (fromPrev.length) setSeated(initial.map((id) => fromPrev.find((p) => p.id === id)).filter(Boolean) as PlayerRef[]);
  }
  const [config, setConfig] = useState<Record<string, unknown>>(() => mod.defaultConfig(4) as Record<string, unknown>);
  const [guest, setGuest] = useState("");
  const [saveGuest, setSaveGuest] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pct, setPct] = useState("100");

  const fields = mod.setupFields(config);
  const sort = (g: SetupField["group"]) => fields.filter((f) => f.group === g);
  const toggle = (p: { id: string; name: string }) =>
    setSeated((s) => (s.some((x) => x.id === p.id) ? s.filter((x) => x.id !== p.id) : s.length >= m.maxPlayers ? s : [...s, { id: p.id, name: p.name }]));
  const move = (i: number, d: -1 | 1) =>
    setSeated((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j]!, c[i]!];
      return c;
    });
  const addGuest = () => {
    const n = guest.trim().slice(0, 24);
    if (!n || seated.length >= m.maxPlayers) return;
    if (seated.some((p) => p.name.toLowerCase() === n.toLowerCase())) return setIssues([{ message: `${n} is already seated.` }]);
    const existing = data.players.find((p) => p.name.toLowerCase() === n.toLowerCase());
    const saved = existing ?? (saveGuest ? store.addPlayer(n) : null);
    setSeated((s) => [...s, { id: saved?.id ?? `guest-${crypto.randomUUID()}`, name: n }]);
    setGuest("");
    setIssues([]);
  };

  const countOk = seated.length >= m.minPlayers && seated.length <= m.maxPlayers;
  const start = () => {
    const cfg = { ...config };
    if (gameId === "poker" && cfg.mode === "tournament") cfg.payouts = pct.split(",").map((x) => Number(x.trim()));
    const r = store.createSession(gameId, seated, cfg);
    if (!r.ok) return setIssues(r.issues);
    router.push(`/session/${r.value.id}`);
  };

  return (
    <PageShell className="max-w-4xl">
      <Eyebrow>New session · {m.name}</Eyebrow>
      <h1 className="display mt-2 text-5xl text-forest">Set the table.</h1>

      <section className="mt-8" aria-labelledby="who">
        <div className="flex items-end justify-between">
          <h2 id="who" className="display text-3xl">Players</h2>
          <p className={cn("num text-sm font-bold", countOk ? "text-forest" : "text-clay-ink")} aria-live="polite">
            {seated.length} of {m.minPlayers}–{m.maxPlayers}
          </p>
        </div>
        {data.players.length > 0 && (
          <>
            <p className="mt-2 text-sm text-moss-ink">Tap to seat your regulars. The order you pick is the turn order.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.players.map((p) => {
                const on = seated.some((x) => x.id === p.id);
                return (
                  <li key={p.id}>
                    <button onClick={() => toggle(p)} aria-pressed={on} className={cn("flex min-h-11 items-center gap-2 border py-1 pl-1 pr-3 text-left font-semibold", on ? "border-forest bg-forest text-ivory" : "border-charcoal/30 bg-ivory hover:bg-parchment")}>
                      <PlayerToken id={p.id} name={p.name} size={34} /> {p.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <form className="mt-4 flex flex-wrap items-center gap-3" onSubmit={(e) => { e.preventDefault(); addGuest(); }}>
          <label className="flex-1 basis-56">
            <span className="sr-only">Add a player by name</span>
            <input value={guest} onChange={(e) => setGuest(e.target.value)} maxLength={24} placeholder="Add a player by name" className="min-h-11 w-full border-b-2 border-charcoal/70 bg-transparent text-lg outline-none focus:border-terracotta" />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#203B32]" checked={saveGuest} onChange={(e) => setSaveGuest(e.target.checked)} /> Save to my players</label>
          <Button type="submit" variant="outline" disabled={!guest.trim() || seated.length >= m.maxPlayers}><Plus size={16} aria-hidden /> Seat</Button>
        </form>

        <ol className="mt-5 divide-y divide-line border-y border-line" aria-label="Seating order">
          {seated.length === 0 && <li className="py-4 text-moss-ink">No one is seated yet.</li>}
          {seated.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-2">
              <span className="num w-5 text-sm font-bold text-moss-ink">{i + 1}</span>
              <PlayerToken id={p.id} name={p.name} size={34} />
              <span className="flex-1 font-semibold">{p.name}{p.id.startsWith("guest-") && <span className="eyebrow ml-2 text-moss-ink">guest</span>}</span>
              <button aria-label={`Move ${p.name} up`} onClick={() => move(i, -1)} disabled={i === 0} className="grid h-10 w-10 place-items-center hover:bg-parchment disabled:opacity-30"><ArrowUp size={18} aria-hidden /></button>
              <button aria-label={`Move ${p.name} down`} onClick={() => move(i, 1)} disabled={i === seated.length - 1} className="grid h-10 w-10 place-items-center hover:bg-parchment disabled:opacity-30"><ArrowDown size={18} aria-hidden /></button>
              <button aria-label={`Remove ${p.name}`} onClick={() => setSeated((s) => s.filter((x) => x.id !== p.id))} className="grid h-10 w-10 place-items-center hover:bg-parchment"><X size={18} aria-hidden /></button>
            </li>
          ))}
        </ol>
      </section>

      {(["variant", "session", "house"] as const).map((g) =>
        sort(g).length ? (
          <section key={g} className="mt-10" aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="display text-3xl">{g === "variant" ? "Edition & scoring" : g === "house" ? "House rules" : "Session"}</h2>
            <div className="mt-3 divide-y divide-line border-y border-line">
              {sort(g).map((f) => (
                <FieldRow key={f.key} f={f} value={f.type === "percents" ? pct : config[f.key]} onChange={(v) => (f.type === "percents" ? setPct(String(v)) : setConfig((c) => ({ ...c, [f.key]: v })))} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      {issues.length > 0 && (
        <ul role="alert" className="mt-6 border-l-4 border-clay-ink bg-parchment p-3 text-sm font-semibold text-clay-ink">
          {issues.map((i, k) => <li key={k}>{i.message}</li>)}
        </ul>
      )}

      <div className="safe-b sticky bottom-14 z-20 mt-8 flex items-center justify-between gap-3 border-t border-line bg-ivory/95 pt-3 md:bottom-0">
        <p className="text-sm text-moss-ink">{countOk ? "Ready when you are." : `Seat ${m.minPlayers}–${m.maxPlayers} players to begin.`}</p>
        <Button size="lg" disabled={!countOk} onClick={start}>Start game</Button>
      </div>
    </PageShell>
  );
}

function FieldRow({ f, value, onChange }: { f: SetupField; value: unknown; onChange: (v: unknown) => void }) {
  const id = `f-${f.key}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="max-w-md">
        <label htmlFor={id} className="font-bold">{f.label}</label>
        <StatusTag s={f.status} />
        {f.help && <p className="text-sm text-moss-ink">{f.help}</p>}
      </div>
      {f.type === "select" && (
        <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)} className="min-h-11 border border-charcoal/40 bg-ivory px-3 font-semibold">
          {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
      {f.type === "number" && (
        <input id={id} type="number" inputMode="numeric" min={f.min} max={f.max} step={f.step ?? 1} value={Number(value)} onChange={(e) => onChange(Number(e.target.value))} className="num min-h-11 w-28 border border-charcoal/40 bg-ivory px-3 text-right font-bold" />
      )}
      {f.type === "money" && (
        <input id={id} type="number" inputMode="decimal" min={0} step="0.5" value={Number(value) / 100} onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))} className="num min-h-11 w-28 border border-charcoal/40 bg-ivory px-3 text-right font-bold" />
      )}
      {f.type === "percents" && (
        <input id={id} type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} className="num min-h-11 w-36 border border-charcoal/40 bg-ivory px-3 text-right font-bold" />
      )}
      {f.type === "toggle" && (
        <button id={id} role="switch" aria-checked={!!value} onClick={() => onChange(!value)} className={cn("relative h-8 w-14 rounded-full border border-charcoal/40 transition-colors", value ? "bg-forest" : "bg-parchment")}>
          <span className={cn("absolute top-0.5 h-6 w-6 rounded-full bg-ivory shadow transition-all", value ? "left-[1.6rem]" : "left-0.5 bg-charcoal/70")} />
          <span className="sr-only">{value ? "On" : "Off"}</span>
        </button>
      )}
    </div>
  );
}
