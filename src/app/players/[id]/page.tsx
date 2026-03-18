import Link from "next/link";
import { getPlayerDetail } from "@/lib/stats";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayerDetail(parseInt(id));

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
          { label: "Avg PPI", value: player.avgPointsPerInning.toFixed(2) },
          {
            label: "Recent PPI",
            value: player.recentPpi.toFixed(2),
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
            ? "On a hot streak - PPI trending up over last 5 matches"
            : "Cooling off - PPI trending down over last 5 matches"}
        </div>
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
                <th className="px-4 py-3 text-center">PPI</th>
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
                  <td className="px-4 py-3 text-center font-mono font-semibold">
                    {m.pointsPerInning.toFixed(2)}
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
