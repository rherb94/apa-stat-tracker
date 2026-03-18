import { db } from "@/db";
import { matchResults, players, teams } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export interface PlayerStats {
  playerId: number;
  playerApaId: number;
  displayName: string;
  currentSkillLevel: number | null;
  teamName: string | null;
  teamId: number | null;
  totalMatches: number;
  wins: number;
  losses: number;
  winPct: number;
  avgPointsPerInning: number;
  totalPoints: number;
  avgInnings: number;
  isMine: boolean;
}

export interface PlayerMatchHistory {
  matchId: number;
  matchDate: Date | null;
  skillLevel: number;
  innings: number;
  defensiveShots: number;
  points: number;
  opponentPoints: number | null;
  winLoss: string;
  opponentName: string | null;
  opponentSkillLevel: number | null;
  pointsPerInning: number;
}

// Get aggregated stats for all players in the division
export async function getPlayerRankings(): Promise<PlayerStats[]> {
  const results = await db
    .select({
      playerId: players.id,
      playerApaId: players.apaId,
      displayName: players.displayName,
      currentSkillLevel: players.currentSkillLevel,
      teamName: teams.name,
      teamId: teams.id,
      isMine: teams.isMine,
      totalMatches: sql<number>`count(${matchResults.id})::int`,
      wins: sql<number>`count(case when ${matchResults.winLoss} = 'W' then 1 end)::int`,
      losses: sql<number>`count(case when ${matchResults.winLoss} = 'L' then 1 end)::int`,
      totalPoints: sql<number>`sum(${matchResults.points})::int`,
      avgInnings: sql<number>`round(avg(${matchResults.innings})::numeric, 1)::float`,
      avgPpi: sql<number>`round(avg(
        case when (${matchResults.innings} - ${matchResults.defensiveShots}) > 0
          then ${matchResults.points}::numeric / (${matchResults.innings} - ${matchResults.defensiveShots})
          else 0
        end
      )::numeric, 2)::float`,
    })
    .from(matchResults)
    .innerJoin(players, eq(matchResults.playerId, players.id))
    .leftJoin(teams, eq(matchResults.teamId, teams.id))
    .groupBy(players.id, players.apaId, players.displayName, players.currentSkillLevel, teams.name, teams.id, teams.isMine)
    .orderBy(desc(sql`avg(
      case when (${matchResults.innings} - ${matchResults.defensiveShots}) > 0
        then ${matchResults.points}::numeric / (${matchResults.innings} - ${matchResults.defensiveShots})
        else 0
      end
    )`));

  return results.map((r) => ({
    playerId: r.playerId,
    playerApaId: r.playerApaId,
    displayName: r.displayName,
    currentSkillLevel: r.currentSkillLevel,
    teamName: r.teamName,
    teamId: r.teamId,
    totalMatches: r.totalMatches,
    wins: r.wins,
    losses: r.losses,
    winPct: r.totalMatches > 0 ? Math.round((r.wins / r.totalMatches) * 100) : 0,
    avgPointsPerInning: r.avgPpi ?? 0,
    totalPoints: r.totalPoints ?? 0,
    avgInnings: r.avgInnings ?? 0,
    isMine: r.isMine ?? false,
  }));
}

// Get match history for a specific player
export async function getPlayerMatchHistory(
  playerId: number
): Promise<PlayerMatchHistory[]> {
  const opponent = db
    .select({
      id: players.id,
      displayName: players.displayName,
    })
    .from(players)
    .as("opponent");

  const results = await db
    .select({
      matchId: matchResults.matchId,
      matchDate: matchResults.matchDate,
      skillLevel: matchResults.skillLevel,
      innings: matchResults.innings,
      defensiveShots: matchResults.defensiveShots,
      points: matchResults.points,
      opponentPoints: matchResults.opponentPoints,
      winLoss: matchResults.winLoss,
      opponentName: opponent.displayName,
      opponentSkillLevel: matchResults.opponentSkillLevel,
    })
    .from(matchResults)
    .leftJoin(opponent, eq(matchResults.opponentId, opponent.id))
    .where(eq(matchResults.playerId, playerId))
    .orderBy(desc(matchResults.matchDate));

  return results.map((r) => ({
    ...r,
    pointsPerInning:
      r.innings - r.defensiveShots > 0
        ? Math.round((r.points / (r.innings - r.defensiveShots)) * 100) / 100
        : 0,
  }));
}

// Get player detail info
export async function getPlayerDetail(playerId: number) {
  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
  });
  if (!player) return null;

  const history = await getPlayerMatchHistory(playerId);

  const totalMatches = history.length;
  const wins = history.filter((h) => h.winLoss === "W").length;
  const avgPpi =
    totalMatches > 0
      ? Math.round(
          (history.reduce((sum, h) => sum + h.pointsPerInning, 0) / totalMatches) * 100
        ) / 100
      : 0;

  // Hot streak: trend over last 5 matches
  const recent = history.slice(0, 5);
  const recentPpi =
    recent.length > 0
      ? recent.reduce((sum, h) => sum + h.pointsPerInning, 0) / recent.length
      : 0;
  const olderPpi =
    totalMatches > 5
      ? history.slice(5).reduce((sum, h) => sum + h.pointsPerInning, 0) /
        (totalMatches - 5)
      : avgPpi;

  let trend: "hot" | "cold" | "stable" = "stable";
  if (recent.length >= 3) {
    if (recentPpi > olderPpi * 1.1) trend = "hot";
    else if (recentPpi < olderPpi * 0.9) trend = "cold";
  }

  return {
    ...player,
    totalMatches,
    wins,
    losses: totalMatches - wins,
    winPct: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
    avgPointsPerInning: avgPpi,
    recentPpi: Math.round(recentPpi * 100) / 100,
    trend,
    history,
  };
}

// Get team info with roster stats
export async function getTeamDetail(teamId: number) {
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
  });
  if (!team) return null;

  // Get all players who have played for this team
  const rosterStats = await db
    .select({
      playerId: players.id,
      playerApaId: players.apaId,
      displayName: players.displayName,
      currentSkillLevel: players.currentSkillLevel,
      totalMatches: sql<number>`count(${matchResults.id})::int`,
      wins: sql<number>`count(case when ${matchResults.winLoss} = 'W' then 1 end)::int`,
      totalPoints: sql<number>`sum(${matchResults.points})::int`,
      avgPpi: sql<number>`round(avg(
        case when (${matchResults.innings} - ${matchResults.defensiveShots}) > 0
          then ${matchResults.points}::numeric / (${matchResults.innings} - ${matchResults.defensiveShots})
          else 0
        end
      )::numeric, 2)::float`,
    })
    .from(matchResults)
    .innerJoin(players, eq(matchResults.playerId, players.id))
    .where(eq(matchResults.teamId, teamId))
    .groupBy(players.id, players.apaId, players.displayName, players.currentSkillLevel)
    .orderBy(desc(sql`count(${matchResults.id})`));

  // Team-level aggregates
  const teamMatchResults = await db
    .select({
      matchId: matchResults.matchId,
      matchDate: matchResults.matchDate,
    })
    .from(matchResults)
    .where(eq(matchResults.teamId, teamId))
    .groupBy(matchResults.matchId, matchResults.matchDate)
    .orderBy(desc(matchResults.matchDate));

  return {
    ...team,
    roster: rosterStats.map((r) => ({
      ...r,
      losses: r.totalMatches - r.wins,
      winPct: r.totalMatches > 0 ? Math.round((r.wins / r.totalMatches) * 100) : 0,
    })),
    totalTeamMatches: new Set(teamMatchResults.map((m) => m.matchId)).size,
  };
}

// Get all teams
export async function getAllTeams() {
  return db.query.teams.findMany({
    orderBy: [desc(teams.isMine), teams.name],
  });
}

// Calculate PPI for a set of matches
function calcPpi(matches: PlayerMatchHistory[]): number {
  if (matches.length === 0) return 0;
  const ppis = matches.map((m) => m.pointsPerInning);
  return Math.round((ppis.reduce((a, b) => a + b, 0) / ppis.length) * 100) / 100;
}

// APA-style best 10 of last 20 PPI calculation
function calcBest10of20Ppi(matches: PlayerMatchHistory[]): number {
  const last20 = matches.slice(0, 20);
  if (last20.length === 0) return 0;
  // Sort by PPI descending and take best 10 (or all if < 10)
  const sorted = [...last20].sort((a, b) => b.pointsPerInning - a.pointsPerInning);
  const best = sorted.slice(0, Math.min(10, sorted.length));
  return calcPpi(best);
}

// Window stats for a player (L5, L10, L20, best 10 of 20)
export interface WindowStats {
  l5: { ppi: number; wins: number; losses: number; matches: number };
  l10: { ppi: number; wins: number; losses: number; matches: number };
  l20: { ppi: number; wins: number; losses: number; matches: number };
  best10of20Ppi: number;
  allTime: { ppi: number; wins: number; losses: number; matches: number };
}

function calcWindowStats(history: PlayerMatchHistory[]): WindowStats {
  const window = (n: number) => {
    const slice = history.slice(0, n);
    const wins = slice.filter((m) => m.winLoss === "W").length;
    return {
      ppi: calcPpi(slice),
      wins,
      losses: slice.length - wins,
      matches: slice.length,
    };
  };

  const allWins = history.filter((m) => m.winLoss === "W").length;

  return {
    l5: window(5),
    l10: window(10),
    l20: window(20),
    best10of20Ppi: calcBest10of20Ppi(history),
    allTime: {
      ppi: calcPpi(history),
      wins: allWins,
      losses: history.length - allWins,
      matches: history.length,
    },
  };
}

// Enhanced player detail with window stats
export async function getPlayerDetailWithWindows(playerId: number) {
  const detail = await getPlayerDetail(playerId);
  if (!detail) return null;

  const windowStats = calcWindowStats(detail.history);

  return {
    ...detail,
    windowStats,
  };
}

// Skill level analysis across the division
export interface SkillLevelGroup {
  skillLevel: number;
  playerCount: number;
  avgPpi: number;
  minPpi: number;
  maxPpi: number;
  avgWinPct: number;
  players: {
    playerId: number;
    displayName: string;
    teamName: string | null;
    ppi: number;
    best10of20Ppi: number;
    winPct: number;
    matches: number;
    isMine: boolean;
  }[];
}

export async function getSkillLevelAnalysis(): Promise<SkillLevelGroup[]> {
  // Get all players with their match histories
  const allPlayers = await db
    .select({
      playerId: players.id,
      displayName: players.displayName,
      currentSkillLevel: players.currentSkillLevel,
      teamName: teams.name,
      isMine: teams.isMine,
    })
    .from(players)
    .innerJoin(matchResults, eq(matchResults.playerId, players.id))
    .leftJoin(teams, eq(matchResults.teamId, teams.id))
    .groupBy(players.id, players.displayName, players.currentSkillLevel, teams.name, teams.isMine);

  // Group by skill level
  const groups = new Map<number, SkillLevelGroup>();

  for (const p of allPlayers) {
    const sl = p.currentSkillLevel ?? 0;
    if (sl === 0) continue;

    const history = await getPlayerMatchHistory(p.playerId);
    if (history.length === 0) continue;

    const windowStats = calcWindowStats(history);
    const winPct = history.length > 0
      ? Math.round((history.filter((h) => h.winLoss === "W").length / history.length) * 100)
      : 0;

    if (!groups.has(sl)) {
      groups.set(sl, {
        skillLevel: sl,
        playerCount: 0,
        avgPpi: 0,
        minPpi: Infinity,
        maxPpi: -Infinity,
        avgWinPct: 0,
        players: [],
      });
    }

    const group = groups.get(sl)!;
    group.players.push({
      playerId: p.playerId,
      displayName: p.displayName,
      teamName: p.teamName,
      ppi: windowStats.allTime.ppi,
      best10of20Ppi: windowStats.best10of20Ppi,
      winPct,
      matches: history.length,
      isMine: p.isMine ?? false,
    });
  }

  // Calculate group aggregates
  for (const group of groups.values()) {
    group.playerCount = group.players.length;
    const ppis = group.players.map((p) => p.ppi);
    group.avgPpi = Math.round((ppis.reduce((a, b) => a + b, 0) / ppis.length) * 100) / 100;
    group.minPpi = Math.round(Math.min(...ppis) * 100) / 100;
    group.maxPpi = Math.round(Math.max(...ppis) * 100) / 100;
    group.avgWinPct = Math.round(
      group.players.reduce((a, b) => a + b.winPct, 0) / group.players.length
    );
    // Sort players by best10of20 PPI within group
    group.players.sort((a, b) => b.best10of20Ppi - a.best10of20Ppi);
  }

  return Array.from(groups.values()).sort((a, b) => a.skillLevel - b.skillLevel);
}
