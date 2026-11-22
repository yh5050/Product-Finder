import Anthropic from "@anthropic-ai/sdk";
import { baselineRubric, CATALOG, keywordRubric, MAX_CRITERIA, rubricFromPicks, type Picked, type Rubric } from "./rubric";
import type { Evidence, LiveStatus } from "./youcom";

// Server only: lets the model choose the rubric's criteria from today's You.com evidence.
const rubricTool: Anthropic.Tool = {
  name: "set_rubric",
  description: "Pick the criteria that today's evidence says buyers and reviewers care about, with weights and the evidence behind each.",
  input_schema: {
    type: "object",
    properties: {
      criteria: {
        type: "array",
        maxItems: MAX_CRITERIA,
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: CATALOG.map((c) => c.id) },
            weight: { type: "number", description: "Relative importance, 1 to 10." },
            why: { type: "string", description: "One sentence on what the evidence says, under 25 words." },
            evidence: { type: "array", items: { type: "integer" }, description: "Indices of the evidence items that support this criterion." },
          },
          required: ["id", "weight", "why", "evidence"],
        },
      },
    },
    required: ["criteria"],
  },
};

export async function buildRubric(product: string, evidence: Evidence[], status: LiveStatus, client?: Anthropic): Promise<Rubric> {
  if (!evidence.length) return baselineRubric(status, status === "off" ? "You.com is off (no API key)." : "You.com returned no usable results.");
  if (!client) return keywordRubric(evidence, status);
  try {
    const list = evidence.map((e, i) => `[${i}] ${e.title}: ${e.snippet}`).join("\n");
    const res = await client.messages.create({
      model: process.env.AGENT_MODEL ?? "claude-haiku-5-5",
      max_tokens: 800,
      tools: [rubricTool],
      tool_choice: { type: "tool", name: "set_rubric" },
      messages: [{ role: "user", content: `A brand is screening creators to review the ${product}. From this evidence pulled from today's web, choose up to ${MAX_CRITERIA} criteria that matter most to buyers and reviewers right now. Use only what the evidence supports.\n\n${list}` }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    const picks = block && block.type === "tool_use" ? ((block.input as { criteria?: Picked[] }).criteria ?? []) : [];
    return rubricFromPicks(picks, evidence, status) ?? { ...keywordRubric(evidence, status), note: "The model's picks had no valid evidence; keyword counts used instead." };
  } catch (e) {
    return { ...keywordRubric(evidence, status), note: `Model unavailable (${e instanceof Error ? e.message : String(e)}); keyword counts used.` };
  }
}
