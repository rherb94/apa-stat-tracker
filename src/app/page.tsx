import Link from "next/link";
import { getPlayerRankings, getAllTeams } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let rankings: Awaited<ReturnType<typeof getPlayerRankings>> = [];
  let teamsList: Awaited<ReturnType<typeof getAllTeams>> = [];
  let dbConnected = true;

  try {
    rankings = await getPlayerRankings();
    teamsList = await getAllTeams();
  } catch {
    dbConnected = false;
  }

  const myTeamPlayers = rankings.filter((r) => r.isMine);
  const topPlayers = rankings.slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Division 309 Dashboard</h1>
        <p className="text-gray-400 mt-1">
          APA Maryland & E West Virginia - 9-Ball
        </p>
      </div>

      {!dbConnected && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <p className="text-yellow-200">
            Database not connected. Set up your <code className="bg-gray-800 px-1 rounded">DATABASE_URL</code> in{" "}
            <code className="bg-gray-800 px-1 rounded">.env.local</code> and run migrations, then{" "}
            <Link href="/admin" className="underline">
              sync data
            </Link>{" "}
            from the admin page.
          </p>
        </div>
      )}

      {dbConnected && rankings.length === 0 && (
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <p className="text-blue-200">
            No match data yet.{" "}
            <Link href="/admin" className="underline">
              Sync data
            </Link>{" "}
            from the admin page to get started.
          </p>
        </div>
      )}

      {/* My Team Quick View */}
      {myTeamPlayers.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Towson Cowboys</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {myTeamPlayers.map((p) => (
              <Link
                key={p.playerId}
                href={`/players/${p.playerId}`}
                className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{p.displayName}</p>
                    <p className="text-sm text-gray-400">
                      SL {p.currentSkillLevel}
                    </p>
                  </div>
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded">
                    {p.wins}-{p.losses}
                  </span>
                </div>
                <div className="mt-3 flex gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">PPI</p>
                    <p className="font-mono text-lg">
                      {p.avgPointsPerInning.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Win%</p>
                    <p className="font-mono text-lg">{p.winPct}%</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Matches</p>
                    <p className="font-mono text-lg">{p.totalMatches}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Top 10 Players in Division */}
      {topPlayers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Top Players by PPI</h2>
            <Link
              href="/players"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all players
            </Link>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                  <th className="px-4 py-3 w-10">#</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-center">SL</th>
                  <th className="px-4 py-3 text-center">W-L</th>
                  <th className="px-4 py-3 text-center">Win%</th>
                  <th className="px-4 py-3 text-center">PPI</th>
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((p, i) => (
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
                      {p.teamName}
                    </td>
                    <td className="px-4 py-3 text-center">{p.currentSkillLevel}</td>
                    <td className="px-4 py-3 text-center font-mono">
                      {p.wins}-{p.losses}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{p.winPct}%</td>
                    <td className="px-4 py-3 text-center font-mono font-semibold">
                      {p.avgPointsPerInning.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Teams */}
      {teamsList.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Teams</h2>
            <Link
              href="/teams"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all teams
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamsList.map((t) => (
              <Link
                key={t.id}
                href={`/teams/${t.id}`}
                className={`bg-gray-900 border rounded-lg p-4 hover:border-gray-600 transition-colors ${
                  t.isMine ? "border-blue-800" : "border-gray-800"
                }`}
              >
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-gray-400">#{t.number}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
