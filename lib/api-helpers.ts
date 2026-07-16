import { NextResponse } from "next/server";
import { NotionError } from "./notion/api";

export function fail(error: unknown) {
  if (error instanceof NotionError) {
    return NextResponse.json(
      { error: error.message, source: error.source },
      { status: error.status >= 500 ? 502 : error.status }
    );
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return NextResponse.json({ error: message }, { status: 500 });
}
