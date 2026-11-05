import type { ZodType } from "zod";

/** A participant in one session. Players need no account; `id` is stable per saved/guest player. */
export interface PlayerRef {
  id: string;
  name: string;
}

export type RuleStatus = "official" | "interpretation" | "house" | "unverified";

/** How well the rules in a module have been checked against a publisher source. */
export type Verification = "verified" | "partial" | "unverified";

export interface RulesSource {
  publisher: string;
  edition: string;
  sourceUrl: string;
  sourceType: "publisher" | "secondary" | "community";
  /** ISO date the source was last checked, or null if never reached directly. */
  lastVerified: string | null;
  verification: Verification;
  note?: string;
}

export interface RulesSection {
  heading: string;
  body: string[];
  status: RuleStatus;
}

export interface RulesDoc {
  rulesVersion: string;
  sources: RulesSource[];
  objective: string;
  players: string;
  components: string[];
  sections: RulesSection[];
  faq: { q: string; a: string; status: RuleStatus }[];
  editions: { id: string; name: string; note: string }[];
  houseRules: { id: string; name: string; description: string }[];
}

export type GameCategory =
  | "Card Games"
  | "Board Games"
  | "Strategy Games"
  | "Party Games"
  | "Family Games"
  | "Poker and Casino-style Games";

export interface GameMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  categories: GameCategory[];
  minPlayers: number;
  maxPlayers: number;
  /** Estimated minutes. */
  duration: [number, number];
  scoringType: string;
  editions: string[];
  /** Original placeholder cover palette (no publisher artwork is used). */
  cover: { bg: string; fg: string; accent: string; motif: "phases" | "cards" | "routes" | "pile" | "chips" };
  featured?: boolean;
}

export interface SetupField {
  key: string;
  label: string;
  type: "select" | "number" | "toggle" | "money" | "percents";
  group: "variant" | "house" | "session";
  status: RuleStatus;
  help?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface Standing {
  playerId: string;
  rank: number;
  /** Numeric value used for statistics (score, net winnings, lives...). */
  value: number;
  display: string;
  detail?: string;
  eliminated?: boolean;
}

export interface Outcome {
  finished: boolean;
  winnerIds: string[];
  /** Human-readable winning condition that applied (or what is still needed). */
  reason: string;
  tiebreak?: string;
}

export interface Issue {
  path?: string;
  message: string;
  /** `warning` issues can be overridden by the user; `error` cannot. */
  severity?: "error" | "warning";
}

/** A line of round / turn history for display. */
export interface HistoryRow {
  label: string;
  cells: Record<string, string>;
}

/**
 * Contract every game implements. Pure TypeScript: no React, no I/O, no clocks, no randomness.
 * All scoring is deterministic: same players + config + actions => same state.
 */
export interface GameModule<C = unknown, S = unknown, A = unknown> {
  meta: GameMeta;
  rulesVersion: string;
  rules: RulesDoc;

  configSchema: ZodType<C>;
  defaultConfig(playerCount: number): C;
  setupFields(config: C): SetupField[];
  validateSetup(players: PlayerRef[], config: C): Issue[];

  init(players: PlayerRef[], config: C): S;

  actionSchema: ZodType<A>;
  validate(state: S, action: A): Issue[];
  reduce(state: S, action: A): S;

  standings(state: S): Standing[];
  outcome(state: S): Outcome;
  /** Short status line, e.g. "Round 4". */
  progressLabel(state: S): string;
  history(state: S): { columns: { id: string; label: string }[]; rows: HistoryRow[] };
  describeAction(state: S, action: A): string;
}

export type AnyGameModule = GameModule<any, any, any>;

export type SessionStatus = "active" | "paused" | "completed" | "cancelled";

export type SessionEventType =
  | "created"
  | "action"
  | "correct"
  | "undo"
  | "pause"
  | "resume"
  | "complete"
  | "reopen"
  | "cancel";

export interface SessionEvent {
  id: string;
  seq: number;
  type: SessionEventType;
  at: string;
  /** Idempotency key for `action` events. */
  actionId?: string;
  /** For `correct` / `undo`: the action event being changed. */
  targetId?: string;
  action?: unknown;
  note?: string;
}

export interface Session {
  id: string;
  gameId: string;
  rulesVersion: string;
  config: unknown;
  players: PlayerRef[];
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  events: SessionEvent[];
  /** Future multiplayer: short join code and owner. */
  joinCode?: string;
  ownerId?: string;
}

export type Result<T> = { ok: true; value: T; duplicate?: boolean } | { ok: false; issues: Issue[] };
