import { NextResponse } from "next/server";
import { getProjects } from "@/lib/notion/data";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ projects: await getProjects() });
  } catch (error) {
    return fail(error);
  }
}
