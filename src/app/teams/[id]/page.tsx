import Link from "next/link";
import { getTeamDetail } from "@/lib/stats";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const team = await getTeamDetail(parseInt(id));

  if (!team) return notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/teams"
          className="text-sm text-gray-400 hover:text-white"
        >
          &larr; All Teams
        </Link>
        <h1 className="text-2xl font-bold mt-2">{team.name}</h1>
        <p className="text-gray-400">
          #{team.number} &middot; {team.totalTeamMatches} team matches played
        </p>
        {team.isMine && (
          <span className="inline-block mt-2 text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
            My Team
          </span>
        )}
      </div>

      {/* Roster */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Roster</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-800">
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-center">SL</th>
                <th className="px-4 py-3 text-center">Matches</th>
                <th className="px-4 py-3 text-center">W-L</th>
                <th className="px-4 py-3 text-center">Win%</th>
                <th className="px-4 py-3 text-center">PPI</th>
                <th className="px-4 py-3 text-center">Total Pts</th>
              </tr>
            </thead>
            <tbody>
              {team.roster.map((p) => (
                <tr
                  key={p.playerId}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${p.playerId}`}
                      className="hover:text-blue-400"
                    >
                      {p.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.currentSkillLevel}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.totalMatches}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.wins}-{p.losses}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.winPct}%
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-semibold">
                    {(p.avgPpi ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">
                    {p.totalPoints}
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
