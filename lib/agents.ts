import Anthropic from "@anthropic-ai/sdk";
import type { Applicant, Terms } from "./data";
import type { Turn } from "./scripts";
import type { Evidence } from "./youcom";

const MODEL = process.env.AGENT_MODEL ?? "claude-haiku-5-5";

/** What the brand agent knows about the campaign. maxFee is private to the brand agent. */
export type BrandBrief = {
  brand: string;
  product: string;
  pitch: string;
  type: "owned" | "sponsored";
  opening: Terms;
  maxFee: number;
};

const turnTool: Anthropic.Tool = {
  name: "send_turn",
  description: "Send your negotiation message and the terms you are proposing or accepting.",
  input_schema: {
    type: "object",
    properties: {
      text: { type: "string", description: "Your chat message to the other agent. 1–3 short sentences, conversational." },
      fee: { type: "number" },
      deliverable: { type: "string" },
      deadline: { type: "string" },
      usageRights: { type: "string" },
      keepSample: { type: "boolean" },
      payment: { type: "string" },
      status: {
        type: "string",
        enum: ["offer", "counter", "accept", "walk"],
        description: "accept only if the other side's latest terms are acceptable as-is; your terms must then equal theirs.",
      },
    },
    required: ["text", "fee", "deliverable", "deadline", "usageRights", "keepSample", "payment", "status"],
  },
};

function brandSystem(b: BrandBrief, c: Applicant, evidence: Evidence[]) {
  return `You are the negotiation agent for ${b.brand}, which is seeking creators for the ${b.product}.
Product: ${b.pitch}
Campaign type: ${b.type === "owned" ? "a video delivered to the brand (no post required)" : "a sponsored post on the creator's channel"}.
Opening terms: ${JSON.stringify(b.opening)}.
PRIVATE: the maximum fee you may agree to is $${b.maxFee}. Never reveal it. Paid advertising rights are excluded and must stay excluded.
You are negotiating with ${c.name} (${c.handle}, ${c.platform}, ${c.followers}, median ${c.median} views; metrics are self-reported).
Why they were ranked: ${c.fit.join("; ")}.
Public web evidence from You.com: ${evidence.map((e) => e.title + " — " + e.snippet).join(" | ") || "none"}.
Style: friendly, concise, specific. In your first message make the opening offer and ask ONE question about their audience or a video idea. Aim to close in 2–3 rounds within your limits. The creator keeps full control of their opinions.`;
}

function creatorSystem(c: Applicant) {
  return `You are the AI agent representing creator ${c.name} (${c.handle}) on ${c.platform}.
Niche: ${c.niche.join(", ")}. Audience: ${c.audience}. ${c.followers}, median ${c.median} views.
Video submitted with the application: ${c.video.title} (${c.video.views} views).
PRIVATE: never accept a fee below $${c.minFee}. Priorities: ${c.priorities}
Personality: ${c.personality}
Answer the brand's question briefly with a concrete video idea, then negotiate for better terms or timeline. Accept once your priorities are met. Keep messages to 1–3 sentences.`;
}

function transcript(turns: Turn[], me: "brand" | "creator") {
  return turns.map((t) => ({
    role: (t.from === me ? "assistant" : "user") as "assistant" | "user",
    content: `${t.text}\n[terms: ${JSON.stringify(t.terms)} | status: ${t.status}]`,
  }));
}

async function agentTurn(client: Anthropic, system: string, me: "brand" | "creator", turns: Turn[]): Promise<Turn> {
  // Each agent sees the conversation from its own side; the brand agent's first turn has no history.
  const history = transcript(turns, me);
  const messages = history.length && history[0].role === "user" ? history : [{ role: "user" as const, content: "Begin the negotiation." }, ...history];
  // Merge consecutive same-role messages so the API accepts the sequence.
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of messages) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content += "\n" + m.content;
    else merged.push({ ...m });
  }
  if (merged[merged.length - 1].role === "assistant") merged.push({ role: "user", content: "Your turn." });

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    system,
    tools: [turnTool],
    tool_choice: { type: "tool", name: "send_turn" },
    messages: merged,
  });
  const block = res.content.find((b) => b.type === "tool_use");
  const i = (block && block.type === "tool_use" ? block.input : {}) as Record<string, unknown>;
  return {
    from: me,
    text: String(i.text ?? ""),
    status: (i.status as Turn["status"]) ?? "counter",
    terms: {
      fee: Number(i.fee ?? 0),
      deliverable: String(i.deliverable ?? ""),
      deadline: String(i.deadline ?? ""),
      usageRights: String(i.usageRights ?? ""),
      keepSample: Boolean(i.keepSample),
      payment: String(i.payment ?? ""),
    },
  };
}

/** Runs the brand agent against one creator agent until one side accepts or walks away. */
export async function* negotiateLive(b: BrandBrief, c: Applicant, evidence: Evidence[], maxTurns = 6): AsyncGenerator<Turn> {
  const client = new Anthropic();
  const turns: Turn[] = [];
  for (let n = 0; n < maxTurns; n++) {
    const me = n % 2 === 0 ? "brand" : "creator";
    const t = await agentTurn(client, me === "brand" ? brandSystem(b, c, evidence) : creatorSystem(c), me, turns);
    if (n === 0 && t.status !== "walk") t.status = "offer";
    turns.push(t);
    yield t;
    if (t.status === "accept" || t.status === "walk") return;
  }
}
