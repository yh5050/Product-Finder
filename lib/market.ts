import type { Evidence, SearchResult } from "./youcom";

// What the brand's screening asks the live web: what buyers and reviewers care about for this product right now.
export const SCREEN_QUERIES = [
  "compact 65% wireless mechanical keyboard review",
  "best mechanical keyboard for Mac",
  "hot-swap mechanical keyboard what to look for",
];

// What the creator's agent asks: this month's keyboard launches and coverage, for timing and leverage.
export const CREATOR_QUERY = "new mechanical keyboard launch";

export const RESEARCH_INPUT =
  "A small U.S. consumer brand is negotiating with tech creators who have 10K–50K followers on TikTok or YouTube Shorts " +
  "for one 45–60 second first-impressions video of a mechanical keyboard, delivered as brand-owned content with organic social usage rights only (no paid ads). " +
  "Using publicly reported rate cards, creator surveys or industry pricing guides from 2025–2026, what flat fee range in USD is typical " +
  "for this deliverable, and how do 30, 90 and 180 days of organic usage rights change the fee? End with a one-sentence recommendation " +
  "for the brand's counter-offer.";

export const RESEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["fee_low_usd", "fee_high_usd", "paid_usage_effect", "recommendation"],
  properties: {
    fee_low_usd: { type: "number", description: "Low end of the typical flat fee in USD" },
    fee_high_usd: { type: "number", description: "High end of the typical flat fee in USD" },
    paid_usage_effect: { type: "string", description: "How the length of organic usage rights changes the fee" },
    recommendation: { type: "string", description: "One sentence for the brand's counter-offer" },
  },
};

// Merges several searches into one evidence list without repeating a URL.
export function mergeResults(results: SearchResult[], limit = 24): Evidence[] {
  const seen = new Set<string>();
  const out: Evidence[] = [];
  for (const r of results) {
    for (const e of r.results) {
      if (seen.has(e.url)) continue;
      seen.add(e.url);
      out.push(e);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// The overall state of a set of searches: live if any returned results, error if all failed, and so on.
export function combinedStatus(results: SearchResult[]): SearchResult["status"] {
  if (results.some((r) => r.status === "live")) return "live";
  if (results.every((r) => r.status === "off")) return "off";
  if (results.every((r) => r.status === "error")) return "error";
  return results.some((r) => r.status === "error") ? "error" : "empty";
}

// Keeps evidence sent back by the browser to plain, bounded strings before it reaches an agent prompt.
export function cleanEvidence(input: unknown, limit = 12): Evidence[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, limit).flatMap((e) => {
    if (!e || typeof e !== "object") return [];
    const o = e as Record<string, unknown>;
    if (typeof o.url !== "string" || !/^https?:\/\//.test(o.url)) return [];
    return [{
      title: String(o.title ?? "").slice(0, 140),
      url: o.url.slice(0, 500),
      snippet: String(o.snippet ?? "").slice(0, 280),
      date: typeof o.date === "string" ? o.date.slice(0, 40) : undefined,
    }];
  });
}
