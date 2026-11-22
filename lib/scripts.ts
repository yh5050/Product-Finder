import type { Terms } from "./data";
import type { Evidence, LiveStatus } from "./youcom";

export type Turn = {
  from: "brand" | "creator";
  text: string;
  terms: Terms;
  status: "offer" | "counter" | "accept" | "walk";
  /** The live evidence the agent says this message relied on. Replay turns have none. */
  sources: Evidence[];
  usedResearch?: boolean;
};

export type ResearchEvent = { status: LiveStatus; content: Record<string, unknown> | null; sources: Evidence[]; error?: string; seconds?: number };

/** Events streamed by /api/negotiate (and replayed locally when no server is available). */
export type NegotiationEvent =
  | { type: "mode"; live: boolean }
  | { type: "thinking"; creatorId: string; from: "brand" | "creator" }
  | { type: "turn"; creatorId: string; turn: Turn }
  | { type: "done"; creatorId: string; outcome: "agreed" | "no-deal" | "walked" | "failed"; terms?: Terms }
  | { type: "error"; creatorId: string; message: string }
  | ({ type: "research" } & ResearchEvent)
  | { type: "creatorEvidence"; status: LiveStatus; results: Evidence[]; error?: string }
  | { type: "notice"; message: string }
  | { type: "fatal"; message: string }
  | { type: "end" };

const addDays = (deadline: string, extra: number) => {
  const n = parseInt(deadline, 10);
  return Number.isFinite(n) ? `${n + extra} days after delivery` : deadline;
};

/** Scripted negotiations used when no Anthropic key is set, so the demo always runs. */
export function scriptFor(creatorId: string, base: Terms, brand: string, product: string, maxFee = Infinity): Turn[] {
  const f = base.fee;
  if (creatorId === "maya") {
    const ask = { ...base, fee: f + 50, deadline: addDays(base.deadline, 4) };
    const meet = { ...ask, fee: Math.max(f, Math.min(f + 25, maxFee)) };
    return [
      { sources: [], from: "brand", status: "offer", terms: base, text: `Hi Maya! Your first-60-seconds video is exactly the format we want for the ${product}. $${f} flat, you keep the board. Quick question: how many of your viewers are on a Mac?` },
      { sources: [], from: "creator", status: "counter", terms: ask, text: `About 70%, so I’d open with Bluetooth pairing to a MacBook, then a sound test. Since ${brand} can reuse the video, my rate is $${f + 50}, and I need 4 extra days to finish another shoot.` },
      { sources: [], from: "brand", status: "counter", terms: meet, text: `Love the Mac angle, and the extra days work. Can we meet at $${meet.fee}?` },
      { sources: [], from: "creator", status: "accept", terms: meet, text: `Deal at $${meet.fee} with the extra 4 days. I’ll send a shot list once Maya signs off.` },
    ];
  }
  if (creatorId === "jon") {
    const ask = { ...base, deadline: addDays(base.deadline, 2), deliverable: `${base.deliverable}; may mention one honest con` };
    return [
      { sources: [], from: "brand", status: "offer", terms: base, text: `Hey Jon, your MacBook desk video caught our eye. $${f} for a first-impressions video, you keep the board. Would you A/B the sound against your current keyboard?` },
      { sources: [], from: "creator", status: "counter", terms: ask, text: `Yes, same mic and desk, side by side. $${f} works if I can name one honest con on camera and get 2 extra days.` },
      { sources: [], from: "brand", status: "accept", terms: ask, text: "Honest takes are why we picked you. One con and 2 extra days, agreed." },
    ];
  }
  const ask = { ...base, payment: "Within 7 days of approval" };
  return [
    { sources: [], from: "brand", status: "offer", terms: base, text: `Hi Tess! Your quiet-office video is the use case we want. $${f}, 45–60 seconds, keep the board. What would you show in the first 3 seconds?` },
    { sources: [], from: "creator", status: "counter", terms: ask, text: "A close-up of the switches in a silent office, then the sound test. Terms look good. Could payment land within 7 days of approval instead of net 30?" },
    { sources: [], from: "brand", status: "accept", terms: ask, text: "Absolutely, 7-day payment after approval. Welcome aboard!" },
  ];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Plays the scripted negotiations as a stream of events, for one or more creators in parallel. */
export async function replay(
  creatorIds: string[],
  base: Terms,
  brand: string,
  product: string,
  send: (e: NegotiationEvent) => void,
  maxFee = Infinity,
  speed = 1,
) {
  await Promise.all(
    creatorIds.map(async (id, idx) => {
      send({ type: "thinking", creatorId: id, from: "brand" });
      await sleep((400 + idx * 350) * speed);
      let last: Turn | undefined;
      for (const t of scriptFor(id, base, brand, product, maxFee)) {
        await sleep((1100 + Math.min(t.text.length * 10, 1400)) * speed);
        send({ type: "turn", creatorId: id, turn: t });
        last = t;
        if (t.status !== "accept") send({ type: "thinking", creatorId: id, from: t.from === "brand" ? "creator" : "brand" });
      }
      send({ type: "done", creatorId: id, outcome: last?.status === "accept" ? "agreed" : "no-deal", terms: last?.terms });
    }),
  );
  send({ type: "end" });
}
