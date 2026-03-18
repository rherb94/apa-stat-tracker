import Link from "next/link";
import { getPlayerRankings } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const rankings = await getPlayerRankings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Player Rankings</h1>
        <p className="text-gray-400 mt-1">
          All players in Division 309 ranked by Points Per Inning
        </p>
      </div>

      {rankings.length === 0 ? (
        <p className="text-gray-400">
          No player data yet.{" "}
          <Link href="/admin" className="text-blue-400 underline">
            Sync data
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3 w-10">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3 text-center">SL</th>
                <th className="px-4 py-3 text-center">Matches</th>
                <th className="px-4 py-3 text-center">W-L</th>
                <th className="px-4 py-3 text-center">Win%</th>
                <th className="px-4 py-3 text-center">PPI</th>
                <th className="px-4 py-3 text-center">Total Pts</th>
                <th className="px-4 py-3 text-center">Avg Inn</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((p, i) => (
                <tr
                  key={p.playerId}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/30 ${p.isMine ? "bg-blue-950/20" : ""}`}
                >
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${p.playerId}`}
                      className="hover:text-blue-400"
                    >
                      {p.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {p.teamName ? (
                      <Link
                        href={`/teams/${p.teamId}`}
                        className="hover:text-blue-400"
                      >
                        {p.teamName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{p.currentSkillLevel}</td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.totalMatches}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.wins}-{p.losses}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{p.winPct}%</td>
                  <td className="px-4 py-3 text-center font-mono font-semibold">
                    {p.avgPointsPerInning.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.totalPoints}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.avgInnings}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
