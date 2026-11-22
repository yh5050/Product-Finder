import { describe, expect, it } from "vitest";
import { brandSystem, creatorSystem, enforce, negotiateLive, parseTurn, type BrandBrief, type Turn } from "@/lib/agents";
import { campaignTerms, defaultCampaign, mayaApplicant, OTHERS, PRODUCT_PITCH } from "@/lib/data";
import { privateLimits } from "@/lib/private";
import { scriptFor } from "@/lib/scripts";
import type { Evidence, ResearchResult } from "@/lib/youcom";

const opening = campaignTerms(defaultCampaign);
const MAX = 225; // differs from any figure in the creators' private notes
const brief: BrandBrief = { brand: "Halden Works", product: "Halden Loop 65", pitch: PRODUCT_PITCH, type: "owned", opening, maxFee: MAX };
const maya = mayaApplicant("v1");
const mayaLimits = privateLimits("maya");
const limits = { brandMax: MAX, creatorMin: mayaLimits.minFee };

const evidence: Evidence[] = [
  { title: "Compact boards", url: "https://a.com/1", snippet: "65% layouts are popular" },
  { title: "Mac pairing", url: "https://a.com/2", snippet: "Bluetooth on macOS" },
];

function turnInput(over: Record<string, unknown> = {}) {
  return { text: "ok", fee: 180, deliverable: "video", deadline: "14 days after delivery", usageRights: "Brand organic social, 90 days", payment: "Net 30 after the brand approves the video", keepSample: true, status: "counter", cites: [], usedResearch: false, ...over };
}

// A stand-in for the Anthropic client that replays tool inputs in order and records the prompts it was given.
function fakeClient(inputs: Record<string, unknown>[]) {
  const systems: string[] = [];
  let i = 0;
  const client = {
    messages: {
      create: async (req: { system: string }) => {
        systems.push(req.system);
        const input = inputs[Math.min(i++, inputs.length - 1)];
        return { content: [{ type: "tool_use", id: "t", name: "send_turn", input }] };
      },
    },
  };
  return { client: client as never, systems };
}

const off = () => Promise.resolve<ResearchResult>({ status: "off", content: null, sources: [] });

describe("parseTurn", () => {
  it("keeps only cited numbers that point at evidence the agent was given", () => {
    const t = parseTurn(turnInput({ cites: [1, 1, 5, -1, 0.5, "0"] }), "brand", evidence, opening);
    expect(t.sources).toEqual([evidence[1]]);
  });

  it("falls back to counter for an unknown status", () => {
    expect(parseTurn(turnInput({ status: "maybe" }), "creator", evidence, opening).status).toBe("counter");
  });

  it("keeps the terms on the table when the agent leaves a field out", () => {
    const onTable = { ...opening, fee: 170 };
    expect(parseTurn({ text: "sure", status: "counter", cites: [] }, "creator", [], onTable).terms).toEqual(onTable);
  });
});

describe("prompts", () => {
  it("keep each side's private limit on its own side", () => {
    const brand = brandSystem(brief, maya, evidence, null);
    const creator = creatorSystem(maya, mayaLimits, evidence);
    expect(brand).toContain(`$${MAX}`);
    expect(brand).not.toContain(`$${mayaLimits.minFee}`);
    expect(brand).not.toContain(mayaLimits.priorities);
    expect(creator).toContain(`$${mayaLimits.minFee}`);
    expect(creator).not.toContain(`$${MAX}`);
  });

  it("number the live evidence and say so when there is none", () => {
    expect(brandSystem(brief, maya, evidence, null)).toContain("[1] Mac pairing");
    expect(creatorSystem(maya, mayaLimits, [])).toContain("No live web evidence");
  });
});

describe("negotiateLive", () => {
  it("alternates sides, stops on accept, and attaches cited sources", async () => {
    const { client } = fakeClient([turnInput({ status: "offer", fee: 150, cites: [0] }), turnInput({ status: "counter" }), turnInput({ status: "accept", cites: [1] })]);
    const turns: Turn[] = [];
    for await (const t of negotiateLive(brief, maya, mayaLimits, { brandEvidence: evidence, creatorEvidence: [], research: off() }, client)) turns.push(t);
    expect(turns.map((t) => t.from)).toEqual(["brand", "creator", "brand"]);
    expect(turns.map((t) => t.status)).toEqual(["offer", "counter", "accept"]);
    expect(turns[0].sources).toEqual([evidence[0]]);
    expect(turns[2].sources).toEqual([evidence[1]]);
  });

  it("gives the brand agent the Research answer for its later offers", async () => {
    const { client, systems } = fakeClient([turnInput({ status: "offer", fee: 150 }), turnInput({ status: "counter" }), turnInput({ status: "accept", usedResearch: true })]);
    const research = Promise.resolve<ResearchResult>({ status: "live", content: { recommendation: "counter at $175" }, sources: [] });
    const turns: Turn[] = [];
    for await (const t of negotiateLive(brief, maya, mayaLimits, { brandEvidence: evidence, creatorEvidence: [], research }, client)) turns.push(t);
    expect(systems[0]).not.toContain("counter at $175");
    expect(systems[2]).toContain("counter at $175");
    expect(turns[2].usedResearch).toBe(true);
    expect(turns[0].usedResearch).toBeUndefined();
  });

  it("does not wait forever for a Research call that never returns", async () => {
    const { client, systems } = fakeClient([turnInput({ status: "offer", fee: 150 }), turnInput({ status: "counter" }), turnInput({ status: "accept" })]);
    const turns: Turn[] = [];
    const never = new Promise<ResearchResult>(() => undefined);
    for await (const t of negotiateLive(brief, maya, mayaLimits, { brandEvidence: evidence, creatorEvidence: [], research: never, researchWaitMs: 20 }, client)) turns.push(t);
    expect(turns).toHaveLength(3);
    expect(systems[2]).not.toContain("You.com Research");
  });

  it("stops after the turn limit when nobody accepts", async () => {
    const { client } = fakeClient([turnInput({ status: "counter" })]);
    const turns: Turn[] = [];
    for await (const t of negotiateLive(brief, maya, mayaLimits, { brandEvidence: [], creatorEvidence: [], research: off() }, client, 4)) turns.push(t);
    expect(turns).toHaveLength(4);
  });
});

describe("enforce", () => {
  const t = (from: "brand" | "creator", status: Turn["status"], fee: number, extra: Partial<Turn["terms"]> = {}, text = "ok"): Turn =>
    ({ from, status, text, sources: [], terms: { ...opening, fee, ...extra } });

  it("makes an accept take the other side's latest terms exactly", () => {
    const ask = t("creator", "counter", 190, { payment: "Within 7 days of approval", deadline: "14 days after delivery" });
    const out = enforce(t("brand", "accept", 190, { deliverable: "reworded" }), limits, [t("brand", "offer", 150), ask]);
    expect(out.status).toBe("accept");
    expect(out.terms).toEqual(ask.terms);
  });

  it("turns an accept with nothing to accept into an offer", () => {
    expect(enforce(t("brand", "accept", 150), limits, []).status).toBe("offer");
  });

  it("keeps the brand at or under its maximum, even when accepting", () => {
    const over = enforce(t("brand", "counter", MAX + 100), limits, [t("brand", "offer", 150), t("creator", "counter", 400)]);
    expect(over.terms.fee).toBe(MAX);
    const accept = enforce(t("brand", "accept", 260), limits, [t("brand", "offer", 150), t("creator", "counter", 260)]);
    expect(accept.status).toBe("counter");
    expect(accept.terms.fee).toBe(MAX);
  });

  it("changes the figure in the message when it changes the fee", () => {
    const over = enforce(t("brand", "counter", 260, {}, "We can do $260."), limits, [t("brand", "offer", 150), t("creator", "counter", 300)]);
    expect(over.text).toBe(`We can do $${MAX}.`);
    const low = enforce(t("creator", "counter", 120, {}, "I could do $120."), limits, [t("brand", "offer", 150)]);
    expect(low.text).toBe(`I could do $${mayaLimits.minFee}.`);
  });

  it("never lets the creator accept or ask below its minimum", () => {
    const accept = enforce(t("creator", "accept", 150), limits, [t("brand", "offer", 150)]);
    expect(accept.status).toBe("counter");
    expect(accept.terms.fee).toBe(mayaLimits.minFee);
  });

  it("hides a private limit that slips into the chat, unless it is the fee on the table", () => {
    const brand = enforce(t("brand", "counter", 175, {}, `I can go up to $${MAX} but let's say $175.`), limits, [t("brand", "offer", 150), t("creator", "counter", 210)]);
    expect(brand.text).not.toContain(`$${MAX}`);
    expect(brand.text).toContain("$175");
    const creator = enforce(t("creator", "counter", 210, {}, `My floor is $${mayaLimits.minFee}, so $210.`), limits, [t("brand", "offer", 150)]);
    expect(creator.text).not.toContain(`$${mayaLimits.minFee}`);
  });
});

describe("replay scripts", () => {
  it("end in an accept, carry no live sources, and stay within the brand's cap", () => {
    for (const id of ["maya", ...OTHERS.map((o) => o.id)]) {
      const s = scriptFor(id, opening, "Halden Works", "Halden Loop 65", 160);
      expect(s.at(-1)!.status).toBe("accept");
      expect(s.every((t) => t.sources.length === 0)).toBe(true);
      expect(s.filter((t) => t.from === "brand").every((t) => t.terms.fee <= 160)).toBe(true);
    }
  });
});
