import { db } from "@/db";
import { matchResults, players, teams } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

// 9-ball points needed to win by skill level
const NINE_BALL_POINTS_TO_WIN: Record<number, number> = {
  1: 14, 2: 19, 3: 25, 4: 31, 5: 38, 6: 46, 7: 55, 8: 65, 9: 75,
};

function getPointsToWin(skillLevel: number): number {
  return NINE_BALL_POINTS_TO_WIN[skillLevel] ?? 31;
}

// Performance Average (PA) = points scored / points needed to win
function calcPA(points: number, skillLevel: number): number {
  const needed = getPointsToWin(skillLevel);
  return needed > 0 ? Math.round((points / needed) * 1000) / 1000 : 0;
}

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
  avgPA: number; // Performance Average (points / points needed to win)
  avgPPM: number; // Average points per match
  totalPoints: number;
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
  pa: number; // Performance Average for this match
  pointsNeeded: number;
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
      avgPoints: sql<number>`round(avg(${matchResults.points})::numeric, 1)::float`,
    })
    .from(matchResults)
    .innerJoin(players, eq(matchResults.playerId, players.id))
    .leftJoin(teams, eq(matchResults.teamId, teams.id))
    .groupBy(players.id, players.apaId, players.displayName, players.currentSkillLevel, teams.name, teams.id, teams.isMine)
    .orderBy(desc(sql`avg(${matchResults.points})`));

  return results.map((r) => {
    const sl = r.currentSkillLevel ?? 4;
    const ptsNeeded = getPointsToWin(sl);
    const avgPA = ptsNeeded > 0 ? Math.round(((r.avgPoints ?? 0) / ptsNeeded) * 1000) / 1000 : 0;

    return {
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
      avgPA,
      avgPPM: r.avgPoints ?? 0,
      totalPoints: r.totalPoints ?? 0,
      isMine: r.isMine ?? false,
    };
  });
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

  return results.map((r) => {
    const ptsNeeded = getPointsToWin(r.skillLevel);
    return {
      ...r,
      pa: calcPA(r.points, r.skillLevel),
      pointsNeeded: ptsNeeded,
    };
  });
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
  const avgPA =
    totalMatches > 0
      ? Math.round(
          (history.reduce((sum, h) => sum + h.pa, 0) / totalMatches) * 1000
        ) / 1000
      : 0;

  // Hot streak: trend over last 5 matches
  const recent = history.slice(0, 5);
  const recentPA =
    recent.length > 0
      ? recent.reduce((sum, h) => sum + h.pa, 0) / recent.length
      : 0;
  const olderPA =
    totalMatches > 5
      ? history.slice(5).reduce((sum, h) => sum + h.pa, 0) /
        (totalMatches - 5)
      : avgPA;

  let trend: "hot" | "cold" | "stable" = "stable";
  if (recent.length >= 3) {
    if (recentPA > olderPA * 1.1) trend = "hot";
    else if (recentPA < olderPA * 0.9) trend = "cold";
  }

  return {
    ...player,
    totalMatches,
    wins,
    losses: totalMatches - wins,
    winPct: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
    avgPA,
    recentPA: Math.round(recentPA * 1000) / 1000,
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
      avgPoints: sql<number>`round(avg(${matchResults.points})::numeric, 1)::float`,
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
      avgPA: r.currentSkillLevel
        ? Math.round(((r.avgPoints ?? 0) / getPointsToWin(r.currentSkillLevel)) * 1000) / 1000
        : 0,
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

// Calculate average PA for a set of matches
function calcAvgPA(matches: PlayerMatchHistory[]): number {
  if (matches.length === 0) return 0;
  const pas = matches.map((m) => m.pa);
  return Math.round((pas.reduce((a, b) => a + b, 0) / pas.length) * 1000) / 1000;
}

// APA-style best 10 of last 20 PA calculation
function calcBest10of20PA(matches: PlayerMatchHistory[]): number {
  const last20 = matches.slice(0, 20);
  if (last20.length === 0) return 0;
  const sorted = [...last20].sort((a, b) => b.pa - a.pa);
  const best = sorted.slice(0, Math.min(10, sorted.length));
  return calcAvgPA(best);
}

// Window stats for a player (L5, L10, L20, best 10 of 20)
export interface WindowStats {
  l5: { pa: number; wins: number; losses: number; matches: number };
  l10: { pa: number; wins: number; losses: number; matches: number };
  l20: { pa: number; wins: number; losses: number; matches: number };
  best10of20PA: number;
  allTime: { pa: number; wins: number; losses: number; matches: number };
}

function calcWindowStats(history: PlayerMatchHistory[]): WindowStats {
  const window = (n: number) => {
    const slice = history.slice(0, n);
    const wins = slice.filter((m) => m.winLoss === "W").length;
    return {
      pa: calcAvgPA(slice),
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
    best10of20PA: calcBest10of20PA(history),
    allTime: {
      pa: calcAvgPA(history),
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
    pa: number;
    best10of20PA: number;
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
      pa: windowStats.allTime.pa,
      best10of20PA: windowStats.best10of20PA,
      winPct,
      matches: history.length,
      isMine: p.isMine ?? false,
    });
  }

  // Calculate group aggregates
  for (const group of groups.values()) {
    group.playerCount = group.players.length;
    const pas = group.players.map((p) => p.pa);
    group.avgPpi = Math.round((pas.reduce((a, b) => a + b, 0) / pas.length) * 1000) / 1000;
    group.minPpi = Math.round(Math.min(...pas) * 1000) / 1000;
    group.maxPpi = Math.round(Math.max(...pas) * 1000) / 1000;
    group.avgWinPct = Math.round(
      group.players.reduce((a, b) => a + b.winPct, 0) / group.players.length
    );
    // Sort players by best10of20 PPI within group
    group.players.sort((a, b) => b.best10of20PA - a.best10of20PA);
  }

  return Array.from(groups.values()).sort((a, b) => a.skillLevel - b.skillLevel);
}
