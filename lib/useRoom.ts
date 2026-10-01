"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase, ROOM } from "./supabaseClient";
import { buildSettle, buildSpinPath, cellAt, isWhammy, SLOTS, type Slot, type Step } from "./gameLogic";

export type Players = Record<Slot, string>;
export type Phase = "idle" | "spinning" | "settling" | "result";

export type RoomState = {
  prizes: string[];
  players: Players;
  active: Slot | null;
  round: number;
  lit: number | null;
  phase: Phase;
  result: { cell: number; prize: string; whammy: boolean } | null;
};

export const EMPTY_PLAYERS: Players = { P1: "", P2: "", P3: "" };

const INITIAL: RoomState = {
  prizes: [],
  players: EMPTY_PLAYERS,
  active: null,
  round: 1,
  lit: null,
  phase: "idle",
  result: null,
};

/** Broadcast payloads are untyped JSON by nature; each handler picks the fields it needs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Payload = Record<string, any>;

/**
 * Subscribes to the room channel and replays the spin locally from the broadcast
 * seed (see the sync note at the top of gameLogic.ts). Everything a page needs:
 * state to render, `send` to broadcast, `currentStep` so the stopping player can
 * tell everyone else exactly where the ring was.
 */
export function useRoom(onEvent?: (event: string, payload: Payload) => void) {
  const [state, setState] = useState<RoomState>(INITIAL);
  const [connected, setConnected] = useState(false);
  const channel = useRef<RealtimeChannel | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spin = useRef<{ seed: number; path: Step[]; step: number } | null>(null);
  const prizes = useRef<string[]>([]);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  const stopTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const land = useCallback((cell: number) => {
    const prize = prizes.current[cell] ?? "";
    setState((s) => ({ ...s, lit: cell, phase: "result", result: { cell, prize, whammy: isWhammy(prize) } }));
  }, []);

  /** Decelerating tail after the stop press, then land. */
  const runSettle = useCallback(
    (steps: Step[], i: number) => {
      const step = steps[i];
      timer.current = setTimeout(() => {
        setState((s) => ({ ...s, lit: step.cell }));
        if (i + 1 < steps.length) runSettle(steps, i + 1);
        else land(step.cell);
      }, step.delay);
    },
    [land],
  );

  const tick = useCallback(() => {
    const sp = spin.current;
    if (!sp) return;
    const { cell, delay } = sp.path[sp.step % sp.path.length];
    setState((s) => ({ ...s, lit: cell }));
    sp.step += 1;
    timer.current = setTimeout(tick, delay);
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    const ch = supabase.channel(ROOM, { config: { broadcast: { self: true } } });
    channel.current = ch;

    const on = (event: string, fn: (p: Payload) => void) =>
      ch.on("broadcast", { event }, ({ payload }) => {
        fn(payload ?? {});
        handler.current?.(event, payload ?? {});
      });

    on("BOARD_UPDATE", (p) => {
      prizes.current = p.prizes ?? [];
      setState((s) => ({ ...s, prizes: p.prizes ?? [] }));
    });

    on("TURN_CHANGE", (p) => {
      setState((s) => ({
        ...s,
        players: p.players ?? s.players,
        active: p.active ?? null,
        round: p.round ?? s.round,
        // a new turn clears last round's result off the board
        phase: "idle",
        result: null,
        lit: null,
      }));
      stopTimer();
      spin.current = null;
    });

    on("SPIN_START", (p) => {
      stopTimer();
      spin.current = { seed: p.seed, path: buildSpinPath(p.seed), step: 0 };
      setState((s) => ({ ...s, phase: "spinning", result: null }));
      tick();
    });

    on("SPIN_STOP", (p) => {
      const sp = spin.current;
      if (!sp || sp.seed !== p.seed) return;
      stopTimer();
      // the stopping player's step wins, so every client settles from the same place
      sp.step = p.step;
      const from = cellAt(sp.path, p.step);
      setState((s) => ({ ...s, lit: from, phase: "settling" }));
      runSettle(buildSettle(p.seed, p.step, from), 0);
    });

    ch.subscribe((status) => {
      setConnected(status === "SUBSCRIBED");
      // late joiner (OBS reloaded the board mid-game) asks admin to re-push state
      if (status === "SUBSCRIBED") ch.send({ type: "broadcast", event: "HELLO", payload: {} });
    });

    return () => {
      stopTimer();
      supabase.removeChannel(ch);
    };
  }, [tick, runSettle]);

  const send = useCallback((event: string, payload: Payload = {}) => {
    channel.current?.send({ type: "broadcast", event, payload });
  }, []);

  return {
    state,
    connected,
    send,
    /**
     * The step whose cell is lit right now — what the stopping player broadcasts.
     * tick() increments past the step it just drew, so step back one; otherwise the
     * board would snap to a different cell the instant Space is pressed.
     */
    currentStep: () => Math.max(0, (spin.current?.step ?? 0) - 1),
    currentSeed: () => spin.current?.seed ?? 0,
  };
}

export { SLOTS };
export type { Slot };
