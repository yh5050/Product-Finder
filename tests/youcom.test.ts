import { describe, expect, it } from "vitest";
import { cleanEvidence, combinedStatus, mergeResults } from "@/lib/market";
import { youResearch, youSearch } from "@/lib/youcom";

function fakeFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  }) as unknown as typeof fetch;
  return { f, calls };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const recent = new Date(Date.now() - 3 * 86400_000).toISOString();
const old = new Date(Date.now() - 400 * 86400_000).toISOString();

describe("youSearch", () => {
  it("is off without a key and makes no request", async () => {
    const { f, calls } = fakeFetch(() => json({}));
    const r = await youSearch("q", { key: "", fetcher: f });
    expect(r.status).toBe("off");
    expect(calls).toHaveLength(0);
  });

  it("POSTs the query with freshness and maps results, dropping pages older than the window", async () => {
    const { f, calls } = fakeFetch(() =>
      json({ results: { web: [
        { title: "Fresh", url: "https://a.com/1", snippets: ["new and quiet"], page_age: recent },
        { title: "Stale", url: "https://a.com/2", description: "old page", page_age: old },
        { title: "Undated", url: "https://a.com/3", description: "no date" },
        { title: "No url" },
      ] } }),
    );
    const r = await youSearch("silent keyboard", { key: "k", fetcher: f, freshness: "month", count: 5 });
    expect(calls[0].url).toBe("https://ydc-index.io/v1/search");
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>)["X-API-Key"]).toBe("k");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ query: "silent keyboard", count: 5, freshness: "month" });
    expect(r.status).toBe("live");
    expect(r.results.map((e) => e.title)).toEqual(["Fresh", "Undated"]);
    expect(r.results[0].snippet).toBe("new and quiet");
  });

  it("reports an empty result as empty, not as an error", async () => {
    const { f } = fakeFetch(() => json({ results: { web: [] } }));
    const r = await youSearch("q", { key: "k", fetcher: f });
    expect(r.status).toBe("empty");
    expect(r.error).toBeUndefined();
  });

  it("reports an HTTP failure as an error with the status", async () => {
    const { f } = fakeFetch(() => new Response("forbidden", { status: 403 }));
    const r = await youSearch("q", { key: "k", fetcher: f });
    expect(r.status).toBe("error");
    expect(r.error).toContain("403");
  });

  it("reports a slow call as a timeout error", async () => {
    const f = ((_: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      })) as unknown as typeof fetch;
    const r = await youSearch("q", { key: "k", fetcher: f, timeoutMs: 20 });
    expect(r.status).toBe("error");
    expect(r.error).toMatch(/timed out/);
  });
});

describe("youResearch", () => {
  it("sends the input, effort and schema, and returns structured content with sources", async () => {
    const { f, calls } = fakeFetch(() =>
      json({ output: { content: { fee_low_usd: 300, fee_high_usd: 800, paid_usage_effect: "x", recommendation: "y" }, content_type: "object",
        sources: [{ url: "https://r.com/a", title: "Rate guide", snippets: ["rates"] }] } }),
    );
    const r = await youResearch("question", { type: "object" }, { key: "k", fetcher: f });
    expect(calls[0].url).toBe("https://api.you.com/v1/research");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ input: "question", research_effort: "standard", output_schema: { type: "object" } });
    expect(r.status).toBe("live");
    expect(r.content?.fee_low_usd).toBe(300);
    expect(r.sources[0].url).toBe("https://r.com/a");
  });

  it("accepts content returned as a JSON string", async () => {
    const { f } = fakeFetch(() => json({ output: { content: JSON.stringify({ recommendation: "ok" }), sources: [] } }));
    const r = await youResearch("q", {}, { key: "k", fetcher: f });
    expect(r.status).toBe("live");
    expect(r.content?.recommendation).toBe("ok");
  });

  it("is an error when the answer has no structured content", async () => {
    const { f } = fakeFetch(() => json({ output: { content: "just prose", sources: [] } }));
    const r = await youResearch("q", {}, { key: "k", fetcher: f });
    expect(r.status).toBe("error");
  });

  it("is off without a key", async () => {
    const r = await youResearch("q", {}, { key: "" });
    expect(r.status).toBe("off");
  });
});

describe("market helpers", () => {
  const r = (status: "live" | "empty" | "error" | "off", urls: string[] = []) => ({
    status, query: "q", freshness: "month", fetchedAt: "", results: urls.map((u) => ({ title: u, url: u, snippet: "" })),
  });

  it("merges results without repeating a URL", () => {
    const merged = mergeResults([r("live", ["https://a", "https://b"]), r("live", ["https://b", "https://c"])]);
    expect(merged.map((e) => e.url)).toEqual(["https://a", "https://b", "https://c"]);
  });

  it("combines statuses so a partial failure is visible", () => {
    expect(combinedStatus([r("live", ["https://a"]), r("error")])).toBe("live");
    expect(combinedStatus([r("off"), r("off")])).toBe("off");
    expect(combinedStatus([r("error"), r("error")])).toBe("error");
    expect(combinedStatus([r("empty"), r("error")])).toBe("error");
    expect(combinedStatus([r("empty"), r("empty")])).toBe("empty");
  });

  it("keeps only well-formed evidence from the browser, bounded in size", () => {
    const cleaned = cleanEvidence([
      { title: "ok", url: "https://ok.com", snippet: "x".repeat(1000) },
      { title: "bad scheme", url: "javascript:alert(1)" },
      "not an object",
      null,
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].snippet).toHaveLength(280);
    expect(cleanEvidence("nope")).toEqual([]);
  });
});
