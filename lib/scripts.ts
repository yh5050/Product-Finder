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
  const cap = (n: number) => Math.max(f, Math.min(n, maxFee));
  if (creatorId === "maya") {
    const ask = { ...base, fee: f + 60, deadline: addDays(base.deadline, 4) };
    const b1 = { ...base, fee: cap(f + 15) };
    const ask2 = { ...base, fee: f + 40, deadline: addDays(base.deadline, 3) };
    const meet = { ...base, fee: cap(f + 25), deadline: addDays(base.deadline, 3) };
    return [
      { sources: [], from: "brand", status: "offer", terms: base, text: `Hi Maya! Your first-60-seconds video is exactly the format we want for the ${product}. $${f} flat, you keep the board. How many of your viewers are on a Mac?` },
      { sources: [], from: "creator", status: "counter", terms: ask, text: `About 70%, so I’d open with Bluetooth pairing to a MacBook, then a sound test. ${brand} can reuse the video, so my rate is $${f + 60}, and I need 4 extra days for another shoot.` },
      { sources: [], from: "brand", status: "counter", terms: b1, text: `The Mac opening is great. We can move to $${b1.fee}, but launch week needs the original deadline.` },
      { sources: [], from: "creator", status: "counter", terms: ask2, text: `I can trim the shoot to 3 extra days. Meet me at $${f + 40} and I’ll add a 15-second cut for Stories.` },
      { sources: [], from: "brand", status: "counter", terms: meet, text: `3 extra days works with the Stories cut. Final from our side: $${meet.fee}.` },
      { sources: [], from: "creator", status: "accept", terms: meet, text: `Deal at $${meet.fee}, 3 extra days, Stories cut included. Sending to Maya to sign off.` },
    ];
  }
  if (creatorId === "jon") {
    const con = `${base.deliverable}; may mention one honest con`;
    const ask = { ...base, fee: f + 30, deadline: addDays(base.deadline, 2), deliverable: con };
    const b1 = { ...base, deadline: addDays(base.deadline, 2), deliverable: con };
    const ask2 = { ...b1, fee: cap(f + 15) };
    return [
      { sources: [], from: "brand", status: "offer", terms: base, text: `Hey Jon, your MacBook desk video caught our eye. $${f} for a first-impressions video, you keep the board. Would you A/B the sound against your current keyboard?` },
      { sources: [], from: "creator", status: "counter", terms: ask, text: `Same mic, same desk, side by side. I need to name one honest con on camera, 2 extra days, and $${f + 30} for the A/B edit.` },
      { sources: [], from: "brand", status: "counter", terms: b1, text: `Honest takes are why we picked you, so the con and 2 extra days are fine. The fee stays at $${f} for now.` },
      { sources: [], from: "creator", status: "counter", terms: ask2, text: `Meet me at $${ask2.fee} and I’ll add a latency test over Bluetooth. That’s what my audience asks about first.` },
      { sources: [], from: "brand", status: "accept", terms: ask2, text: `A latency test is worth it. $${ask2.fee}, one con, 2 extra days. Agreed.` },
    ];
  }
  const ask = { ...base, payment: "Within 7 days of approval" };
  const b1 = { ...ask, deliverable: `${base.deliverable}; plus a 15-second cut` };
  return [
    { sources: [], from: "brand", status: "offer", terms: base, text: `Hi Tess! Your quiet-office video is the use case we want. $${f}, 45–60 seconds, keep the board. What would you show in the first 3 seconds?` },
    { sources: [], from: "creator", status: "counter", terms: ask, text: "A close-up of the switches in a silent office, then the sound test. Could payment land within 7 days of approval instead of net 30?" },
    { sources: [], from: "brand", status: "counter", terms: b1, text: "7-day payment works if you also deliver a 15-second cut for ads in shared-office feeds." },
    { sources: [], from: "creator", status: "accept", terms: b1, text: "Easy, I’ll shoot both in one session. Paid within 7 days, two cuts. Welcome aboard!" },
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
