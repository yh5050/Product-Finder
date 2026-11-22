import { negotiateLive, type BrandBrief } from "@/lib/agents";
import { cachedResearch, screeningEvidence } from "@/lib/cache";
import { mayaApplicant, OTHERS, PRODUCT_PITCH, type Applicant, type Terms } from "@/lib/data";
import { CREATOR_QUERY, RESEARCH_INPUT, RESEARCH_SCHEMA } from "@/lib/market";
import { privateLimits } from "@/lib/private";
import { replay, type NegotiationEvent, type Turn } from "@/lib/scripts";
import { youResearch, youSearch, type ResearchResult } from "@/lib/youcom";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BODY = 30_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const str = (v: unknown, max: number, fallback: string) => (typeof v === "string" && v.trim() ? v.slice(0, max) : fallback);

function cleanTerms(t: unknown): Terms | null {
  if (!t || typeof t !== "object") return null;
  const o = t as Record<string, unknown>;
  const fee = Math.round(Number(o.fee));
  if (!Number.isFinite(fee) || fee <= 0 || fee > 100_000) return null;
  return {
    fee,
    deliverable: str(o.deliverable, 200, "One 45–60 second first-impressions video"),
    deadline: str(o.deadline, 60, "10 days after delivery"),
    usageRights: str(o.usageRights, 120, "Brand organic social, 90 days"),
    keepSample: o.keepSample !== false,
    payment: str(o.payment, 120, "Net 30 after the brand approves the video"),
  };
}

function applicant(id: string, mayaVideo: unknown): Applicant | undefined {
  if (id === "maya") return mayaApplicant(typeof mayaVideo === "string" ? mayaVideo : "v1");
  return OTHERS.find((o) => o.id === id);
}

/**
 * Streams brand-agent ↔ creator-agent negotiations for the shortlisted creators in parallel (NDJSON). The brand's
 * brief and private cap come from its own campaign builder; each creator's private minimum stays on the server.
 */
export async function POST(req: Request) {
  const forceReplay = new URL(req.url).searchParams.get("mock") === "1";
  const raw = await req.text().catch(() => "");
  let body: Record<string, unknown> = {};
  let tooBig = false;
  if (raw.length > MAX_BODY) tooBig = true;
  else {
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      body = {};
    }
  }
  const opening = cleanTerms(body.opening);
  const ids = Array.isArray(body.creatorIds) ? [...new Set(body.creatorIds.filter((x): x is string => typeof x === "string"))].slice(0, 3) : [];
  const people = ids.map((id) => ({ id, c: applicant(id, body.mayaVideo) })).filter((x): x is { id: string; c: Applicant } => !!x.c);
  const brief: BrandBrief | null = opening && {
    brand: str(body.brand, 60, "Halden Works"),
    product: str(body.product, 80, "Halden Loop 65"),
    pitch: PRODUCT_PITCH,
    type: body.type === "sponsored" ? "sponsored" : "owned",
    opening,
    maxFee: Math.max(opening.fee, Math.round(Number(body.maxFee)) || opening.fee),
  };
  const stored = screeningEvidence(body.screeningId);
  const live = !forceReplay && Boolean(process.env.ANTHROPIC_API_KEY);
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: NegotiationEvent) => {
        if (!closed) controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };
      const finish = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };
      send({ type: "mode", live });
      if (tooBig || !brief || !people.length) {
        send({ type: "fatal", message: tooBig ? "The request was too large." : "Shortlist creators and publish the brief first." });
        send({ type: "end" });
        finish();
        return;
      }

      if (!live) {
        await replay(people.map((p) => p.id), brief.opening, brief.brand, brief.product, send, brief.maxFee);
        finish();
        return;
      }

      if (stored === null) send({ type: "notice", message: "This screening's evidence has expired or is missing, so the brand agent has no sources. Run the screening again." });

      // Started together: one Research call on public creator rates (cached), and the creators' news search.
      let researchDone = false;
      const research: Promise<ResearchResult> = cachedResearch(() => youResearch(RESEARCH_INPUT, RESEARCH_SCHEMA, { effort: "standard" }));
      research.then((r) => { researchDone = true; send({ type: "research", ...r }); }).catch(() => undefined);
      const news = youSearch(CREATOR_QUERY, { count: 8, freshness: "month" });
      news.then((n) => send({ type: "creatorEvidence", status: n.status, results: n.results, error: n.error }));

      await Promise.all(
        people.map(async ({ id, c }) => {
          send({ type: "thinking", creatorId: id, from: "brand" });
          let last: Turn | undefined;
          let failed = false;
          try {
            const ctx = { brandEvidence: stored ?? [], creatorEvidence: (await news).results, research };
            for await (const t of negotiateLive(brief, c, privateLimits(id), ctx)) {
              if (closed) return;
              send({ type: "turn", creatorId: id, turn: t });
              last = t;
              if (t.status !== "accept" && t.status !== "walk") send({ type: "thinking", creatorId: id, from: t.from === "brand" ? "creator" : "brand" });
            }
          } catch (e) {
            failed = true;
            send({ type: "error", creatorId: id, message: e instanceof Error ? e.message : String(e) });
          }
          const outcome = failed ? "failed" : last?.status === "accept" ? "agreed" : last?.status === "walk" ? "walked" : "no-deal";
          send({ type: "done", creatorId: id, outcome, terms: last?.terms });
        }),
      );
      // Let a slow Research call report before the stream ends; if it still has not, say so.
      await Promise.race([research, sleep(20000)]);
      if (!researchDone) send({ type: "research", status: "error", content: null, sources: [], error: "did not return in time" });
      send({ type: "end" });
      finish();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
