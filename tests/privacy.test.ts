import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as negotiate } from "@/app/api/negotiate/route";
import { POST as screenRoute } from "@/app/api/screen/route";
import { cachedResearch, screeningEvidence } from "@/lib/cache";
import { campaignTerms, defaultCampaign } from "@/lib/data";
import { PRIVATE } from "@/lib/private";
import { mentions } from "@/lib/text";

const saved = { ydc: process.env.YDC_API_KEY, ant: process.env.ANTHROPIC_API_KEY };
beforeEach(() => {
  delete process.env.YDC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
});
afterEach(() => {
  if (saved.ydc !== undefined) process.env.YDC_API_KEY = saved.ydc;
  if (saved.ant !== undefined) process.env.ANTHROPIC_API_KEY = saved.ant;
});

const root = path.join(__dirname, "..");
const post = (url: string, body: unknown) => new Request(url, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

describe("private limits stay on the server", () => {
  it("no browser file imports the private limits, the agents or the SDK", () => {
    const files = ["app/page.tsx", ...readdirSync(path.join(root, "components")).map((f) => `components/${f}`), "lib/model.ts", "lib/screening.ts", "lib/rubric.ts", "lib/scripts.ts", "lib/data.ts"];
    for (const f of files) {
      const src = readFileSync(path.join(root, f), "utf8");
      const imports = [...src.matchAll(/^import (?!type).*from "([^"]+)";/gm)].map((m) => m[1]);
      for (const bad of ["@/lib/private", "./private", "@/lib/agents", "./agents", "@/lib/rubric-llm", "@anthropic-ai/sdk"]) expect(imports, f).not.toContain(bad);
    }
  });

  it("the screening response has no private fields and returns a signed screening id", async () => {
    const res = await screenRoute(post("http://x/api/screen", { mayaApplied: true, type: "owned" }));
    const text = await res.text();
    const body = JSON.parse(text);
    for (const field of ["minFee", "priorities", "personality", "maxFee"]) expect(text).not.toContain(`"${field}"`);
    expect(body.youcom.status).toBe("off");
    expect(body.counts).toEqual({ total: 1000, shortlist: 100, passedChecks: 3, finalists: 3 });
    expect(screeningEvidence(body.screeningId)).toEqual([]);
    expect(screeningEvidence(body.screeningId.replace(/^./, "x"))).toBeNull();
    expect(screeningEvidence("forged.token")).toBeNull();
  });

  it("the negotiation stream has no private fields, ends cleanly, and labels a replay", async () => {
    const body = { brand: "Halden Works", product: "Halden Loop 65", type: "owned", opening: campaignTerms(defaultCampaign), maxFee: 200, creatorIds: ["maya", "maya", "jon"], mayaVideo: "v1" };
    const text = await (await negotiate(post("http://x/api/negotiate?mock=1", body))).text();
    const events = text.trim().split("\n").map((l) => JSON.parse(l));
    expect(events[0]).toEqual({ type: "mode", live: false });
    expect(events.at(-1)).toEqual({ type: "end" });
    expect(events.filter((e) => e.type === "done").map((e) => e.creatorId).sort()).toEqual(["jon", "maya"]);
    for (const field of ["minFee", "priorities", "personality", "maxFee"]) expect(text).not.toContain(field);
    for (const p of Object.values(PRIVATE)) expect(text).not.toContain(p.priorities);
  }, 30000);

  it("rejects an oversized or empty request instead of negotiating", async () => {
    for (const body of [JSON.stringify({ creatorIds: ["maya"], pad: "x".repeat(40000) }), "{}"]) {
      const events = (await (await negotiate(post("http://x/api/negotiate?mock=1", body))).text()).trim().split("\n").map((l) => JSON.parse(l));
      expect(events.some((e) => e.type === "fatal")).toBe(true);
    }
  });
});

describe("whole-word matching", () => {
  it("matches words and phrases, not parts of other words", () => {
    expect(mentions("works great on a Mac", "mac")).toBe(true);
    expect(mentions("a machine for typing", "mac")).toBe(false);
    expect(mentions("cloud sync", "loud")).toBe(false);
    expect(mentions("compact 65% layout", "65%")).toBe(true);
    expect(mentions("boards under $100", "under $")).toBe(true);
  });
});

describe("research cache", () => {
  it("reuses a live answer and retries after a failure", async () => {
    let calls = 0;
    const fail = () => { calls++; return Promise.resolve({ status: "error" as const, content: null, sources: [], error: "x" }); };
    await cachedResearch(fail);
    await cachedResearch(fail);
    expect(calls).toBe(2);
    const ok = () => { calls++; return Promise.resolve({ status: "live" as const, content: { a: 1 }, sources: [] }); };
    const a = await cachedResearch(ok);
    const b = await cachedResearch(ok);
    expect(a).toBe(b);
    expect(calls).toBe(3);
  });
});
