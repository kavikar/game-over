import type { AnyGameModule, Issue, PlayerRef, Result, Session, SessionEvent } from "./types";

export interface Clock {
  now(): string;
  id(): string;
}

export interface LiveAction {
  eventId: string;
  actionId?: string;
  action: unknown;
  corrected: boolean;
}

function fail<T>(message: string, severity: Issue["severity"] = "error"): Result<T> {
  return { ok: false, issues: [{ message, severity }] };
}

function nextSeq(s: Session): number {
  return s.events.length + 1;
}

function ev(s: Session, clock: Clock, e: Partial<SessionEvent> & Pick<SessionEvent, "type">): SessionEvent {
  return { id: clock.id(), seq: nextSeq(s), at: clock.now(), ...e };
}

export function createSession(
  mod: AnyGameModule,
  input: { players: PlayerRef[]; config: unknown },
  clock: Clock,
): Result<Session> {
  const cfg = mod.configSchema.safeParse(input.config);
  if (!cfg.success) return { ok: false, issues: cfg.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
  const ids = new Set(input.players.map((p) => p.id));
  if (ids.size !== input.players.length) return fail("Each player can only join once.");
  const { minPlayers, maxPlayers } = mod.meta;
  if (input.players.length < minPlayers || input.players.length > maxPlayers)
    return fail(`${mod.meta.name} needs ${minPlayers}–${maxPlayers} players.`);
  const setup = mod.validateSetup(input.players, cfg.data);
  if (setup.some((i) => i.severity !== "warning")) return { ok: false, issues: setup };
  const now = clock.now();
  const session: Session = {
    id: clock.id(),
    gameId: mod.meta.id,
    rulesVersion: mod.rulesVersion,
    config: cfg.data,
    players: input.players,
    status: "active",
    createdAt: now,
    updatedAt: now,
    events: [],
  };
  session.events.push(ev(session, clock, { type: "created" }));
  return { ok: true, value: session };
}

/** Fold the event log into the ordered list of live actions (after undos and corrections). */
export function liveActions(session: Session): LiveAction[] {
  const live: LiveAction[] = [];
  for (const e of session.events) {
    if (e.type === "action") live.push({ eventId: e.id, actionId: e.actionId, action: e.action, corrected: false });
    else if (e.type === "correct") {
      const t = live.find((l) => l.eventId === e.targetId);
      if (t) {
        t.action = e.action;
        t.corrected = true;
      }
    } else if (e.type === "undo") {
      const i = live.findIndex((l) => l.eventId === e.targetId);
      if (i >= 0) live.splice(i, 1);
    }
  }
  return live;
}

export interface Replay<S = unknown> {
  state: S;
  /** First action that failed validation during replay (should never happen for stored sessions). */
  error?: Issue[];
}

export function replay(mod: AnyGameModule, session: Session, actions = liveActions(session)): Replay {
  let state = mod.init(session.players, session.config);
  for (const l of actions) {
    const parsed = mod.actionSchema.safeParse(l.action);
    if (!parsed.success) return { state, error: [{ message: "Stored action is invalid." }] };
    const issues = mod.validate(state, parsed.data).filter((i) => i.severity !== "warning");
    if (issues.length) return { state, error: issues };
    state = mod.reduce(state, parsed.data);
  }
  return { state };
}

export type Command =
  | { kind: "submit"; actionId: string; action: unknown; acknowledgeWarnings?: boolean }
  | { kind: "correct"; eventId: string; action: unknown; note?: string; acknowledgeWarnings?: boolean }
  | { kind: "undo" }
  | { kind: "pause" }
  | { kind: "resume" }
  | { kind: "end"; note?: string }
  | { kind: "cancel" };

function withStatus(mod: AnyGameModule, s: Session, clock: Clock): Session {
  // Recompute completion from the derived outcome after any state-changing event.
  const { state, error } = replay(mod, s);
  if (error) return s;
  const out = mod.outcome(state);
  if (out.finished && s.status === "active") {
    const t = clock.now();
    const next = { ...s, status: "completed" as const, completedAt: t, updatedAt: t };
    return { ...next, events: [...next.events, ev(next, clock, { type: "complete", note: out.reason })] };
  }
  if (!out.finished && s.status === "completed") {
    const next = { ...s, status: "active" as const, completedAt: undefined };
    return { ...next, events: [...next.events, ev(next, clock, { type: "reopen" })] };
  }
  return s;
}

/** Apply a user command. Pure: returns a new Session or the reasons it was refused. */
export function dispatch(mod: AnyGameModule, session: Session, cmd: Command, clock: Clock): Result<Session> {
  if (session.status === "cancelled") return fail("This session was cancelled.");
  const touch = (s: Session): Session => ({ ...s, updatedAt: clock.now() });

  switch (cmd.kind) {
    case "submit": {
      if (session.status !== "active") return fail(`Session is ${session.status}.`);
      if (session.events.some((e) => e.actionId === cmd.actionId)) return { ok: true, value: session, duplicate: true };
      const parsed = mod.actionSchema.safeParse(cmd.action);
      if (!parsed.success)
        return { ok: false, issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
      const { state, error } = replay(mod, session);
      if (error) return { ok: false, issues: error };
      const issues = mod.validate(state, parsed.data);
      const blocking = issues.filter((i) => i.severity !== "warning");
      if (blocking.length) return { ok: false, issues };
      if (issues.length && !cmd.acknowledgeWarnings) return { ok: false, issues };
      const next = touch({ ...session, events: [...session.events] });
      next.events.push(ev(next, clock, { type: "action", actionId: cmd.actionId, action: parsed.data }));
      return { ok: true, value: withStatus(mod, next, clock) };
    }
    case "correct": {
      const live = liveActions(session);
      const idx = live.findIndex((l) => l.eventId === cmd.eventId);
      if (idx < 0) return fail("That entry no longer exists.");
      const parsed = mod.actionSchema.safeParse(cmd.action);
      if (!parsed.success)
        return { ok: false, issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
      const candidate = live.map((l, i) => (i === idx ? { ...l, action: parsed.data } : l));
      // Replay the entire game: a correction must keep every later entry valid.
      const r = replay(mod, session, candidate);
      if (r.error) return { ok: false, issues: r.error };
      const next = touch({ ...session, events: [...session.events] });
      next.events.push(ev(next, clock, { type: "correct", targetId: cmd.eventId, action: parsed.data, note: cmd.note }));
      return { ok: true, value: withStatus(mod, next, clock) };
    }
    case "undo": {
      const live = liveActions(session);
      const last = live[live.length - 1];
      if (!last) return fail("Nothing to undo.");
      const next = touch({ ...session, events: [...session.events] });
      next.events.push(ev(next, clock, { type: "undo", targetId: last.eventId }));
      return { ok: true, value: withStatus(mod, next, clock) };
    }
    case "pause":
    case "resume": {
      const want = cmd.kind === "pause" ? "active" : "paused";
      if (session.status !== want) return fail(`Cannot ${cmd.kind} a ${session.status} session.`);
      const next = touch({ ...session, status: cmd.kind === "pause" ? "paused" : "active", events: [...session.events] });
      next.events.push(ev(next, clock, { type: cmd.kind }));
      return { ok: true, value: next };
    }
    case "end": {
      if (session.status === "completed") return fail("Session is already completed.");
      const t = clock.now();
      const next: Session = { ...session, status: "completed", completedAt: t, updatedAt: t, events: [...session.events] };
      next.events.push(ev(next, clock, { type: "complete", note: cmd.note ?? "Ended manually" }));
      return { ok: true, value: next };
    }
    case "cancel": {
      const next = touch({ ...session, status: "cancelled", events: [...session.events] });
      next.events.push(ev(next, clock, { type: "cancel" }));
      return { ok: true, value: next };
    }
  }
}
