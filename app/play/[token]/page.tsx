"use client";

import { useCallback, useEffect, useState } from "react";
import { isWhammy, type Slot } from "@/lib/gameLogic";
import { useRoom } from "@/lib/useRoom";

type Auth = { slot: Slot; round: number; user: string } | { error: string } | null;

export default function PlayPage({ params }: { params: { token: string } }) {
  const [auth, setAuth] = useState<Auth>(null);
  const { state, connected, send, currentSeed, currentStep } = useRoom();

  useEffect(() => {
    fetch(`/api/tokens?token=${encodeURIComponent(params.token)}`)
      .then((r) => r.json())
      .then(setAuth)
      .catch(() => setAuth({ error: "could not reach the server" }));
  }, [params.token]);

  const slot = auth && "slot" in auth ? auth.slot : null;
  const myTurn = !!slot && state.active === slot;
  const canStop = myTurn && state.phase === "spinning";

  const stop = useCallback(() => {
    if (!canStop) return;
    // broadcast the step we're on — every client settles from there, so we all land together
    send("SPIN_STOP", { seed: currentSeed(), step: currentStep() });
  }, [canStop, send, currentSeed, currentStep]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop]);

  if (!auth) return <Center>Checking your link…</Center>;
  if ("error" in auth)
    return <Center>Invalid or expired link. Ask the streamer to send a new one with <code>!pick</code>.</Center>;

  const result = state.result;

  return (
    <main className="flex min-h-screen select-none flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-sm uppercase tracking-[.3em] text-amber-300">
        {auth.slot} · {auth.user || "player"} · round {state.round}
      </div>

      {result && myTurn ? (
        <div className="space-y-2">
          {result.whammy || isWhammy(result.prize) ? (
            <div className="animate-whammy text-6xl font-black text-red-400">WHAMMY!</div>
          ) : (
            <>
              <div className="text-sm uppercase tracking-widest text-slate-400">You won</div>
              <div className="text-5xl font-black text-amber-300">{result.prize || "—"}</div>
            </>
          )}
        </div>
      ) : (
        <button
          onClick={stop}
          disabled={!canStop}
          className={`h-64 w-full max-w-md rounded-3xl border-4 text-3xl font-black uppercase leading-tight transition active:scale-95 ${
            canStop
              ? "animate-pulse border-amber-200 bg-gradient-to-b from-red-500 to-red-800 text-white shadow-[0_0_50px_rgba(239,68,68,.6)]"
              : "border-slate-700 bg-slate-900 text-slate-600"
          }`}
        >
          {canStop ? (
            <>
              Press space
              <br />
              to stop
              <span className="mt-3 block text-sm font-bold normal-case tracking-normal opacity-80">
                (or tap this button)
              </span>
            </>
          ) : !myTurn ? (
            "Wait for your turn"
          ) : state.phase === "settling" ? (
            "Landing…"
          ) : (
            "Get ready…"
          )}
        </button>
      )}

      <div className={`text-xs ${connected ? "text-slate-500" : "text-red-400"}`}>
        {connected ? "connected" : "reconnecting…"}
      </div>
    </main>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center p-8 text-center text-slate-300">{children}</main>;
}
