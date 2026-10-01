"use client";

import { useEffect } from "react";
import Board from "@/components/Board";
import CenterCamera from "@/components/CenterCamera";
import { useRoom } from "@/lib/useRoom";

/** OBS browser source. No auth — it only ever listens. Add ?transparent=1 for a keyed background. */
export default function BoardPage() {
  const { state, connected } = useRoom();

  useEffect(() => {
    // ponytail: read the query off window instead of useSearchParams, which would
    // force this whole page into a Suspense boundary for one boolean.
    if (new URLSearchParams(window.location.search).has("transparent")) {
      document.documentElement.classList.add("obs");
    }
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <Board state={state}>
          <CenterCamera state={state} />
        </Board>
      </div>
      {!connected && (
        <div className="fixed bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-amber-400">connecting…</div>
      )}
    </main>
  );
}
