import type { ComponentType } from "react";
import type { Issue, PlayerRef, Result, Session, Standing } from "@/engine/types";

export interface BoardProps {
  state: any;
  standings: Standing[];
  players: PlayerRef[];
}

export interface EntryProps {
  state: any;
  players: PlayerRef[];
  /** Existing action when correcting a previous entry. */
  initial?: any;
  validate: (action: unknown) => Issue[];
  /** Submit; `ack` confirms warnings. Resolves with engine issues if refused. */
  onSubmit: (action: unknown, ack: boolean) => Issue[] | null;
  submitLabel: string;
}

export interface InlineProps {
  state: any;
  players: PlayerRef[];
  session: Session;
  /** Fire a single action; returns the engine result. */
  act: (action: unknown, ack?: boolean) => Result<Session>;
  disabled: boolean;
}

/** Everything React-specific a game contributes. The engine never imports this. */
export interface GameUI {
  Board?: ComponentType<BoardProps>;
  entry:
    | { kind: "sheet"; label: string; Form: ComponentType<EntryProps>; correctable: boolean; showProgress?: boolean }
    | { kind: "inline"; Panel: ComponentType<InlineProps> };
}
