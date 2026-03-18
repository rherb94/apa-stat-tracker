import { db } from "@/db";
import { divisions, teams, players, matchResults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apaGraphQL } from "./apa-client";
import { MATCH_QUERY, TEAM_MATCHES_QUERY } from "./apa-queries";

// Types for APA GraphQL responses
interface ApaPlayer {
  id: number;
  displayName: string;
  skillLevel: number;
}

interface ApaTeam {
  id: number;
  name: string;
  number: string;
  roster?: ApaPlayer[];
}

interface ApaScore {
  id: number;
  player: { id: number; displayName: string };
  matchPositionNumber: number;
  skillLevel: number;
  innings: number;
  defensiveShots: number;
  nineBallPoints: number;
  winLoss: string;
}

interface ApaMatch {
  id: number;
  isScored: boolean;
  date: string;
  home: ApaTeam;
  away: ApaTeam;
  results: { scores: ApaScore[] }[];
}

interface ApaTeamMatch {
  id: number;
  type: string;
  status: string;
  isBye: boolean;
  startTime: string;
  home: { id: number; name: string; number: string };
  away: { id: number; name: string; number: string };
}

interface TeamMatchesResponse {
  team: {
    id: number;
    name: string;
    number: string;
    matches: ApaTeamMatch[];
  };
}

interface MatchResponse {
  match: ApaMatch;
}

// Ensure a division exists in the DB, return its internal ID
async function upsertDivision(
  apaId: number,
  name: string,
  leagueId: number,
  sessionName: string,
  format: string
): Promise<number> {
  const existing = await db.query.divisions.findFirst({
    where: eq(divisions.apaId, apaId),
  });
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(divisions)
    .values({ apaId, name, leagueId, sessionName, format })
    .returning({ id: divisions.id });
  return inserted.id;
}

// Ensure a team exists in the DB, return its internal ID
async function upsertTeam(
  apaId: number,
  name: string,
  number: string | null,
  divisionId: number,
  isMine: boolean
): Promise<number> {
  const existing = await db.query.teams.findFirst({
    where: eq(teams.apaId, apaId),
  });
  if (existing) {
    await db
      .update(teams)
      .set({ name, number, divisionId, isMine: isMine || existing.isMine })
      .where(eq(teams.apaId, apaId));
    return existing.id;
  }

  const [inserted] = await db
    .insert(teams)
    .values({ apaId, name, number, divisionId, isMine })
    .returning({ id: teams.id });
  return inserted.id;
}

// Ensure a player exists in the DB, return its internal ID
async function upsertPlayer(
  apaId: number,
  displayName: string,
  skillLevel: number | null
): Promise<number> {
  const existing = await db.query.players.findFirst({
    where: eq(players.apaId, apaId),
  });
  if (existing) {
    if (skillLevel !== null) {
      await db
        .update(players)
        .set({ displayName, currentSkillLevel: skillLevel })
        .where(eq(players.apaId, apaId));
    }
    return existing.id;
  }

  const [inserted] = await db
    .insert(players)
    .values({ apaId, displayName, currentSkillLevel: skillLevel })
    .returning({ id: players.id });
  return inserted.id;
}

// Fetch match IDs for a team using the team query
async function fetchTeamMatchIds(
  teamApaId: number
): Promise<{ matchIds: number[]; teamName: string; opponentTeamIds: number[] }> {
  const data = await apaGraphQL<TeamMatchesResponse>(TEAM_MATCHES_QUERY, {
    teamId: teamApaId,
  });

  // Filter to current session only (Spring 2025 starts Dec 2024)
  const SESSION_START = new Date("2024-12-01T00:00:00");

  const completedMatches = data.team.matches.filter(
    (m) =>
      m.status === "COMPLETED" &&
      !m.isBye &&
      m.type === "NINE" &&
      new Date(m.startTime) >= SESSION_START
  );

  const matchIds = completedMatches.map((m) => m.id);

  // Collect opponent team IDs so we can crawl the full division
  const opponentTeamIds = new Set<number>();
  for (const m of completedMatches) {
    if (m.home.id !== teamApaId) opponentTeamIds.add(m.home.id);
    if (m.away.id !== teamApaId) opponentTeamIds.add(m.away.id);
  }

  return {
    matchIds,
    teamName: data.team.name,
    opponentTeamIds: Array.from(opponentTeamIds),
  };
}

// Fetch and process a single match
async function processMatch(
  matchId: number,
  divisionDbId: number,
  myTeamApaId: number
): Promise<number> {
  const data = await apaGraphQL<MatchResponse>(MATCH_QUERY, { id: matchId });
  const match = data.match;

  if (!match || !match.isScored) return 0;

  // Upsert both teams
  const homeTeamId = await upsertTeam(
    match.home.id,
    match.home.name,
    match.home.number,
    divisionDbId,
    match.home.id === myTeamApaId
  );
  const awayTeamId = await upsertTeam(
    match.away.id,
    match.away.name,
    match.away.number,
    divisionDbId,
    match.away.id === myTeamApaId
  );

  // Upsert all roster players
  const allRoster = [
    ...(match.home.roster || []),
    ...(match.away.roster || []),
  ];
  for (const p of allRoster) {
    await upsertPlayer(p.id, p.displayName, p.skillLevel);
  }

  // Process scores
  const allScores = match.results.flatMap((r) => r.scores);
  let insertedCount = 0;

  for (const score of allScores) {
    const isHome = match.home.roster?.some((p) => p.id === score.player.id);
    const playerTeamId = isHome ? homeTeamId : awayTeamId;
    const opponentTeamId = isHome ? awayTeamId : homeTeamId;

    const opponent = allScores.find(
      (s) =>
        s.matchPositionNumber === score.matchPositionNumber &&
        s.player.id !== score.player.id
    );

    const playerId = await upsertPlayer(
      score.player.id,
      score.player.displayName,
      score.skillLevel
    );

    let opponentDbId: number | null = null;
    if (opponent) {
      opponentDbId = await upsertPlayer(
        opponent.player.id,
        opponent.player.displayName,
        opponent.skillLevel
      );
    }

    try {
      await db
        .insert(matchResults)
        .values({
          matchId: match.id,
          matchDate: new Date(match.date),
          playerId,
          teamId: playerTeamId,
          opponentId: opponentDbId,
          opponentTeamId,
          skillLevel: score.skillLevel,
          opponentSkillLevel: opponent?.skillLevel ?? null,
          innings: score.innings,
          defensiveShots: score.defensiveShots,
          points: score.nineBallPoints,
          opponentPoints: opponent?.nineBallPoints ?? null,
          winLoss: score.winLoss,
          matchPositionNumber: score.matchPositionNumber,
          format: "NINE",
        })
        .onConflictDoNothing();
      insertedCount++;
    } catch {
      // Already exists, skip
    }
  }

  return insertedCount;
}

export interface SyncResult {
  totalMatches: number;
  processedMatches: number;
  newRecords: number;
  teamsDiscovered: number;
  errors: string[];
}

// Main sync function - crawls from your team outward to discover the full division
export async function syncDivision(
  divisionApaId: number,
  leagueId: number,
  sessionName: string,
  myTeamApaId: number
): Promise<SyncResult> {
  const result: SyncResult = {
    totalMatches: 0,
    processedMatches: 0,
    newRecords: 0,
    teamsDiscovered: 0,
    errors: [],
  };

  // Ensure division exists
  const divisionDbId = await upsertDivision(
    divisionApaId,
    `Division ${divisionApaId}`,
    leagueId,
    sessionName,
    "NINE"
  );

  // Check which matches we already have
  const existingResults = await db.query.matchResults.findMany({
    columns: { matchId: true },
  });
  const existingMatchIds = new Set(existingResults.map((r) => r.matchId));

  // Start with our team, then crawl to all opponent teams
  const allMatchIds = new Set<number>();
  const processedTeams = new Set<number>();
  const teamsToProcess = [myTeamApaId];

  // Crawl teams: start with ours, discover opponents, fetch their matches too
  while (teamsToProcess.length > 0) {
    const teamId = teamsToProcess.pop()!;
    if (processedTeams.has(teamId)) continue;
    processedTeams.add(teamId);
    result.teamsDiscovered++;

    try {
      const { matchIds, opponentTeamIds } = await fetchTeamMatchIds(teamId);
      for (const id of matchIds) allMatchIds.add(id);

      // Queue opponent teams we haven't seen yet
      for (const oppId of opponentTeamIds) {
        if (!processedTeams.has(oppId)) {
          teamsToProcess.push(oppId);
        }
      }
    } catch (error) {
      result.errors.push(
        `Team ${teamId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  result.totalMatches = allMatchIds.size;

  // Filter to only new matches
  const newMatchIds = Array.from(allMatchIds).filter(
    (id) => !existingMatchIds.has(id)
  );

  // Process new matches
  for (const matchId of newMatchIds) {
    try {
      const count = await processMatch(matchId, divisionDbId, myTeamApaId);
      result.processedMatches++;
      result.newRecords += count;
    } catch (error) {
      result.errors.push(
        `Match ${matchId}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return result;
}
