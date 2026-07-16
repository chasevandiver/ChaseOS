import { NextResponse } from "next/server";
import { getRadar } from "@/lib/notion/data";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ roles: await getRadar() });
  } catch (error) {
    return fail(error);
  }
}
