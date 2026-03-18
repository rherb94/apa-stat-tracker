import { NextResponse } from "next/server";
import { syncDivision } from "@/lib/scraper";

const MY_TEAM_APA_ID = 12618508; // Towson Cowboys

export async function POST() {
  const divisionId = parseInt(process.env.APA_DIVISION_ID || "395493");
  const leagueId = parseInt(process.env.APA_LEAGUE_ID || "319");

  try {
    const result = await syncDivision(
      divisionId,
      leagueId,
      "Spring 2025",
      MY_TEAM_APA_ID
    );

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed",
      },
      { status: 500 }
    );
  }
}
