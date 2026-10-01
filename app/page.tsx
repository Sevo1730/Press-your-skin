import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-md space-y-3 p-10">
      <h1 className="text-3xl font-black text-amber-300">Press Your Luck — Stream</h1>
      <ul className="space-y-1 text-blue-300 underline">
        <li><Link href="/admin">/admin — streamer panel</Link></li>
        <li><Link href="/board">/board — OBS browser source</Link></li>
      </ul>
      <p className="text-sm text-slate-400">Player links come from the Discord bot (<code>!pick</code>).</p>
    </main>
  );
}
