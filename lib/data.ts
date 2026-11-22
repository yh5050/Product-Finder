// Sample data for the Product Finder demo. All brands, creators, metrics and terms are fictional.

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const img = (name: string) => `${BASE_PATH}/img/${name}`;

/** Terms that both sides see and that the agents negotiate over. */
export type Terms = {
  fee: number;
  deliverable: string;
  deadline: string;
  usageRights: string;
  keepSample: boolean;
  payment: string;
};

/** Everything the brand sets in the campaign builder. */
export type Campaign = {
  brand: string;
  product: string;
  sku: string;
  category: string;
  compat: string;
  qty: string;
  ship: string;
  type: "owned" | "sponsored";
  followerMin: string;
  fee: string;
  deliverable: string;
  deadline: string;
  review: string;
  own: "keep" | "return";
  usage: string;
  /** Private: the highest fee the brand agent may agree to. Never shown to creators. */
  maxFee: string;
};

export const defaultCampaign: Campaign = {
  brand: "Halden Works",
  product: "Halden Loop 65",
  sku: "HW-L65-GRY",
  category: "Keyboards",
  compat: "macOS and Windows · USB-C and Bluetooth 5.1",
  qty: "5",
  ship: "the contiguous U.S.",
  type: "owned",
  followerMin: "15000",
  fee: "150",
  deliverable: "One 45–60 second first-impressions video",
  deadline: "10",
  review: "3",
  own: "keep",
  usage: "90",
  maxFee: "200",
};

export const DEFAULT_PAYMENT = "Net 30 after the brand approves the video";

/** Converts builder fields into the negotiable term sheet. */
export function campaignTerms(c: Campaign): Terms {
  return {
    fee: Number(c.fee) || 0,
    deliverable: c.deliverable,
    deadline: `${c.deadline} days after delivery`,
    usageRights: c.type === "owned" ? `Brand organic social, ${c.usage} days` : `Creator’s channel; brand reposts ${c.usage} days`,
    keepSample: c.own === "keep",
    payment: DEFAULT_PAYMENT,
  };
}

export type Video = {
  id: string;
  title: string;
  dur: string;
  date: string;
  views: string;
  img: string;
  pos: string;
  fit: string[];
};

export const VIDEOS: Record<string, Video> = {
  v1: { id: "v1", title: "First 60 seconds with a low-profile 75% keyboard", dur: "0:52", date: "Oct 30, 2026", views: "41.2K", img: img("keyboard.svg"), pos: "45% 40%",
    fit: ["A 52-second first-impressions video, the same format and length this brief asks for.", "Unboxing and a typing sound test both land in the first 15 seconds.", "One of three keyboard videos Maya published in the past 90 days."] },
  v2: { id: "v2", title: "Swapping keycaps on a 65% board", dur: "0:47", date: "Oct 4, 2026", views: "28.6K", img: img("keyboard.svg"), pos: "72% 55%",
    fit: ["Close-ups of a 65% layout, the same size as the Loop 65.", "Shows hot-swap keycaps, a feature this product supports.", "One of three keyboard videos Maya published in the past 90 days."] },
  v3: { id: "v3", title: "Lubing stabilizers on a budget keyboard", dur: "0:58", date: "Sep 2, 2026", views: "19.3K", img: img("desk.svg"), pos: "50% 82%",
    fit: ["Hands-on keyboard video with clear sound demos.", "Tutorial format, so less like the first-impressions video requested.", "One of three keyboard videos Maya published in the past 90 days."] },
  v4: { id: "v4", title: "My desk setup under $300", dur: "0:59", date: "Oct 12, 2026", views: "63.0K", img: img("desk.svg"), pos: "50% 30%",
    fit: ["Full desk setup with a compact keyboard in context.", "Not keyboard-focused; the keyboard appears briefly.", "Maya’s most-viewed video in the past 90 days."] },
};

/** Applicants to the keyboard brief. Maya is the demo creator; Jon and Tess are seeded. */
export type Applicant = {
  id: "maya" | "jon" | "tess";
  name: string;
  first: string;
  initials: string;
  handle: string;
  platform: "TikTok" | "YouTube Shorts";
  followers: string;
  followersN: number;
  metricDate: string;
  median: string;
  rankWhy: string;
  niche: string[];
  audience: string;
  note: string;
  video: Omit<Video, "id" | "fit">;
  fit: string[];
  // Private negotiation limits, visible only to the creator's own agent
  minFee: number;
  priorities: string;
  personality: string;
};

export const MAYA_BASE: Omit<Applicant, "video" | "fit" | "note"> = {
  id: "maya", name: "Maya Okafor", first: "Maya", initials: "MO", handle: "@mayasdesk", platform: "TikTok",
  followers: "24.8K followers", followersN: 24800, metricDate: "Updated Nov 18, 2026", median: "27.4K",
  rankWhy: "3 keyboard videos in 90 days", niche: ["desk setups", "compact keyboards", "Mac setups"],
  audience: "22–34, U.S., about 70% Mac users, remote workers",
  minFee: 170, priorities: "Wants about $200 because the brand can reuse the video, and needs 4 extra days to finish another shoot. Keeps the sample.",
  personality: "Warm, confident, knows her rates.",
};

export const OTHERS: Applicant[] = [
  { id: "jon", name: "Jon Reyes", first: "Jon", initials: "JR", handle: "@jonbuilds", platform: "YouTube Shorts", followers: "31.5K subscribers", followersN: 31500,
    metricDate: "Updated Nov 15, 2026", median: "22.1K", rankWhy: "2 keyboard videos in 90 days", niche: ["mechanical keyboards", "MacBook desks"],
    audience: "18–29, U.S., keyboard hobbyists", note: "Happy to shoot this on a MacBook desk to show the macOS pairing.",
    video: { title: "Wireless 65% keyboard on a MacBook desk", dur: "0:55", date: "Nov 3, 2026", views: "34.8K", img: img("desk.svg"), pos: "35% 85%" },
    fit: ["Pairs a 65% wireless board with a Mac, matching the Loop 65’s macOS support.", "Opens with the keyboard already set up, so less unboxing than requested.", "One of two keyboard videos Jon published in the past 90 days."],
    minFee: 130, priorities: "Flexible on fee, but wants to mention one honest con on camera and 2 extra days.", personality: "Nerdy, detail-oriented, cares about honest reviews." },
  { id: "tess", name: "Tess Lindqvist", first: "Tess", initials: "TL", handle: "@tessworks", platform: "TikTok", followers: "8.9K followers", followersN: 8900,
    metricDate: "Updated Nov 12, 2026", median: "6.2K", rankWhy: "1 keyboard video in 90 days", niche: ["quiet offices", "productivity"],
    audience: "22–35, U.S., hybrid office workers", note: "",
    video: { title: "Quiet keyboard for a shared office", dur: "0:44", date: "Oct 21, 2026", views: "11.4K", img: img("keyboard.svg"), pos: "15% 60%" },
    fit: ["Close-up switch sound comparison, useful for a first-impressions brief.", "Smaller audience, but brand-owned videos have no follower minimum.", "Tess’s only keyboard video in the past 90 days."],
    minFee: 110, priorities: "Happy with the brief. Wants payment within 7 days of approval instead of net 30.", personality: "Upbeat, newer to brand deals, careful about payment terms." },
];

/** AI screening funnel shown on the Applicants tab. */
export const funnel = [
  { label: "Applications received", count: 186 },
  { label: "Ships to the U.S. and posts vertical video", count: 141 },
  { label: "3+ relevant videos in the past 90 days", count: 38 },
  { label: "You.com portfolio and reputation check", count: 9 },
  { label: "Ranked for your review", count: 3 },
];

export function fmtK(n: number) {
  if (n >= 1000) return `${Math.round((n / 1000) * 10) / 10}K`;
  return String(n);
}
