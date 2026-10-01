"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Board from "@/components/Board";
import CenterCamera from "@/components/CenterCamera";
import PlayerChips from "@/components/PlayerChips";
import PrizeEditor from "@/components/PrizeEditor";
import { CELL_COUNT, type Slot } from "@/lib/gameLogic";
import { EMPTY_PLAYERS, useRoom, type Payload, type Players } from "@/lib/useRoom";

const DEFAULT_PRIZES = [
  "100 PTS", "WHAMMY", "VOD PICK", "250 PTS", "EMOTE", "WHAMMY",
  "500 PTS", "SHOUTOUT", "150 PTS", "WHAMMY", "MOD FOR A DAY", "75 PTS",
  "SONG REQ", "WHAMMY", "300 PTS", "CO-OP GAME", "50 PTS", "WHAMMY",
].join("\n");

export default function AdminPage() {
  const [prizeText, setPrizeText] = useState(DEFAULT_PRIZES);
  const [players, setPlayers] = useState<Players>(EMPTY_PLAYERS);
  const [active, setActive] = useState<Slot | null>(null);
  const [round, setRound] = useState(1);

  // late-joining clients (OBS reload) send HELLO; re-push whatever we currently hold
  const latest = useRef({ prizeText, players, active, round });
  latest.current = { prizeText, players, active, round };

  const sendRef = useRef<(event: string, payload?: Payload) => void>(() => {});
  const { state, connected, send, currentSeed, currentStep } = useRoom(
    useCallback((event: string) => {
      if (event !== "HELLO") return;
      const l = latest.current;
      sendRef.current("BOARD_UPDATE", { prizes: toPrizes(l.prizeText) });
      sendRef.current("TURN_CHANGE", { players: l.players, active: l.active, round: l.round });
    }, []),
  );
  sendRef.current = send;

  // keep the prize list across admin refreshes so nobody retypes 18 lines mid-stream
  useEffect(() => {
    const saved = localStorage.getItem("pyl-prizes");
    if (saved) setPrizeText(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("pyl-prizes", prizeText);
  }, [prizeText]);

  const pushBoard = () => send("BOARD_UPDATE", { prizes: toPrizes(prizeText) });
  const pushTurn = (next: Partial<{ players: Players; active: Slot | null; round: number }> = {}) =>
    send("TURN_CHANGE", { players, active, round, ...next });

  const spinning = state.phase === "spinning" || state.phase === "settling";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-4">
        <h1 className="text-2xl font-black text-amber-300">Admin</h1>
        <span className={`text-xs ${connected ? "text-emerald-400" : "text-red-400"}`}>
          {connected ? "connected" : "offline"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-400">Round</span>
          <span className="rounded bg-slate-800 px-3 py-1 font-black text-amber-300">{round}</span>
          <button
            onClick={() => {
              const next = round + 1;
              setRound(next);
              setActive(null);
              pushTurn({ round: next, active: null });
            }}
            className="rounded bg-slate-700 px-3 py-1 text-xs font-bold uppercase hover:bg-slate-600"
          >
            Next round
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Prizes</h2>
          <PrizeEditor text={prizeText} onChange={setPrizeText} onPush={pushBoard} />

          <h2 className="pt-2 text-sm font-bold uppercase tracking-widest text-slate-400">Players</h2>
          <PlayerChips
            players={players}
            active={active}
            onName={(slot, name) => {
              const next = { ...players, [slot]: name };
              setPlayers(next);
              pushTurn({ players: next });
            }}
            onActivate={(slot) => {
              setActive(slot);
              pushTurn({ active: slot });
            }}
          />

          <div className="flex gap-2">
            <button
              onClick={() => send("SPIN_START", { seed: Math.floor(Math.random() * 2 ** 31) })}
              disabled={!active || spinning}
              className="flex-1 rounded-lg bg-emerald-500 py-4 text-lg font-black uppercase text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start spin
            </button>
            <button
              onClick={() => send("SPIN_STOP", { seed: currentSeed(), step: currentStep() })}
              disabled={state.phase !== "spinning"}
              className="rounded-lg bg-slate-700 px-4 text-xs font-bold uppercase hover:bg-slate-600 disabled:opacity-40"
              title="If the player goes AFK"
            >
              Force
              <br />
              stop
            </button>
          </div>
          {!active && <p className="text-xs text-amber-400">Give a player the turn before starting a spin.</p>}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Board preview</h2>
          <Board state={state}>
            <CenterCamera state={state} />
          </Board>
          <p className="text-xs text-slate-500">
            OBS source: <code className="text-slate-300">/board</code> (add <code>?transparent=1</code> to key out the
            background)
          </p>
        </section>
      </div>
    </main>
  );
}

/** 18 lines exactly — pad short lists, ignore extras. */
function toPrizes(text: string) {
  const lines = text.split("\n").map((l) => l.trim());
  return Array.from({ length: CELL_COUNT }, (_, i) => lines[i] ?? "");
}
