import Link from "next/link";
import { getAllTeams } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const teamsList = await getAllTeams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-gray-400 mt-1">All teams in Division 309</p>
      </div>

      {teamsList.length === 0 ? (
        <p className="text-gray-400">
          No team data yet.{" "}
          <Link href="/admin" className="text-blue-400 underline">
            Sync data
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamsList.map((t) => (
            <Link
              key={t.id}
              href={`/teams/${t.id}`}
              className={`bg-gray-900 border rounded-lg p-6 hover:border-gray-600 transition-colors ${
                t.isMine ? "border-blue-800" : "border-gray-800"
              }`}
            >
              <p className="font-semibold text-lg">{t.name}</p>
              <p className="text-sm text-gray-400 mt-1">#{t.number}</p>
              {t.isMine && (
                <span className="inline-block mt-2 text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                  My Team
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
