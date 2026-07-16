import { NextRequest, NextResponse } from "next/server";
import {
  addDaysISO,
  createPage,
  invalidate,
  prop,
  todayISO,
  updatePage,
} from "@/lib/notion/api";
import { PIPELINE_DB, RADAR_DB, RADAR_STATUS } from "@/lib/notion/config";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Mark Applied. Two writes:
// 1. Create a Job Pipeline row: stage Applied, applied today, follow-up in a
//    week, next action "Follow up".
// 2. Set the Job Radar row Status to Applied (plus its Applied checkbox and
//    Applied Date, which the Radar database tracks).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const radarId = String(body?.radarId ?? "");
    const role = String(body?.role ?? "").trim();
    const company = String(body?.company ?? "").trim();
    if (!radarId || !company) {
      return NextResponse.json({ error: "radarId and company are required" }, { status: 400 });
    }

    const today = todayISO();
    const followUp = addDaysISO(today, 7);
    const P = PIPELINE_DB.props;

    const pipelinePage = await createPage(PIPELINE_DB.name, PIPELINE_DB.id, {
      [P.company.name]: prop.title(company),
      [P.role.name]: prop.text(role),
      [P.stage.name]: prop.select("Applied"),
      [P.nextDate.name]: prop.date(followUp),
      [P.nextAction.name]: prop.text("Follow up"),
      [P.lastAction.name]: prop.text(`Applied ${today}`),
    });

    const R = RADAR_DB.props;
    await updatePage(RADAR_DB.name, radarId, {
      [R.status.name]: prop.select(RADAR_STATUS.applied),
      [R.applied.name]: prop.checkbox(true),
      [R.appliedDate.name]: prop.date(today),
    });

    invalidate("radar");
    invalidate("pipeline");
    return NextResponse.json({
      ok: true,
      pipelineId: pipelinePage.id,
      followUp,
    });
  } catch (error) {
    return fail(error);
  }
}
