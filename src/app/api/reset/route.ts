import { NextResponse } from "next/server";
import { db } from "@/db";
import { matchResults, players, teams, divisions } from "@/db/schema";

export async function POST() {
  try {
    // Delete in order due to foreign keys
    await db.delete(matchResults);
    await db.delete(players);
    await db.delete(teams);
    await db.delete(divisions);

    return NextResponse.json({ success: true, message: "All data cleared" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reset failed" },
      { status: 500 }
    );
  }
}
