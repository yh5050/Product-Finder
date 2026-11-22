// Screening: a seeded pool of 1,000 sample applicants, scored against the rubric and the brief's hard requirements.
// Pure and browser-safe, so the static GitHub Pages build can screen without a server.
import { MAYA, OTHERS, VIDEOS, type Campaign } from "./data";
import type { CriterionId, Rubric } from "./rubric";
import { mentions } from "./text";

export const POOL_SIZE = 1000;
export const SHORTLIST = 100;
export const FINALISTS = 3;
const RECENT_DAYS = 90;
const CATEGORY_TAG = "keyboard";

/** What screening needs to know about an applicant. No private negotiation data. */
export type PoolCreator = {
  id: string;
  name: string;
  handle: string;
  platform: "TikTok" | "YouTube Shorts";
  followers: number;
  shipsTo: string;
  format: "vertical" | "horizontal";
  niche: string[];
  portfolio: { title: string; daysAgo: number; tags: string[] }[];
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Alex", "Sam", "Jamie", "Taylor", "Riley", "Morgan", "Casey", "Avery", "Quinn", "Drew", "Rowan", "Skyler",
  "Noah", "Liam", "Emma", "Olivia", "Ava", "Mia", "Leo", "Zoe", "Ethan", "Nora", "Kai", "Ivy", "Owen", "Lena", "Theo",
  "Ruby", "Eli", "Maren", "Dev", "Ana", "Luis", "Hana", "Omar", "Yuki", "Tariq", "Sofia", "Ben", "Chloe"];
const LAST = ["Park", "Kim", "Lopez", "Nguyen", "Patel", "Garcia", "Brooks", "Hayes", "Ortiz", "Singh", "Foster", "Wells",
  "Rivera", "Cole", "Tran", "Ward", "Baker", "Shah", "Ross", "Diaz", "Price", "Lam", "Moore", "Khan", "Hart", "Silva"];

type Topic = { niche: string; titles: string[]; tags: string[] };

// Keyboard topics are mixed with topics outside the category, as a real open call would be.
const KEYBOARD: Topic[] = [
  { niche: "mechanical keyboards", titles: ["Unboxing a budget mechanical keyboard", "First impressions: 65% wireless board",
    "Clicky vs tactile switches in 60 seconds", "My keyboard collection, ranked"], tags: ["keyboard", "switches", "tactile"] },
  { niche: "desk setups", titles: ["Desk setup tour 2026", "Minimal desk setup on a budget", "Cable management that stays clean",
    "Monitor arm and keyboard tray install"], tags: ["desk setup", "keyboard", "home office"] },
  { niche: "keyboard sound tests", titles: ["Typing sound test: stock vs lubed", "Thocky keyboard sound compilation",
    "Is this the loudest keyboard?"], tags: ["keyboard", "sound test", "thock"] },
  { niche: "productivity gear", titles: ["5 productivity gadgets under $50", "My work-from-home essentials",
    "Wireless keyboard and mouse combo review"], tags: ["wireless", "home office", "keyboard"] },
];
const OTHER: Topic[] = [
  { niche: "skincare", titles: ["Night routine for dry skin", "Drugstore sunscreen ranked"], tags: ["beauty"] },
  { niche: "cooking", titles: ["15-minute pasta", "Meal prep for the week"], tags: ["food"] },
  { niche: "fitness", titles: ["Home workout, no equipment", "Running shoes after 300 miles"], tags: ["fitness"] },
  { niche: "travel", titles: ["Carry-on packing list", "Tokyo in 48 hours"], tags: ["travel"] },
  { niche: "phone reviews", titles: ["New phone camera test", "Is the base model enough?"], tags: ["phone", "camera"] },
  { niche: "gaming", titles: ["Best settings for 144 fps", "Controller vs mouse aim test"], tags: ["gaming", "mouse"] },
  { niche: "home decor", titles: ["Small bedroom makeover", "Renter-friendly lighting"], tags: ["decor"] },
];

const pick = <T,>(r: () => number, list: T[]): T => list[Math.floor(r() * list.length)];
const video = (r: () => number, t: Topic, daysAgo: number) => ({ title: pick(r, t.titles), daysAgo, tags: t.tags });

// Generated keyboard creators get at most two keyboard videos in the last 90 days, so the "three relevant videos
// in 90 days" requirement can only be met by creators with a real body of recent category work.
function generated(r: () => number, i: number): PoolCreator {
  const first = pick(r, FIRST);
  const last = pick(r, LAST);
  const inCategory = r() < 0.32;
  const topic = inCategory ? pick(r, KEYBOARD) : pick(r, OTHER);
  const portfolio: PoolCreator["portfolio"] = [];
  const recent = inCategory ? 1 + Math.floor(r() * 2) : 0;
  for (let k = 0; k < recent; k++) portfolio.push(video(r, topic, 5 + Math.floor(r() * 80)));
  const older = inCategory ? Math.floor(r() * 2) : 0;
  for (let k = 0; k < older; k++) portfolio.push(video(r, topic, 95 + Math.floor(r() * 120)));
  while (portfolio.length < 3) portfolio.push(video(r, pick(r, OTHER), 3 + Math.floor(r() * 85)));
  return {
    id: `a${String(i).padStart(4, "0")}`,
    name: `${first} ${last}`,
    handle: `@${first.toLowerCase()}${last.toLowerCase()}${Math.floor(r() * 90 + 10)}`,
    platform: r() < 0.6 ? "TikTok" : "YouTube Shorts",
    followers: Math.round(1000 + Math.pow(r(), 2) * 180000),
    shipsTo: r() < 0.86 ? "US" : pick(r, ["CA", "UK", "AU", "DE"]),
    format: r() < 0.9 ? "vertical" : "horizontal",
    niche: [topic.niche],
    portfolio,
  };
}

const named = (a: { id: string; name: string; handle: string; platform: PoolCreator["platform"]; followersN: number; shipsTo: string; format: PoolCreator["format"]; niche: string[]; portfolio: { title: string; daysAgo: number; tags: string[] }[] }): PoolCreator =>
  ({ id: a.id, name: a.name, handle: a.handle, platform: a.platform, followers: a.followersN, shipsTo: a.shipsTo, format: a.format, niche: a.niche,
    portfolio: a.portfolio.map((v) => ({ title: v.title, daysAgo: v.daysAgo, tags: v.tags })) });

/**
 * The sample pool: 1,000 applicants, the same on every run. Jon and Tess are always in it; Maya joins once she
 * applies in the creator view. Everyone else is generated from a fixed seed.
 */
export function applicantPool(mayaApplied: boolean, size = POOL_SIZE, seed = 20261122): PoolCreator[] {
  const r = mulberry32(seed);
  const slots = new Map<number, PoolCreator>([[512, named(OTHERS[0])], [884, named(OTHERS[1])]]);
  if (mayaApplied) slots.set(137, named({ ...MAYA, portfolio: Object.values(VIDEOS) }));
  const pool: PoolCreator[] = [];
  for (let i = 0; i < size; i++) {
    const g = generated(r, i); // always drawn, so the generated applicants do not change when Maya applies
    pool.push(slots.get(i) ?? g);
  }
  return pool;
}

export type Match = { id: CriterionId; label: string; videos: string[] };

export type Scored = {
  creator: PoolCreator;
  score: number; // 0 to 100
  matched: Match[];
  recentCategoryVideos: number;
  gates: { shipsToUS: boolean; vertical: boolean; threeRecent: boolean; followerMin: boolean };
};

const videoText = (v: { title: string; tags: string[] }) => ` ${v.title} ${v.tags.join(" ")} `.toLowerCase();

/** A criterion counts in full when two or more recent videos show it, and half when one does. */
export function scoreCreator(c: PoolCreator, rubric: Rubric, followerMin = 0): Scored {
  const recent = c.portfolio.filter((v) => v.daysAgo <= RECENT_DAYS);
  let total = 0;
  const matched: Match[] = [];
  for (const cr of rubric.criteria) {
    const hits = recent.filter((v) => cr.videoTerms.some((t) => mentions(videoText(v), t)));
    if (!hits.length) continue;
    total += cr.weight * Math.min(1, hits.length / 2);
    matched.push({ id: cr.id, label: cr.label, videos: hits.map((v) => v.title) });
  }
  const recentCategoryVideos = recent.filter((v) => v.tags.includes(CATEGORY_TAG)).length;
  return {
    creator: c,
    score: Math.round(total * 1000) / 10,
    matched,
    recentCategoryVideos,
    gates: { shipsToUS: c.shipsTo === "US", vertical: c.format === "vertical", threeRecent: recentCategoryVideos >= 3, followerMin: c.followers >= followerMin },
  };
}

export type Screening = { total: number; shortlist: Scored[]; passedChecks: number; finalists: Scored[] };

/** The brief's hard requirements. A sponsored post adds the follower minimum; brand-owned video has none. */
export function requirements(c: Pick<Campaign, "type" | "followerMin">) {
  return { followerMin: c.type === "sponsored" ? Number(c.followerMin) || 0 : 0 };
}

/**
 * Ranks the whole pool by rubric score, keeps the top 100, then applies the brief's hard requirements and keeps
 * the best three. Ties break on follower count and then id, so a run is reproducible.
 */
export function screen(pool: PoolCreator[], rubric: Rubric, followerMin = 0): Screening {
  const ranked = pool
    .map((c) => scoreCreator(c, rubric, followerMin))
    .sort((a, b) => b.score - a.score || b.creator.followers - a.creator.followers || a.creator.id.localeCompare(b.creator.id));
  const shortlist = ranked.slice(0, SHORTLIST);
  const passing = shortlist.filter((s) => s.gates.shipsToUS && s.gates.vertical && s.gates.threeRecent && s.gates.followerMin);
  return { total: pool.length, shortlist, passedChecks: passing.length, finalists: passing.slice(0, FINALISTS) };
}

/** The screening result as the browser sees it (same shape from the server route and the static fallback). */
export type ScreeningView = {
  screeningId: string | null;
  youcom: { status: "live" | "empty" | "error" | "off"; window: "month" | "year"; sources: number; queries: { query: string; status: string; count: number; error?: string }[]; fetchedAt?: string };
  rubric: Rubric;
  counts: { total: number; shortlist: number; passedChecks: number; finalists: number };
  shortlist: { id: string; name: string; handle: string; platform: string; followers: number; score: number }[];
  finalists: { id: string; score: number; matched: Match[]; recentCategoryVideos: number }[];
  seconds: number;
  offline?: boolean;
};

export function toView(result: Screening, rubric: Rubric, extra: Pick<ScreeningView, "screeningId" | "youcom" | "seconds"> & { offline?: boolean }): ScreeningView {
  return {
    ...extra,
    rubric,
    counts: { total: result.total, shortlist: result.shortlist.length, passedChecks: result.passedChecks, finalists: result.finalists.length },
    shortlist: result.shortlist.map((s) => ({ id: s.creator.id, name: s.creator.name, handle: s.creator.handle, platform: s.creator.platform, followers: s.creator.followers, score: s.score })),
    finalists: result.finalists.map((s) => ({ id: s.creator.id, score: s.score, matched: s.matched, recentCategoryVideos: s.recentCategoryVideos })),
  };
}
