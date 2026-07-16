import { NextRequest, NextResponse } from "next/server";
import { invalidate, prop, updatePage } from "@/lib/notion/api";
import { RADAR_DB, RADAR_STATUS, TIER_LABELS, TierKey } from "@/lib/notion/config";
import { fail } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Single property updates on a Job Radar row: change tier or set status.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const properties: Record<string, unknown> = {};

    if (body.tier) {
      const tier = body.tier as TierKey;
      if (!TIER_LABELS[tier]) {
        return NextResponse.json({ error: `Unknown tier ${body.tier}` }, { status: 400 });
      }
      properties[RADAR_DB.props.tier.name] = prop.select(TIER_LABELS[tier]);
    }
    if (body.status) {
      const valid = Object.values(RADAR_STATUS) as string[];
      if (!valid.includes(body.status)) {
        return NextResponse.json({ error: `Unknown status ${body.status}` }, { status: 400 });
      }
      properties[RADAR_DB.props.status.name] = prop.select(body.status);
    }
    if (Object.keys(properties).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await updatePage(RADAR_DB.name, id, properties);
    invalidate("radar");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
