import type { Slot } from "./gameLogic";

export type TokenEntry = { slot: Slot; round: number; user: string };

// ponytail: plain in-memory Map — v1 state is ephemeral by design and a round
// lasts minutes. Survives dev HMR via globalThis. It does NOT survive a server
// restart or multiple serverless instances, so run `next start` on one node
// (Railway/Fly/a VPS) rather than a scale-to-many platform. Swap in Redis or a
// Supabase table only when you actually need more than one instance.
const g = globalThis as typeof globalThis & { __pylTokens?: Map<string, TokenEntry> };
const store: Map<string, TokenEntry> = (g.__pylTokens ??= new Map());

export const tokens = {
  set: (token: string, entry: TokenEntry) => store.set(token, entry),
  get: (token: string) => store.get(token),
  clearRound: (round: number) => {
    store.forEach((e, t) => { if (e.round !== round) store.delete(t); });
  },
};
