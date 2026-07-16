/* eslint-disable @typescript-eslint/no-explicit-any */
import { getBlockChildren, getPage } from "./api";
import { BRIEFING_HEADING, COMMAND_CENTER_PAGE_ID } from "./config";

export type BriefingSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  href?: string | null;
};

export type BriefingBlock = {
  id: string;
  type: "paragraph" | "bulleted_list_item" | "numbered_list_item" | "heading_3" | "quote" | "to_do" | "callout";
  spans: BriefingSpan[];
  checked?: boolean;
};

export type Briefing = {
  blocks: BriefingBlock[];
  lastEdited: string;
};

function toSpans(richText: any[] | undefined): BriefingSpan[] {
  if (!richText) return [];
  return richText.map((r) => ({
    text: r.plain_text ?? "",
    bold: r.annotations?.bold || undefined,
    italic: r.annotations?.italic || undefined,
    code: r.annotations?.code || undefined,
    href: r.href ?? undefined,
  }));
}

const RENDERABLE = new Set([
  "paragraph",
  "bulleted_list_item",
  "numbered_list_item",
  "heading_3",
  "quote",
  "to_do",
  "callout",
]);

// Pulls the Daily Briefing section from the Command Center page: everything
// after the heading that contains BRIEFING_HEADING, up to the next divider or
// same-or-higher-level heading.
export async function getBriefing(): Promise<Briefing> {
  const source = "Command Center page";
  const [page, blocks] = await Promise.all([
    getPage(source, COMMAND_CENTER_PAGE_ID),
    getBlockChildren(source, COMMAND_CENTER_PAGE_ID),
  ]);

  const startIndex = blocks.findIndex((b: any) => {
    if (b.type !== "heading_1" && b.type !== "heading_2") return false;
    const text = (b[b.type]?.rich_text ?? []).map((r: any) => r.plain_text).join("");
    return text.includes(BRIEFING_HEADING);
  });

  const out: BriefingBlock[] = [];
  if (startIndex >= 0) {
    for (let i = startIndex + 1; i < blocks.length; i++) {
      const b: any = blocks[i];
      if (b.type === "divider" || b.type === "heading_1" || b.type === "heading_2") break;
      if (!RENDERABLE.has(b.type)) continue;
      const spans = toSpans(b[b.type]?.rich_text);
      if (spans.length === 0 && b.type === "paragraph") continue;
      out.push({
        id: b.id,
        type: b.type,
        spans,
        checked: b.type === "to_do" ? Boolean(b.to_do?.checked) : undefined,
      });
    }
  }

  return { blocks: out, lastEdited: page.last_edited_time };
}
