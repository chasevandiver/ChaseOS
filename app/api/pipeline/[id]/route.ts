import { NextRequest, NextResponse } from "next/server";
import { addDaysISO, invalidate, prop, todayISO, updatePage } from "@/lib/notion/api";
import { PIPELINE_DB } from "@/lib/notion/config";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Updates on a Job Pipeline row: bump follow-up a week, or edit next action.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const P = PIPELINE_DB.props;
    const properties: Record<string, unknown> = {};
    let newDate: string | null = null;

    if (body.bumpWeek) {
      // A week from the current follow-up, or from today if it was empty or
      // already past. Bumping an overdue item should land in the future.
      const today = todayISO();
      const base =
        typeof body.currentDate === "string" && body.currentDate > today
          ? body.currentDate
          : today;
      newDate = addDaysISO(base, 7);
      properties[P.nextDate.name] = prop.date(newDate);
    }
    if (typeof body.nextDate === "string") {
      newDate = body.nextDate;
      properties[P.nextDate.name] = prop.date(body.nextDate);
    }
    if (typeof body.nextAction === "string") {
      properties[P.nextAction.name] = prop.text(body.nextAction);
    }
    if (typeof body.stage === "string") {
      properties[P.stage.name] = prop.select(body.stage);
    }
    if (Object.keys(properties).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await updatePage(PIPELINE_DB.name, id, properties);
    invalidate("pipeline");
    return NextResponse.json({ ok: true, nextDate: newDate });
  } catch (error) {
    return fail(error);
  }
}
