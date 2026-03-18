"use client";

import { useState } from "react";

interface SyncResult {
  totalMatches: number;
  processedMatches: number;
  newRecords: number;
  errors: string[];
}

export default function AdminPage() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sync failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-gray-400 mt-1">
          Manage data sync and configuration
        </p>
      </div>

      {/* Sync Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Data Sync</h2>
          <p className="text-sm text-gray-400 mt-1">
            Pull latest match data from the APA API for all teams in Division
            309. Only new matches will be fetched.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>

        {result && (
          <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 text-sm space-y-1">
            <p className="text-green-200 font-medium">Sync complete</p>
            <p className="text-green-300">
              {result.totalMatches} total matches in division
            </p>
            <p className="text-green-300">
              {result.processedMatches} new matches processed
            </p>
            <p className="text-green-300">
              {result.newRecords} player records inserted
            </p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-yellow-300">
                  {result.errors.length} errors:
                </p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-yellow-400 text-xs ml-2">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
      </section>

      {/* Token Info */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">APA Token</h2>
          <p className="text-sm text-gray-400 mt-1">
            The APA session token is read from the <code className="bg-gray-800 px-1 rounded">APA_TOKEN</code>{" "}
            environment variable. To update it:
          </p>
        </div>
        <ol className="text-sm text-gray-300 list-decimal list-inside space-y-2">
          <li>Log in to poolplayers.com in your browser</li>
          <li>Open DevTools &rarr; Network tab</li>
          <li>Find any GraphQL request and copy the Authorization header</li>
          <li>
            Update the <code className="bg-gray-800 px-1 rounded">APA_TOKEN</code> env var in Vercel (or{" "}
            <code className="bg-gray-800 px-1 rounded">.env.local</code> for local dev)
          </li>
        </ol>
      </section>

      {/* Setup Info */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Environment Variables</h2>
          <p className="text-sm text-gray-400 mt-1">
            Required environment variables for the app:
          </p>
        </div>
        <div className="text-sm font-mono space-y-1">
          <p className="text-gray-300">
            <span className="text-blue-400">DATABASE_URL</span> - Neon/Vercel Postgres connection string
          </p>
          <p className="text-gray-300">
            <span className="text-blue-400">APA_TOKEN</span> - Bearer token from poolplayers.com
          </p>
          <p className="text-gray-300">
            <span className="text-blue-400">APA_DIVISION_ID</span> - Division ID (default: 395493)
          </p>
          <p className="text-gray-300">
            <span className="text-blue-400">APA_LEAGUE_ID</span> - League ID (default: 319)
          </p>
        </div>
      </section>
    </div>
  );
}
