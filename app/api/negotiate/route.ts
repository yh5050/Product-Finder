import { MAYA_BASE, OTHERS, VIDEOS, type Applicant, type Terms } from "@/lib/data";
import { negotiateLive, type BrandBrief } from "@/lib/agents";
import { replay, type NegotiationEvent, type Turn } from "@/lib/scripts";
import { youSearch } from "@/lib/youcom";

export const dynamic = "force-dynamic";

type Body = {
  brand: string;
  product: string;
  type: "owned" | "sponsored";
  opening: Terms;
  maxFee: number;
  creatorIds: string[];
  mayaVideo?: string;
  mock?: boolean;
};

function applicant(id: string, mayaVideo?: string): Applicant | undefined {
  if (id === "maya") {
    const v = VIDEOS[mayaVideo ?? "v1"] ?? VIDEOS.v1;
    return { ...MAYA_BASE, note: "", video: v, fit: v.fit };
  }
  return OTHERS.find((o) => o.id === id);
}

// Streams brand-agent ↔ creator-agent negotiations for the shortlisted creators in parallel (NDJSON).
export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  const live = !body.mock && Boolean(process.env.ANTHROPIC_API_KEY);
  const ids = (body.creatorIds ?? []).filter((id) => applicant(id, body.mayaVideo));
  const opening = { ...body.opening, fee: Number(body.opening?.fee) || 0 };
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: NegotiationEvent) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      send({ type: "mode", live });

      if (!live) {
        await replay(ids, opening, body.brand, body.product, send, Number(body.maxFee) || Infinity);
        controller.close();
        return;
      }

      const brief: BrandBrief = {
        brand: body.brand,
        product: body.product,
        pitch: "Compact 65% wireless mechanical keyboard with hot-swappable switches, for macOS and Windows.",
        type: body.type,
        opening,
        maxFee: Number(body.maxFee) || opening.fee,
      };
      await Promise.all(
        ids.map(async (id) => {
          const c = applicant(id, body.mayaVideo)!;
          send({ type: "thinking", creatorId: id, from: "brand" });
          let last: Turn | undefined;
          try {
            const evidence = await youSearch(`${c.handle} ${c.niche[0]} keyboard`, 2);
            for await (const t of negotiateLive(brief, c, evidence)) {
              send({ type: "turn", creatorId: id, turn: t });
              last = t;
              if (t.status !== "accept" && t.status !== "walk")
                send({ type: "thinking", creatorId: id, from: t.from === "brand" ? "creator" : "brand" });
            }
          } catch (e) {
            send({ type: "error", creatorId: id, message: e instanceof Error ? e.message : String(e) });
          }
          send({ type: "done", creatorId: id, outcome: last?.status === "accept" ? "agreed" : "no-deal", terms: last?.terms });
        }),
      );
      send({ type: "end" });
      controller.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" } });
}
