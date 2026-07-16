import { NextResponse } from "next/server";
import { cached } from "@/lib/notion/api";
import { getBriefing } from "@/lib/notion/briefing";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const briefing = await cached("briefing", getBriefing);
    return NextResponse.json(briefing);
  } catch (error) {
    return fail(error);
  }
}
