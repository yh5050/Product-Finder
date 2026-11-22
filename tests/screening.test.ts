import { describe, expect, it } from "vitest";
import { baselineRubric, keywordRubric, rubricFromPicks } from "@/lib/rubric";
import { applicantPool, POOL_SIZE, scoreCreator, screen, SHORTLIST } from "@/lib/screening";
import type { Evidence } from "@/lib/youcom";

const ev = (title: string, snippet: string, url = `https://example.com/${encodeURIComponent(title)}`): Evidence => ({ title, url, snippet });
const evidence: Evidence[] = [
  ev("Best compact keyboards of 2026", "A 65% layout with hot-swap sockets and quiet linear switches."),
  ev("Best keyboard for Mac", "Bluetooth pairing on macOS and multi-device wireless switching."),
  ev("Unboxing the newest 65% boards", "First impressions out of the box, plus a typing sound test."),
  ev("Budget picks", "Good value boards under $100 with decent build quality."),
];
const named = ["maya", "jon", "tess"];

describe("applicant pool", () => {
  it("has 1,000 applicants with unique ids and is the same on every run", () => {
    const a = applicantPool(true);
    expect(a).toHaveLength(POOL_SIZE);
    expect(new Set(a.map((c) => c.id)).size).toBe(POOL_SIZE);
    expect(a.map((c) => c.handle)).toEqual(applicantPool(true).map((c) => c.handle));
  });

  it("adds Maya only once she applies, without changing anyone else", () => {
    const before = applicantPool(false);
    const after = applicantPool(true);
    expect(before.map((c) => c.id)).not.toContain("maya");
    expect(after.map((c) => c.id)).toContain("maya");
    expect(before.filter((_, i) => i !== 137).map((c) => c.handle)).toEqual(after.filter((_, i) => i !== 137).map((c) => c.handle));
  });

  it("gives no generated applicant three keyboard videos in the last 90 days", () => {
    for (const c of applicantPool(true).filter((c) => !named.includes(c.id))) {
      expect(c.portfolio.filter((v) => v.daysAgo <= 90 && v.tags.includes("keyboard")).length).toBeLessThan(3);
    }
  });
});

describe("rubric", () => {
  it("weights criteria by how many results mention them, and keeps the evidence", () => {
    const r = keywordRubric(evidence, "live");
    expect(r.method).toBe("keyword");
    expect(r.criteria.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 2);
    for (const c of r.criteria) expect(c.evidence.length).toBeGreaterThan(0);
    expect(r.criteria.map((c) => c.id)).toContain("layout");
  });

  it("falls back to labeled starting criteria when there is no evidence", () => {
    const r = keywordRubric([], "empty");
    expect(r.method).toBe("baseline");
    expect(r.criteria.every((c) => c.evidence.length === 0)).toBe(true);
  });

  it("drops model picks that are not in the catalog or cite evidence that does not exist", () => {
    const r = rubricFromPicks(
      [
        { id: "layout", weight: 8, why: "Compact layouts lead", evidence: [0, 99] },
        { id: "made-up", weight: 5, why: "x", evidence: [1] },
        { id: "battery", weight: 3, why: "no evidence", evidence: [42] },
      ],
      evidence,
      "live",
    );
    expect(r!.criteria.map((c) => c.id)).toEqual(["layout"]);
    expect(r!.criteria[0].evidence).toEqual([evidence[0]]);
  });
});

describe("screening", () => {
  it("keeps the top 100 by score and picks finalists that meet every requirement", () => {
    const result = screen(applicantPool(true), keywordRubric(evidence, "live"));
    expect(result.total).toBe(POOL_SIZE);
    expect(result.shortlist).toHaveLength(SHORTLIST);
    for (let i = 1; i < result.shortlist.length; i++) expect(result.shortlist[i - 1].score).toBeGreaterThanOrEqual(result.shortlist[i].score);
    for (const f of result.finalists) expect(f.gates).toEqual({ shipsToUS: true, vertical: true, threeRecent: true, followerMin: true });
  });

  it("puts the three named creators through with live and starting criteria, Maya only after she applies", () => {
    for (const rubric of [keywordRubric(evidence, "live"), baselineRubric("off", "test")]) {
      expect(screen(applicantPool(true), rubric).finalists.map((f) => f.creator.id).sort()).toEqual(["jon", "maya", "tess"]);
      expect(screen(applicantPool(false), rubric).finalists.map((f) => f.creator.id).sort()).toEqual(["jon", "tess"]);
    }
  });

  it("applies a sponsored post's follower minimum", () => {
    const ids = screen(applicantPool(true), baselineRubric("off", "t"), 15000).finalists.map((f) => f.creator.id);
    expect(ids).not.toContain("tess"); // 8.9K followers
    expect(ids).toContain("maya");
  });

  it("ignores videos older than 90 days", () => {
    const rubric = keywordRubric(evidence, "live");
    const maya = applicantPool(true).find((c) => c.id === "maya")!;
    const old = { ...maya, portfolio: maya.portfolio.map((v) => ({ ...v, daysAgo: 200 })) };
    expect(scoreCreator(old, rubric).score).toBe(0);
    expect(scoreCreator(old, rubric).gates.threeRecent).toBe(false);
  });
});
