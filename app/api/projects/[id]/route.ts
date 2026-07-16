import { NextRequest, NextResponse } from "next/server";
import { invalidate, prop, updatePage } from "@/lib/notion/api";
import { PROJECTS_DB } from "@/lib/notion/config";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Inline edits on a Projects row: Last Update and Next Action.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const J = PROJECTS_DB.props;
    const properties: Record<string, unknown> = {};

    if (typeof body.lastUpdate === "string") {
      properties[J.lastUpdate.name] = prop.text(body.lastUpdate);
    }
    if (typeof body.nextAction === "string") {
      properties[J.nextAction.name] = prop.text(body.nextAction);
    }
    if (Object.keys(properties).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await updatePage(PROJECTS_DB.name, id, properties);
    invalidate("projects");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
