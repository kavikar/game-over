/**
 * UNO hand values (classic deck). Source: secondary summaries of Mattel's instruction sheet.
 * Number cards = face value, Draw Two / Reverse / Skip = 20, Wild / Wild Draw Four = 50.
 * Special-edition cards (e.g. Wild Shuffle) are NOT modelled: enter their points via the manual total.
 */
export const UNO_VALUES = { action: 20, wild: 50 } as const;

export interface UnoHand {
  /** Sum of the faces of number cards (0–9). */
  numberSum?: number;
  actions?: number;
  wilds?: number;
}

export function scoreUnoHand(h: UnoHand): number {
  const n = h.numberSum ?? 0, a = h.actions ?? 0, w = h.wilds ?? 0;
  for (const v of [n, a, w]) if (!Number.isInteger(v) || v < 0) throw new RangeError("Counts must be non-negative integers");
  return n + a * UNO_VALUES.action + w * UNO_VALUES.wild;
}
