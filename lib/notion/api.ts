import { NOTION_VERSION, TIMEZONE } from "./config";

const BASE = "https://api.notion.com/v1";

export class NotionError extends Error {
  status: number;
  source: string;
  constructor(source: string, status: number, message: string) {
    super(message);
    this.status = status;
    this.source = source;
  }
}

function token(): string {
  const t = process.env.NOTION_TOKEN;
  if (!t) throw new NotionError("environment", 500, "NOTION_TOKEN is not set");
  return t;
}

async function request<T>(
  source: string,
  path: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Notion returned ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // keep the generic message
    }
    throw new NotionError(source, res.status, message);
  }
  return res.json() as Promise<T>;
}

// 60 second in-memory read cache. Serverless instances keep this between warm
// invocations, which is exactly the freshness we want. Writes clear it.
type CacheEntry = { at: number; data: unknown };
const globalCache = globalThis as unknown as { __chaseosCache?: Map<string, CacheEntry> };
const cache = (globalCache.__chaseosCache ??= new Map<string, CacheEntry>());
const TTL_MS = 60_000;

export async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
  const data = await fn();
  cache.set(key, { at: Date.now(), data });
  return data;
}

export function invalidate(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type NotionPage = {
  id: string;
  url: string;
  last_edited_time: string;
  properties: Record<string, any>;
};

export async function queryDatabase(
  source: string,
  databaseId: string,
  body: Record<string, unknown> = {}
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const data = await request<{
      results: NotionPage[];
      has_more: boolean;
      next_cursor: string | null;
    }>(source, `/databases/${databaseId}/query`, {
      method: "POST",
      body: { page_size: 100, ...body, start_cursor: cursor },
    });
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor ?? undefined : undefined;
  } while (cursor);
  return pages;
}

export async function getBlockChildren(source: string, blockId: string) {
  const blocks: any[] = [];
  let cursor: string | undefined;
  do {
    const qs = cursor ? `?start_cursor=${cursor}&page_size=100` : "?page_size=100";
    const data = await request<{ results: any[]; has_more: boolean; next_cursor: string | null }>(
      source,
      `/blocks/${blockId}/children${qs}`
    );
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor ?? undefined : undefined;
  } while (cursor);
  return blocks;
}

export async function getPage(source: string, pageId: string) {
  return request<NotionPage>(source, `/pages/${pageId}`);
}

export async function updatePage(
  source: string,
  pageId: string,
  properties: Record<string, unknown>
) {
  return request<NotionPage>(source, `/pages/${pageId}`, {
    method: "PATCH",
    body: { properties },
  });
}

export async function createPage(
  source: string,
  databaseId: string,
  properties: Record<string, unknown>
) {
  return request<NotionPage>(source, `/pages`, {
    method: "POST",
    body: { parent: { database_id: databaseId }, properties },
  });
}

/* ---------- property value helpers (read) ---------- */

export function plainText(rich: any[] | undefined): string {
  if (!rich) return "";
  return rich.map((r) => r.plain_text ?? "").join("");
}

export function readTitle(page: NotionPage, name: string): string {
  return plainText(page.properties[name]?.title);
}
export function readText(page: NotionPage, name: string): string {
  return plainText(page.properties[name]?.rich_text);
}
export function readSelect(page: NotionPage, name: string): string | null {
  return page.properties[name]?.select?.name ?? null;
}
export function readUrl(page: NotionPage, name: string): string | null {
  return page.properties[name]?.url ?? null;
}
export function readDate(page: NotionPage, name: string): string | null {
  return page.properties[name]?.date?.start ?? null;
}
export function readCheckbox(page: NotionPage, name: string): boolean {
  return Boolean(page.properties[name]?.checkbox);
}

/* ---------- property value helpers (write) ---------- */

export const prop = {
  title: (text: string) => ({ title: [{ text: { content: text } }] }),
  text: (text: string) => ({ rich_text: text ? [{ text: { content: text } }] : [] }),
  select: (name: string) => ({ select: { name } }),
  url: (url: string | null) => ({ url: url || null }),
  date: (isoDate: string | null) => ({ date: isoDate ? { start: isoDate } : null }),
  checkbox: (checked: boolean) => ({ checkbox: checked }),
};

/* ---------- dates ---------- */

// Day-precision "today" in the configured timezone, as YYYY-MM-DD.
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}
