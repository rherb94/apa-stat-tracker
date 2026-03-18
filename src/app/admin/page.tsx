"use client";

import { useState, useEffect } from "react";

interface SyncResult {
  totalMatches: number;
  processedMatches: number;
  newRecords: number;
  errors: string[];
}

export default function AdminPage() {
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenStatus, setTokenStatus] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [savingToken, setSavingToken] = useState(false);

  useEffect(() => {
    fetch("/api/token")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasToken) setTokenPreview(data.preview);
      })
      .catch(() => {});
  }, []);

  async function handleSaveToken() {
    if (!tokenInput.trim()) return;
    setSavingToken(true);
    setTokenStatus(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenStatus(`Error: ${data.error}`);
      } else {
        setTokenStatus("Token saved successfully");
        setTokenPreview(tokenInput.trim().substring(0, 20) + "...");
        setTokenInput("");
      }
    } catch (err) {
      setTokenStatus(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingToken(false);
    }
  }

  async function handleReset() {
    if (!confirm("This will delete ALL match data. Are you sure?")) return;
    setResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResetMessage(`Error: ${data.error}`);
      } else {
        setResetMessage("All data cleared. Run a sync to repopulate.");
        setResult(null);
      }
    } catch (err) {
      setResetMessage(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

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

        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={syncing || resetting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {syncing ? "Syncing..." : "Sync Now"}
          </button>
          <button
            onClick={handleReset}
            disabled={syncing || resetting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {resetting ? "Resetting..." : "Reset Data"}
          </button>
        </div>

        {resetMessage && (
          <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-200 text-sm">{resetMessage}</p>
          </div>
        )}

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

      {/* Token Section */}
      <section className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">APA Token</h2>
          <p className="text-sm text-gray-400 mt-1">
            Paste your APA session token here. Get it from poolplayers.com
            DevTools &rarr; Network &rarr; any GraphQL request &rarr; Authorization header.
          </p>
        </div>

        {tokenPreview && (
          <p className="text-sm text-gray-400">
            Current token: <code className="bg-gray-800 px-1 rounded">{tokenPreview}</code>
          </p>
        )}

        <div className="flex gap-3">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Bearer eyJ... or just the JWT"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-600"
          />
          <button
            onClick={handleSaveToken}
            disabled={savingToken || !tokenInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 disabled:text-gray-400 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            {savingToken ? "Saving..." : "Save Token"}
          </button>
        </div>

        {tokenStatus && (
          <p className={`text-sm ${tokenStatus.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {tokenStatus}
          </p>
        )}</section>

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
