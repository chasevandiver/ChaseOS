import { NextResponse } from "next/server";
import { getPipeline } from "@/lib/notion/data";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ rows: await getPipeline() });
  } catch (error) {
    return fail(error);
  }
}
