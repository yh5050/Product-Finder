import { anthropicClient } from "@/lib/agents";
import { saveScreening } from "@/lib/cache";
import { defaultCampaign } from "@/lib/data";
import { combinedStatus, mergeResults, SCREEN_QUERIES } from "@/lib/market";
import { buildRubric } from "@/lib/rubric-llm";
import { applicantPool, requirements, screen, toView } from "@/lib/screening";
import { youSearch } from "@/lib/youcom";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BODY = 2_000;

/**
 * Screens the sample pool: You.com reads the past month of the web for what matters, that becomes the rubric, and the
 * rubric ranks 1,000 sample applicants down to 100 and then the finalists that meet every requirement of the brief.
 * Only public fields leave the server; the screening's evidence comes back as a signed token for the negotiation.
 */
export async function POST(req: Request) {
  const started = Date.now();
  const raw = await req.text().catch(() => "");
  let body: { mayaApplied?: unknown; type?: unknown; followerMin?: unknown; product?: unknown } = {};
  if (raw.length <= MAX_BODY) {
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      body = {};
    }
  }
  const type = body.type === "sponsored" ? "sponsored" : "owned";
  const followerMin = requirements({ type, followerMin: String(Number(body.followerMin) || 0) }).followerMin;
  const product = typeof body.product === "string" && body.product.trim() ? body.product.slice(0, 80) : defaultCampaign.product;

  let searches = await Promise.all(SCREEN_QUERIES.map((q) => youSearch(q, { count: 10, freshness: "month" })));
  let window: "month" | "year" = "month";
  if (combinedStatus(searches) === "empty") {
    // A quiet month: widen to the past year rather than screen on nothing, and say so on screen.
    searches = await Promise.all(SCREEN_QUERIES.map((q) => youSearch(q, { count: 10, freshness: "year" })));
    window = "year";
  }
  const status = combinedStatus(searches);
  const evidence = mergeResults(searches);
  const client = process.env.ANTHROPIC_API_KEY ? anthropicClient() : undefined;
  const rubric = await buildRubric(product, evidence, status, client);
  const result = screen(applicantPool(body.mayaApplied === true), rubric, followerMin);
  const cited = new Map<string, (typeof evidence)[number]>();
  for (const c of rubric.criteria) for (const e of c.evidence) cited.set(e.url, e);
  const screeningId = saveScreening([...cited.values()].slice(0, 12));
  return Response.json(
    toView(result, rubric, {
      screeningId,
      youcom: {
        status,
        window,
        sources: evidence.length,
        queries: searches.map((s) => ({ query: s.query, status: s.status, count: s.results.length, error: s.error })),
        fetchedAt: searches[0]?.fetchedAt,
      },
      seconds: Math.round((Date.now() - started) / 100) / 10,
    }),
  );
}
