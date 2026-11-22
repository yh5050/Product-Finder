import { mentions } from "./text";
import type { Evidence, LiveStatus } from "./youcom";

// Pure rubric logic, safe to run in the browser (the static GitHub Pages build screens with it).
// The catalog of criteria a rubric can use. `web` terms are looked for in today's search results; `video` terms
// are matched against an applicant's video titles and tags. Keeping the catalog fixed keeps scoring checkable.
export const CATALOG = [
  { id: "sound", label: "Typing sound and noise level", web: ["sound", "noise", "quiet", "silent", "loud", "decibel", "db", "thock", "clack"],
    video: ["sound test", "quiet", "silent", "noise", "asmr", "thock"] },
  { id: "shared", label: "Shared spaces and late-night use", web: ["roommate", "office", "shared", "late-night", "late night", "partner", "calls", "meeting", "bedroom"],
    video: ["roommates", "shared apartment", "shared bedroom", "late-night", "partner", "calls"] },
  { id: "switches", label: "Switch type and feel", web: ["linear", "tactile", "switch", "lubed", "lube"],
    video: ["switches", "linear", "lubed", "tactile"] },
  { id: "hotswap", label: "Hot-swap and customization", web: ["hot-swap", "hotswap", "hot swap", "keycap", "custom", "mod"],
    video: ["hot-swap", "keycaps"] },
  { id: "compat", label: "Mac and wireless compatibility", web: ["mac", "macos", "bluetooth", "wireless", "2.4", "multi-device"],
    video: ["mac", "wireless", "bluetooth"] },
  { id: "layout", label: "Layout and size", web: ["75%", "65%", "compact", "tkl", "layout"],
    video: ["75%", "65%", "compact"] },
  { id: "build", label: "Build quality and materials", web: ["aluminum", "aluminium", "gasket", "build quality", "plastic", "metal"],
    video: ["aluminum", "gasket"] },
  { id: "value", label: "Price and value", web: ["price", "budget", "value", "affordable", "cheap", "under $"],
    video: ["budget", "value"] },
  { id: "setup", label: "Desk setup context", web: ["desk setup", "workspace", "home office", "wfh", "setup"],
    video: ["desk setup", "home office"] },
  { id: "battery", label: "Battery life", web: ["battery"], video: ["battery"] },
  { id: "firstlook", label: "Unboxing and first impressions", web: ["unboxing", "first impressions", "out of the box", "first look"],
    video: ["first impressions", "unboxing"] },
] as const;

export type CriterionId = (typeof CATALOG)[number]["id"];

export type Criterion = {
  id: CriterionId;
  label: string;
  weight: number; // weights of a rubric sum to 1
  why: string;
  evidence: Evidence[];
  videoTerms: readonly string[];
};

export type Rubric = {
  criteria: Criterion[];
  // llm: a model picked catalog criteria from the evidence; keyword: term counts over the evidence;
  // baseline: no live evidence was available, so a fixed starting rubric is used and labeled as such.
  method: "llm" | "keyword" | "baseline";
  status: LiveStatus;
  evidenceCount: number;
  note?: string;
};

export const MAX_CRITERIA = 6;

function textOf(e: Evidence) {
  return ` ${e.title} ${e.snippet} `.toLowerCase();
}

function normalize<T extends { weight: number }>(list: T[]): T[] {
  const total = list.reduce((s, c) => s + c.weight, 0);
  return total > 0 ? list.map((c) => ({ ...c, weight: Math.round((c.weight / total) * 1000) / 1000 })) : list;
}

// Counts how many search results mention each catalog criterion and weights criteria by that count.
export function keywordRubric(evidence: Evidence[], status: LiveStatus): Rubric {
  const scored = CATALOG.map((c) => {
    const hits = evidence.filter((e) => c.web.some((t) => mentions(textOf(e), t)));
    return { c, hits };
  })
    .filter((x) => x.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length)
    .slice(0, MAX_CRITERIA);
  if (!scored.length) return baselineRubric(status, "Today's results named none of the catalog criteria.");
  const criteria = normalize(
    scored.map(({ c, hits }) => ({
      id: c.id,
      label: c.label,
      weight: hits.length,
      why: `Mentioned in ${hits.length} of ${evidence.length} results from today's search.`,
      evidence: hits.slice(0, 3),
      videoTerms: c.video,
    })),
  );
  return { criteria, method: "keyword", status, evidenceCount: evidence.length };
}

export function baselineRubric(status: LiveStatus, note: string): Rubric {
  const ids: CriterionId[] = ["compat", "layout", "hotswap", "sound", "firstlook"];
  const criteria = ids.map((id) => {
    const c = CATALOG.find((x) => x.id === id)!;
    return { id, label: c.label, weight: 1 / ids.length, why: "Starting criterion (no live web evidence).", evidence: [], videoTerms: c.video };
  });
  return { criteria, method: "baseline", status, evidenceCount: 0, note };
}

export type Picked = { id: string; weight: number; why: string; evidence: number[] };

// Turns the model's picks into a rubric, keeping only catalog ids and evidence indices that exist. A pick with
// no valid evidence is dropped: every criterion must point at something from today's web.
export function rubricFromPicks(picks: Picked[], evidence: Evidence[], status: LiveStatus): Rubric | null {
  const seen = new Set<string>();
  const criteria: Criterion[] = [];
  for (const p of picks) {
    const c = CATALOG.find((x) => x.id === p.id);
    if (!c || seen.has(c.id)) continue;
    const ev = (p.evidence ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < evidence.length).map((i) => evidence[i]);
    if (!ev.length) continue;
    seen.add(c.id);
    criteria.push({ id: c.id, label: c.label, weight: Math.max(0.1, Number(p.weight) || 1), why: String(p.why ?? "").slice(0, 200), evidence: ev.slice(0, 3), videoTerms: c.video });
  }
  if (!criteria.length) return null;
  return { criteria: normalize(criteria.slice(0, MAX_CRITERIA)), method: "llm", status, evidenceCount: evidence.length };
}
