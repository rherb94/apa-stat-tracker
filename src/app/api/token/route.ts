import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, "apa_token"),
    });
    // Only return whether a token exists and a preview, not the full token
    if (row?.value) {
      const preview = row.value.substring(0, 20) + "...";
      return NextResponse.json({ hasToken: true, preview });
    }
    return NextResponse.json({ hasToken: false, preview: null });
  } catch {
    return NextResponse.json({ hasToken: false, preview: null });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Ensure it starts with "Bearer "
    const fullToken = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

    await db
      .insert(settings)
      .values({ key: "apa_token", value: fullToken })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: fullToken },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save token" },
      { status: 500 }
    );
  }
}
