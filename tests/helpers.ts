import type { Clock } from "@/engine/session";
let n = 0;
export const testClock = (): Clock => ({
  now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, n++)).toISOString(),
  id: () => `id${++n}`,
});
export const P = (...names: string[]) => names.map((name) => ({ id: name.toLowerCase(), name }));
