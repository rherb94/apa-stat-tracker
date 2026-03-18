import Link from "next/link";
import { getPlayerDetailWithWindows } from "@/lib/stats";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayerDetailWithWindows(parseInt(id));

  if (!player) return notFound();

  const trendIcon =
    player.trend === "hot" ? "^" : player.trend === "cold" ? "v" : "~";
  const trendColor =
    player.trend === "hot"
      ? "text-green-400"
      : player.trend === "cold"
        ? "text-red-400"
        : "text-gray-400";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/players"
          className="text-sm text-gray-400 hover:text-white"
        >
          &larr; All Players
        </Link>
        <h1 className="text-2xl font-bold mt-2">{player.displayName}</h1>
        <p className="text-gray-400">Skill Level {player.currentSkillLevel}</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Record", value: `${player.wins}-${player.losses}` },
          { label: "Win %", value: `${player.winPct}%` },
          { label: "Avg PA", value: player.avgPA.toFixed(3) },
          {
            label: "Recent PA",
            value: player.recentPA.toFixed(3),
            extra: (
              <span className={`ml-1 ${trendColor}`}>{trendIcon}</span>
            ),
          },
          { label: "Matches", value: player.totalMatches.toString() },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-900 border border-gray-800 rounded-lg p-4"
          >
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className="text-2xl font-mono font-semibold mt-1">
              {stat.value}
              {stat.extra}
            </p>
          </div>
        ))}
      </div>

      {/* Trend indicator */}
      {player.trend !== "stable" && (
        <div
          className={`text-sm px-3 py-2 rounded-lg inline-block ${
            player.trend === "hot"
              ? "bg-green-900/30 text-green-300 border border-green-800"
              : "bg-red-900/30 text-red-300 border border-red-800"
          }`}
        >
          {player.trend === "hot"
            ? "On a hot streak - PA trending up over last 5 matches"
            : "Cooling off - PA trending down over last 5 matches"}
        </div>
      )}

      {/* Window Stats */}
      {player.windowStats && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Performance Windows</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Last 5", stats: player.windowStats.l5 },
              { label: "Last 10", stats: player.windowStats.l10 },
              { label: "Last 20", stats: player.windowStats.l20 },
              { label: "All Time", stats: player.windowStats.allTime },
            ].map((w) => (
              <div
                key={w.label}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4"
              >
                <p className="text-sm text-gray-400 mb-2">{w.label}</p>
                <p className="text-xl font-mono font-semibold">
                  {w.stats.pa.toFixed(3)}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {w.stats.wins}-{w.stats.losses} ({w.stats.matches} matches)
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Best 10 of 20 PA: <span className="font-mono">{player.windowStats.best10of20PA.toFixed(3)}</span>
          </p>
        </section>
      )}

      {/* Match History */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Match History</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">SL</th>
                <th className="px-4 py-3">Opponent</th>
                <th className="px-4 py-3 text-center">Opp SL</th>
                <th className="px-4 py-3 text-center">Points</th>
                <th className="px-4 py-3 text-center">Opp Pts</th>
                <th className="px-4 py-3 text-center">Innings</th>
                <th className="px-4 py-3 text-center">Def</th>
                <th className="px-4 py-3 text-center">Pts Needed</th>
                <th className="px-4 py-3 text-center">PA</th>
              </tr>
            </thead>
            <tbody>
              {player.history.map((m) => (
                <tr
                  key={m.matchId}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3 text-sm">
                    {m.matchDate
                      ? new Date(m.matchDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`font-mono font-semibold ${
                        m.winLoss === "W" ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {m.winLoss}
                    </span>
                  </td>
                  <td className="px-4 py-3">{m.skillLevel}</td>
                  <td className="px-4 py-3 text-sm">{m.opponentName || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {m.opponentSkillLevel || "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{m.points}</td>
                  <td className="px-4 py-3 text-center font-mono">
                    {m.opponentPoints ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{m.innings}</td>
                  <td className="px-4 py-3 text-center font-mono">
                    {m.defensiveShots}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {m.pointsNeeded}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold">
                    {m.pa.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
