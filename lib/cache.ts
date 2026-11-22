import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Evidence, ResearchResult } from "./youcom";

// Process-wide store shared by the route handlers (each is bundled separately, so it lives on globalThis).
type Store = {
  research?: { result: Promise<ResearchResult>; at: number };
};

const KEY = "__productFinderStore";
const g = globalThis as unknown as Record<string, Store | undefined>;

function store(): Store {
  return (g[KEY] ??= {});
}

const SCREENING_TTL = 60 * 60 * 1000;
const RESEARCH_TTL = 10 * 60 * 1000;

// Hands the screening's evidence to the browser as a signed token. The negotiation verifies the signature before
// using it, so what the agents cite is what You.com returned, not what a browser made up. Signed rather than kept
// in memory because the two API routes can run on different serverless instances.
function signingKey() {
  const secret = process.env.EVIDENCE_SECRET || process.env.ANTHROPIC_API_KEY || process.env.YDC_API_KEY || "local-dev";
  return createHash("sha256").update(`product-finder-evidence:${secret}`).digest();
}

export function saveScreening(evidence: Evidence[]): string {
  const body = Buffer.from(JSON.stringify({ e: evidence, t: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", signingKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function screeningEvidence(token: unknown): Evidence[] | null {
  if (typeof token !== "string" || token.length > 20000) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", signingKey()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { e: Evidence[]; t: number };
    if (Date.now() - parsed.t > SCREENING_TTL || !Array.isArray(parsed.e)) return null;
    return parsed.e;
  } catch {
    return null;
  }
}

// Public creator rates do not change between runs, so one Research answer serves every negotiation for ten
// minutes. A failed answer is not kept.
export function cachedResearch(run: () => Promise<ResearchResult>): Promise<ResearchResult> {
  const s = store();
  if (s.research && Date.now() - s.research.at <= RESEARCH_TTL) return s.research.result;
  const result = run().then((r) => {
    if (r.status !== "live") s.research = undefined;
    return r;
  });
  s.research = { result, at: Date.now() };
  return result;
}
