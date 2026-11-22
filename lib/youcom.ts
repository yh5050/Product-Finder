export type Evidence = { title: string; url: string; snippet: string; date?: string };

// live: results came back; empty: the call worked and found nothing; error: the call failed; off: no API key.
export type LiveStatus = "live" | "empty" | "error" | "off";

export type SearchResult = {
  status: LiveStatus;
  query: string;
  freshness: string;
  results: Evidence[];
  error?: string;
  fetchedAt: string;
};

export type ResearchResult = {
  status: LiveStatus;
  content: Record<string, unknown> | null;
  sources: Evidence[];
  error?: string;
  seconds?: number;
};

type Options = { key?: string; fetcher?: typeof fetch; timeoutMs?: number };

const SEARCH_URL = "https://ydc-index.io/v1/search";
const RESEARCH_URL = "https://api.you.com/v1/research";

type YouHit = { title?: string; url?: string; description?: string; snippets?: string[]; page_age?: string };

function apiKey(o: Options) {
  return o.key ?? process.env.YDC_API_KEY ?? "";
}

async function post(url: string, body: unknown, o: Options, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await (o.fetcher ?? fetch)(url, {
      method: "POST",
      headers: { "X-API-Key": apiKey(o), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`);
    }
    return await res.json();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error(`timed out after ${Math.round(timeoutMs / 1000)}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

function toEvidence(h: YouHit): Evidence | null {
  if (!h.url) return null;
  return {
    title: (h.title ?? h.url).slice(0, 140),
    url: h.url,
    snippet: (h.snippets?.[0] ?? h.description ?? "").replace(/\s+/g, " ").slice(0, 280),
    date: h.page_age,
  };
}

// You.com's freshness filter keeps pages indexed or modified in the window, not only pages published in it, so
// results with a publication date older than the window are dropped here. Undated results are kept.
function withinDays(e: Evidence, days: number, now: number) {
  if (!e.date) return true;
  const t = Date.parse(e.date);
  return Number.isNaN(t) || now - t <= days * 86400_000;
}

const WINDOW_DAYS: Record<string, number> = { day: 1, week: 7, month: 31, year: 366 };

export async function youSearch(
  query: string,
  opts: Options & { count?: number; freshness?: "day" | "week" | "month" | "year" } = {},
): Promise<SearchResult> {
  const freshness = opts.freshness ?? "month";
  const base = { query, freshness, results: [] as Evidence[], fetchedAt: new Date().toISOString() };
  if (!apiKey(opts)) return { ...base, status: "off" };
  try {
    const json = await post(SEARCH_URL, { query, count: opts.count ?? 10, freshness }, opts, opts.timeoutMs ?? 8000);
    const hits: YouHit[] = json?.results?.web ?? [];
    const now = Date.now();
    const results = hits
      .map(toEvidence)
      .filter((e): e is Evidence => e !== null)
      .filter((e) => withinDays(e, WINDOW_DAYS[freshness], now));
    return { ...base, status: results.length ? "live" : "empty", results };
  } catch (e) {
    return { ...base, status: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

// One Research call with a JSON schema for the answer. Research decides from many sources; the sources it used
// come back alongside the structured content.
export async function youResearch(
  input: string,
  schema: Record<string, unknown>,
  opts: Options & { effort?: "standard" | "deep" } = {},
): Promise<ResearchResult> {
  if (!apiKey(opts)) return { status: "off", content: null, sources: [] };
  const started = Date.now();
  try {
    const json = await post(
      RESEARCH_URL,
      { input, research_effort: opts.effort ?? "standard", output_schema: schema },
      opts,
      opts.timeoutMs ?? 45000,
    );
    const out = json?.output ?? {};
    const raw = out.content;
    const content = typeof raw === "string" ? safeJson(raw) : raw && typeof raw === "object" ? raw : null;
    const sources = ((out.sources ?? []) as YouHit[])
      .map((s) => toEvidence({ ...s, snippets: s.snippets }))
      .filter((e): e is Evidence => e !== null);
    const seconds = Math.round((Date.now() - started) / 100) / 10;
    if (!content) return { status: "error", content: null, sources, error: "Research returned no structured answer", seconds };
    return { status: "live", content, sources, seconds };
  } catch (e) {
    return { status: "error", content: null, sources: [], error: e instanceof Error ? e.message : String(e) };
  }
}

function safeJson(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}
