/**
 * Phase 10 card penalty values, kept in one dedicated module.
 * Source: secondary summaries of the Mattel rules (see rules.ts for verification status).
 *   Cards 1–9 = 5 points each, cards 10–12 = 10 points each, Skip = 15, Wild = 25.
 */
export const CARD_POINTS = {
  low: 5, // number cards 1–9
  high: 10, // number cards 10–12
  skip: 15,
  wild: 25,
} as const;

export type CardKind = keyof typeof CARD_POINTS;
export type HandCounts = Partial<Record<CardKind, number>>;

/** Penalty points for the cards left in a hand. Counts must be non-negative integers. */
export function scoreHand(counts: HandCounts): number {
  let total = 0;
  for (const kind of Object.keys(CARD_POINTS) as CardKind[]) {
    const n = counts[kind] ?? 0;
    if (!Number.isInteger(n) || n < 0) throw new RangeError(`Invalid count for ${kind}: ${n}`);
    total += n * CARD_POINTS[kind];
  }
  return total;
}

/** Every legal hand total is a multiple of 5 because every card value is. */
export const POINT_STEP = 5;
export const WARN_ABOVE = 250;
export const HARD_MAX = 600;
