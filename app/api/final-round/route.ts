import { NextRequest, NextResponse } from "next/server";
import { createPage, prop } from "@/lib/notion/api";
import { FINAL_ROUND_DB, STAGE_REACHED_OPTIONS } from "@/lib/notion/config";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Writes a Final-Round Log row. The Role, Stage Reached, What Happened, and
// Where It Broke Down properties were added to the database via the API when
// this app was built; scripts/discover-schema.mjs verifies they still exist.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const company = String(body?.company ?? "").trim();
    const date = String(body?.date ?? "").trim();
    if (!company || !date) {
      return NextResponse.json({ error: "company and date are required" }, { status: 400 });
    }

    const F = FINAL_ROUND_DB.props;
    const properties: Record<string, unknown> = {
      [F.company.name]: prop.title(company),
      [F.role.name]: prop.text(String(body?.role ?? "")),
      [F.whatHappened.name]: prop.text(String(body?.whatHappened ?? "")),
      [F.whereItBrokeDown.name]: prop.text(String(body?.whereItBrokeDown ?? "")),
      [F.date.name]: prop.date(date),
    };
    const stage = String(body?.stageReached ?? "");
    if (stage) {
      if (!(STAGE_REACHED_OPTIONS as readonly string[]).includes(stage)) {
        return NextResponse.json({ error: `Unknown stage ${stage}` }, { status: 400 });
      }
      properties[F.stageReached.name] = prop.select(stage);
    }

    const page = await createPage(FINAL_ROUND_DB.name, FINAL_ROUND_DB.id, properties);
    return NextResponse.json({ ok: true, id: page.id });
  } catch (error) {
    return fail(error);
  }
}
