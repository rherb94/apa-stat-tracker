import { NextResponse } from "next/server";
import { syncDivision } from "@/lib/scraper";

const MY_TEAM_APA_ID = 12875474; // Towson Cowboys (Spring 2026)

export async function POST() {
  const divisionId = parseInt(process.env.APA_DIVISION_ID || "418372");
  const leagueId = parseInt(process.env.APA_LEAGUE_ID || "319");

  try {
    const result = await syncDivision(
      divisionId,
      leagueId,
      "Spring 2026",
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
