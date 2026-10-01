"use client";

import { SLOTS, type Slot } from "@/lib/gameLogic";
import type { Players } from "@/lib/useRoom";

export default function PlayerChips({
  players,
  active,
  onName,
  onActivate,
}: {
  players: Players;
  active: Slot | null;
  onName?: (slot: Slot, name: string) => void;
  onActivate?: (slot: Slot) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {SLOTS.map((slot) => (
        <div
          key={slot}
          className={`rounded-lg border-2 p-3 transition ${
            active === slot ? "border-amber-400 bg-amber-400/10" : "border-slate-700 bg-slate-900"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-black text-amber-300">{slot}</span>
            {active === slot && <span className="text-[10px] font-bold uppercase text-amber-400">turn</span>}
          </div>
          <input
            value={players[slot]}
            onChange={(e) => onName?.(slot, e.target.value)}
            placeholder="player name"
            className="w-full rounded bg-slate-800 px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={() => onActivate?.(slot)}
            className="mt-2 w-full rounded bg-slate-700 py-1 text-xs font-bold uppercase text-white hover:bg-slate-600"
          >
            Give turn
          </button>
        </div>
      ))}
    </div>
  );
}
