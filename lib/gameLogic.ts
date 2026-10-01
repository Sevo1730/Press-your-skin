/**
 * Pure game logic. No React, no Supabase — safe to unit test with `npm run test:logic`.
 *
 * SYNC MODEL (the choice the brief asked us to make & explain):
 * The spin is recomputed deterministically from a shared seed on every client
 * rather than the admin broadcasting one message per lit cell. Steps land every
 * 45-110ms, i.e. ~9-22 msgs/sec, which runs straight into Supabase Realtime's
 * default 10 msg/sec client rate limit and would desync under any packet loss.
 * With a seed, a whole spin costs exactly 2 broadcasts: SPIN_START {seed} and
 * SPIN_STOP {seed, step}. Every client builds the identical path/settle from the
 * seed, and the stopping player's `step` is the single source of truth for where
 * the ring was when Space was hit — so /board and /play always land on one cell.
 */

export const CELL_COUNT = 18;

/** Ring layout on a 6-col x 5-row grid: 6 top, 3 right, 6 bottom (R->L), 3 left (B->T). */
export const CELL_GRID: { row: number; col: number }[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ row: 1, col: 1 + i })), // 0-5   top, L->R
  ...Array.from({ length: 3 }, (_, i) => ({ row: 2 + i, col: 6 })), // 6-8   right, T->B
  ...Array.from({ length: 6 }, (_, i) => ({ row: 5, col: 6 - i })), // 9-14  bottom, R->L
  ...Array.from({ length: 3 }, (_, i) => ({ row: 4 - i, col: 1 })), // 15-17 left, B->T
];

export const PALETTE = ["purple", "gold", "teal"] as const;
export type Palette = (typeof PALETTE)[number];

export type Step = { cell: number; delay: number };

/** Decelerating tail so the landing has suspense instead of frame-perfect timing. */
const SETTLE_DELAYS = [90, 130, 180, 230, 280];

const SPIN_MIN_DELAY = 45;
const SPIN_MAX_DELAY = 110;

/** mulberry32 — tiny deterministic PRNG so every client replays the same spin. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random cell that is never the one we're already on. */
function jump(next: () => number, from: number) {
  const n = Math.floor(next() * (CELL_COUNT - 1));
  return n >= from ? n + 1 : n;
}

/**
 * Randomized jump path — deliberately NOT sequential around the ring, so the lit
 * cell appears to leap across the board like the real show.
 * Long enough that a slow round just wraps (`path[step % path.length]`).
 */
export function buildSpinPath(seed: number, length = 600): Step[] {
  const next = rng(seed);
  const path: Step[] = [];
  let cell = Math.floor(next() * CELL_COUNT);
  for (let i = 0; i < length; i++) {
    path.push({
      cell,
      delay: SPIN_MIN_DELAY + Math.floor(next() * (SPIN_MAX_DELAY - SPIN_MIN_DELAY)),
    });
    cell = jump(next, cell);
  }
  return path;
}

export function cellAt(path: Step[], step: number) {
  return path[step % path.length].cell;
}

/**
 * 2-4 extra jumps after the stop press, decelerating. Seeded off (seed, step) so
 * every client derives the same tail and therefore the same landing cell.
 */
export function buildSettle(seed: number, step: number, fromCell: number): Step[] {
  const next = rng(seed ^ (step * 0x9e3779b1));
  const count = 2 + Math.floor(next() * 3); // 2..4
  const steps: Step[] = [];
  let cell = fromCell;
  for (let i = 0; i < count; i++) {
    cell = jump(next, cell);
    steps.push({ cell, delay: SETTLE_DELAYS[i] });
  }
  return steps;
}

export function isWhammy(prize: string | undefined) {
  return (prize ?? "").trim().toUpperCase() === "WHAMMY";
}

export function paletteFor(index: number): Palette {
  return PALETTE[index % PALETTE.length];
}

/** Little emoji marker per cell — purely decorative, no character art. */
const ICONS = ["💰", "⭐", "🎁", "💎", "🎺", "🏆"];
export function iconFor(index: number, prize: string | undefined) {
  return isWhammy(prize) ? "💀" : ICONS[index % ICONS.length];
}

export const SLOTS = ["P1", "P2", "P3"] as const;
export type Slot = (typeof SLOTS)[number];
