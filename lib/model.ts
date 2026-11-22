import { campaignTerms, defaultCampaign, fmtK, img, mayaApplicant, OTHERS, type Applicant, type Campaign, type Terms } from "./data";
import type { ResearchEvent, Turn } from "./scripts";
import type { Match, ScreeningView } from "./screening";
import type { Evidence, LiveStatus } from "./youcom";

export type AppStatus = "applied" | "shortlisted" | "declined";
export type Application = { status: AppStatus; video: string; note: string };

export type Lane = {
  turns: Turn[];
  thinking: "brand" | "creator" | null;
  outcome?: "agreed" | "no-deal" | "walked" | "failed";
  terms?: Terms;
  error?: string;
  brandOk?: boolean;
  creatorOk?: boolean;
};

export type State = {
  role: "brand" | "creator";
  bTab: "builder" | "applicants" | "negotiation";
  cScr: "feed" | "detail" | "review" | "done" | "apps";
  listing: string;
  published: boolean;
  error: string;
  toast: string;
  c: Campaign;
  apps: Record<string, Application>;
  pick: string;
  note: string;
  others: Record<"jon" | "tess", AppStatus>;
  selA: string;
  fCat: string;
  fPost: string;
  lanes: Record<string, Lane>;
  negLive: boolean | null;
  negRunning: boolean;
  /** Latest screening result, and the inputs it was run for (so a changed brief or a new application re-runs it). */
  screening: ScreeningView | null;
  screeningFor: string;
  screenRunning: boolean;
  research: (ResearchEvent & { pending?: boolean }) | null;
  news: { status: LiveStatus; results: Evidence[]; error?: string } | null;
  negNotice: string;
};

export const initialState = (): State => ({
  role: "brand", bTab: "builder", cScr: "feed", listing: "kb", published: false, error: "", toast: "",
  c: { ...defaultCampaign }, apps: {}, pick: "v1", note: "", others: { jon: "applied", tess: "applied" }, selA: "",
  fCat: "all", fPost: "any", lanes: {}, negLive: null, negRunning: false,
  screening: null, screeningFor: "", screenRunning: false, research: null, news: null, negNotice: "",
});

export type TermRow = { k: string; v: string; n: string };
export type Listing = {
  id: string; mark: string; brand: string; title: string; cat: string; img: string; alt: string;
  fee: string; post: string; postReq: boolean; sample: string; blurb: string; match: string; matchSub: string;
  rel: string[]; relevant: string[]; terms: TermRow[]; compat: string; receive: string[]; owe: string[];
};

export const STATUS_LABEL: Record<string, string> = {
  applied: "Applied", shortlisted: "Shortlisted", declined: "Declined", negotiating: "Negotiating",
  agreed: "Terms ready", confirmed: "Deal confirmed", nodeal: "No deal", failed: "Agent error",
};

/** Builds the keyboard listing from the brand's live campaign fields, plus two seeded listings. */
export function listings(c: Campaign): Record<string, Listing> {
  const owned = c.type === "owned";
  const keep = c.own === "keep";
  const fee = Number(c.fee) || 0;
  const minN = Number(c.followerMin) || 0;
  const usage = `organic social, ${c.usage} days`;
  const kb: Listing = {
    id: "kb", mark: "HW", brand: c.brand, title: c.product, cat: "Keyboards", img: img("keyboard.svg"),
    alt: `${c.product} on an oak desk beside a mug and notebook`, fee: `$${fee}`, post: owned ? "No post required" : "Post required",
    postReq: !owned, sample: keep ? "Keep sample" : "Return sample", blurb: "Compact 65% wireless mechanical keyboard with hot-swappable switches.",
    match: "You’ve published three keyboard videos in the past 90 days.", matchSub: "Your first-impressions video is the closest match to this brief’s format.",
    rel: ["v1", "v2"], relevant: ["v1", "v2", "v3"], compat: c.compat,
    terms: [
      { k: "Fee", v: `$${fee} flat fee`, n: "USD · net 30 after the brand approves the video" },
      { k: "Deliverable", v: c.deliverable, n: owned ? "Sent to the brand as a video file" : "Published on your channel" },
      { k: "Posting", v: owned ? "No post required" : "Post required on your channel", n: owned ? "You deliver the file; you don’t publish it" : `Minimum ${fmtK(minN)} followers · #ad disclosure required` },
      { k: "Deadline", v: `Within ${c.deadline} days of delivery`, n: `Brand reviews within ${c.review} business days` },
      { k: "Shipping", v: "Brand covers shipping", n: `Ships to ${c.ship} · ${c.qty} samples available` },
      { k: "Sample", v: keep ? "You keep the sample" : "Return the sample", n: keep ? "No return needed" : "Within 14 days · brand pays return shipping" },
      { k: "Usage rights", v: owned ? `Brand’s ${usage}` : `Stays on your channel; brand may repost organically for ${c.usage} days`, n: "Paid advertising rights excluded" },
    ],
    receive: [`$${fee} flat fee, paid net 30 after the brand approves your video`, keep ? `The ${c.product} to keep` : `A loaner ${c.product} (return within 14 days, brand pays return shipping)`, "Free shipping to you"],
    owe: [`${c.deliverable}, delivered ${owned ? "to the brand" : "as a post on your channel"}`, `Within ${c.deadline} days of the sample arriving`, owned ? "No post on your channel" : `Post with an #ad disclosure; minimum ${fmtK(minN)} followers`, `Brand may use it on ${usage}. No paid ads.`],
  };
  const stand: Listing = {
    id: "stand", mark: "NF", brand: "Northfold", title: "Ridgeline Aluminum Laptop Stand", cat: "Stands", img: img("stand.svg"),
    alt: "Aluminum laptop stand holding a laptop on an oak desk", fee: "$120", post: "Post required", postReq: true, sample: "Return sample",
    blurb: "Folding aluminum stand with six height positions.", match: "Your Oct 12 desk setup video shows a laptop stand in use.",
    matchSub: "Northfold wants setup context more than unboxing.", rel: ["v4"], relevant: ["v4"], compat: "Laptops 10–17 in · up to 8 kg",
    terms: [
      { k: "Fee", v: "$120 flat fee", n: "USD · paid after the post goes live" },
      { k: "Deliverable", v: "One 30–45 second setup video", n: "Published on your channel" },
      { k: "Posting", v: "Post required on your channel", n: "Minimum 15K followers · #ad disclosure required" },
      { k: "Deadline", v: "Post within 14 days of delivery", n: "Brand reviews within 2 business days" },
      { k: "Shipping", v: "Brand covers shipping both ways", n: "Ships to the contiguous U.S." },
      { k: "Sample", v: "Return the sample", n: "Within 14 days · prepaid return label" },
      { k: "Usage rights", v: "Stays on your channel; brand may repost organically for 30 days", n: "Paid advertising rights excluded" },
    ],
    receive: ["$120 flat fee, paid after the post goes live", "A loaner stand (prepaid return label)", "Free shipping both ways"],
    owe: ["One 30–45 second setup video posted on your channel", "Within 14 days of the sample arriving", "An #ad disclosure on the post", "Return the stand within 14 days"],
  };
  const org: Listing = {
    id: "org", mark: "PW", brand: "Plainwire", title: "Tether Under-Desk Cable Kit", cat: "Organization", img: img("organizer.svg"),
    alt: "Cable tray, ties and clips laid out on linen", fee: "$75", post: "No post required", postReq: false, sample: "Keep sample",
    blurb: "Cable tray, adhesive clips and reusable ties for one desk.", match: "Your Oct 12 desk setup video includes an under-desk cable walkthrough.",
    matchSub: "Plainwire wants a quick before-and-after.", rel: ["v4"], relevant: ["v4"], compat: "Desks up to 160 cm wide · no drilling",
    terms: [
      { k: "Fee", v: "$75 flat fee", n: "USD · paid after the brand approves the video" },
      { k: "Deliverable", v: "One 20–30 second before-and-after video", n: "Sent to the brand as a video file" },
      { k: "Posting", v: "No post required", n: "You deliver the file; you don’t publish it" },
      { k: "Deadline", v: "Within 7 days of delivery", n: "Brand reviews within 3 business days" },
      { k: "Shipping", v: "Brand covers shipping", n: "Ships to the contiguous U.S." },
      { k: "Sample", v: "You keep the sample", n: "No return needed" },
      { k: "Usage rights", v: "Brand’s organic social, 60 days", n: "Paid advertising rights excluded" },
    ],
    receive: ["$75 flat fee, paid after the brand approves your video", "The cable kit to keep", "Free shipping to you"],
    owe: ["One 20–30 second before-and-after video, delivered to the brand", "Within 7 days of the sample arriving", "No post on your channel", "Brand may use it on organic social for 60 days. No paid ads."],
  };
  return { kb, stand, org };
}

export type RankedApplicant = Applicant & { status: AppStatus; below: boolean; isNew: boolean; rank: number; score: number; matched: Match[]; recentCategoryVideos: number };

/** The key a screening result belongs to: who has applied and the brief's hard requirements. */
export const screeningKey = (s: State) => `${s.apps.kb ? `maya:${s.apps.kb.video}` : "-"}|${s.c.type}|${s.c.type === "sponsored" ? s.c.followerMin : 0}`;

/** Finalists from the latest screening, ranked by rubric score, with each one's review status. */
export function applicants(s: State): RankedApplicant[] {
  const finalists = s.screening?.finalists ?? [];
  return finalists.flatMap((f, i) => {
    let a: Applicant | undefined;
    let status: AppStatus;
    if (f.id === "maya") {
      if (!s.apps.kb) return [];
      a = mayaApplicant(s.apps.kb.video, s.apps.kb.note);
      status = s.apps.kb.status;
    } else {
      a = OTHERS.find((o) => o.id === f.id);
      status = s.others[f.id as "jon" | "tess"] ?? "applied";
    }
    if (!a) return [];
    return [{ ...a, status, below: false, isNew: f.id === "maya" && status === "applied", rank: i + 1, score: f.score, matched: f.matched, recentCategoryVideos: f.recentCategoryVideos }];
  });
}

/** Combined deal status for one creator: application status, then negotiation progress. */
export function dealStatus(s: State, id: string): string {
  const lane = s.lanes[id];
  const base = id === "maya" ? s.apps.kb?.status : s.others[id as "jon" | "tess"];
  if (!base) return "";
  if (base !== "shortlisted" || !lane) return base;
  if (lane.outcome === "failed") return "failed";
  if (lane.outcome === "no-deal" || lane.outcome === "walked") return "nodeal";
  if (lane.outcome === "agreed") return lane.brandOk && lane.creatorOk ? "confirmed" : "agreed";
  return "negotiating";
}

export const mayaApp = (s: State) => s.apps.kb;
export const kbTerms = (s: State) => campaignTerms(s.c);
