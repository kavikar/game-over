"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, Pause, Play, RotateCcw, Square, Undo2 } from "lucide-react";
import "@/games";
import { gameUIs } from "@/games/ui";
import { liveActions } from "@/engine/session";
import type { Issue, Result, Session } from "@/engine/types";
import { Button, Empty, PageShell, StatusPill } from "@/components/ui";
import { stateBefore, viewSession } from "@/lib/session-view";
import { useStore } from "@/store/store";
import { AuditLog } from "./audit-log";
import { GenericBoard } from "./generic-board";
import { HistoryTable } from "./history-table";
import { Sheet } from "./sheet";
import { ResultsView } from "./results-view";

export function SessionPage() {
  const { sid } = useParams<{ sid: string }>();
  const { data, store, hydrated } = useStore();
  const session = data.sessions.find((s) => s.id === sid);
  if (!hydrated) return <PageShell><p className="text-moss-ink">Loading your game…</p></PageShell>;
  if (!session) return <PageShell><Empty title="Game not found." body="This session is not on this device. Finished and unfinished games are saved in this browser." action={<Link href="/history"><Button>Go to history</Button></Link>} /></PageShell>;
  if (session.status === "completed" || session.status === "cancelled") return <ResultsView session={session} />;
  return <PlayView session={session} />;
}

function PlayView({ session }: { session: Session }) {
  const { store } = useStore();
  const router = useRouter();
  const view = viewSession(session)!;
  const ui = gameUIs[session.gameId];
  const { mod, state, standings } = view;
  const [open, setOpen] = useState(false);
  const [correcting, setCorrecting] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<null | "end" | "cancel">(null);
  const [error, setError] = useState<string | null>(null);
  const actionId = useRef(crypto.randomUUID());
  const live = liveActions(session);
  const paused = session.status === "paused";
  const Board = ui?.Board ?? GenericBoard;
  const hist = mod.history(state);
  const correctable = ui?.entry.kind === "sheet" && ui.entry.correctable;

  const issuesOf = (r: Result<Session>): Issue[] | null => (r.ok ? null : r.issues);
  const validate = (a: unknown): Issue[] => {
    const p = mod.actionSchema.safeParse(a);
    if (!p.success) return p.error.issues.map((i) => ({ message: i.message }));
    return mod.validate(correcting === null ? state : stateBefore(session, correcting), p.data);
  };
  const submit = (action: unknown, ack: boolean): Issue[] | null => {
    const r = correcting === null
      ? store.command(session.id, { kind: "submit", actionId: actionId.current, action, acknowledgeWarnings: ack })
      : store.command(session.id, { kind: "correct", eventId: live[correcting]!.eventId, action, acknowledgeWarnings: ack });
    const issues = issuesOf(r);
    if (!issues) {
      actionId.current = crypto.randomUUID();
      setOpen(false);
      setCorrecting(null);
    }
    return issues;
  };
  const act = (action: unknown, ack = false) => {
    const r = store.command(session.id, { kind: "submit", actionId: crypto.randomUUID(), action, acknowledgeWarnings: ack });
    setError(r.ok || r.issues.every((i) => i.severity === "warning") ? null : r.issues.map((i) => i.message).join(" "));
    return r;
  };
  const run = (kind: "undo" | "pause" | "resume") => {
    const r = store.command(session.id, { kind });
    setError(r.ok ? null : r.issues[0]!.message);
  };

  const Entry = ui?.entry.kind === "sheet" ? ui.entry : null;
  const Inline = ui?.entry.kind === "inline" ? ui.entry.Panel : null;

  return (
    <div className="felt min-h-dvh text-ivory">
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ivory/80 hover:text-ivory"><ArrowLeft size={16} aria-hidden /> Home</Link>
          <div className="flex items-center gap-1">
            <Button variant="feltBtn" size="sm" onClick={() => run("undo")} disabled={!live.length || paused}><Undo2 size={15} aria-hidden /> Undo</Button>
            <Button variant="feltBtn" size="sm" onClick={() => run(paused ? "resume" : "pause")}>{paused ? <><Play size={15} aria-hidden /> Resume</> : <><Pause size={15} aria-hidden /> Pause</>}</Button>
            <Button variant="feltBtn" size="sm" onClick={() => setConfirm("end")}><Square size={15} aria-hidden /> End</Button>
          </div>
        </div>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-brass">{mod.progressLabel(state)}</p>
            <h1 className="display text-4xl sm:text-5xl">{mod.meta.name}</h1>
          </div>
          <div className="text-right"><StatusPill status={session.status} /><p className="mt-1 max-w-xs text-sm text-ivory/70">{view.outcome.reason}</p></div>
        </header>

        {paused && <p role="status" className="mt-4 border border-brass bg-brass/15 px-3 py-2 font-semibold">Game paused. Resume to keep scoring.</p>}
        {view.error && <p role="alert" className="mt-4 border border-terracotta px-3 py-2 font-semibold">This saved game no longer replays cleanly (rules changed?). Review the history before continuing.</p>}
        {error && <p role="alert" className="mt-4 border border-terracotta bg-terracotta/15 px-3 py-2 font-semibold">{error}</p>}

        <section className="mt-5" aria-label="Scoreboard"><Board state={state} standings={standings} players={session.players} /></section>

        {Inline && <section className="mt-6" aria-label="Controls"><Inline state={state} players={session.players} session={session} act={act} disabled={paused} /></section>}

        <section className="mt-8" aria-labelledby="hist">
          <h2 id="hist" className="display text-3xl">History</h2>
          <div className="mt-2"><HistoryTable data={hist} dark onCorrect={correctable && !paused ? (i) => { setCorrecting(i); setOpen(true); } : undefined} /></div>
          {correctable && <p className="mt-2 text-sm text-ivory/65">Corrections replay every later entry and are kept in the audit trail.</p>}
        </section>
        <div className="mt-6 rounded-[4px] bg-ivory px-4 text-charcoal"><AuditLog session={session} /></div>
      </div>

      {Entry && (
        <div className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-ivory/20 bg-forest-deep/95 px-4 pt-3">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <p className="hidden text-sm text-ivory/70 sm:block">{standings[0] ? `Leading: ${session.players.find((p) => p.id === standings[0]!.playerId)?.name}` : ""}</p>
            <Button variant="clay" size="lg" className="w-full sm:w-auto" disabled={paused} onClick={() => { setCorrecting(null); setOpen(true); }}>{Entry.label}</Button>
          </div>
        </div>
      )}

      {Entry && (
        <Sheet open={open} onClose={() => { setOpen(false); setCorrecting(null); }} title={correcting === null ? `${Entry.label} · ${mod.progressLabel(state)}` : `Correct ${hist.rows[correcting]?.label ?? "entry"}`}>
          <Entry.Form
            key={`${correcting}-${live.length}`}
            state={correcting === null ? state : stateBefore(session, correcting)}
            players={session.players}
            initial={correcting === null ? undefined : live[correcting]?.action}
            validate={validate}
            onSubmit={submit}
            submitLabel={correcting === null ? "Add to scoreboard" : "Save correction"}
          />
        </Sheet>
      )}

      <Sheet open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === "end" ? "End this game now?" : "Cancel this game?"}>
        <div className="p-4 text-charcoal sm:p-6">
          <p>{confirm === "end" ? "The game is saved as finished with the scores so far. You can undo the last entry afterwards to reopen it if the rules say it should continue." : "Cancelled games stay in history but do not count toward statistics."}</p>
          <div className="mt-5 flex gap-3">
            <Button variant="outline" onClick={() => setConfirm(null)}>Keep playing</Button>
            <Button variant="clay" onClick={() => { const k = confirm!; setConfirm(null); store.command(session.id, { kind: k === "end" ? "end" : "cancel" }); if (k === "cancel") router.push("/history"); }}>{confirm === "end" ? "End game" : "Cancel game"}</Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
