// Public sample data for the Product Finder demo: safe to import in the browser.
// Private negotiation limits live in lib/private.ts and never leave the server.
// All brands, creators, metrics and terms are fictional.

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
  /** Private: the highest fee the brand agent may agree to. Sent only to the server's brand agent. */
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

export const PRODUCT_PITCH = "Compact 65% wireless mechanical keyboard with hot-swappable switches, for macOS and Windows.";
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

/** A creator's video. `tags` and `daysAgo` drive screening; the rest is display. */
export type Video = {
  id: string;
  title: string;
  dur: string;
  date: string;
  views: string;
  img: string;
  pos: string;
  daysAgo: number;
  tags: string[];
  fit?: string[];
};

export const VIDEOS: Record<string, Video> = {
  v1: { id: "v1", title: "First 60 seconds with a low-profile 75% keyboard", dur: "0:52", date: "Oct 30, 2026", views: "41.2K", img: img("keyboard.svg"), pos: "45% 40%",
    daysAgo: 23, tags: ["keyboard", "sound test", "75%", "wireless", "mac", "first impressions"],
    fit: ["A 52-second first-impressions video, the same format and length this brief asks for.", "Unboxing and a typing sound test both land in the first 15 seconds."] },
  v2: { id: "v2", title: "Swapping keycaps on a 65% board", dur: "0:47", date: "Oct 4, 2026", views: "28.6K", img: img("keyboard.svg"), pos: "72% 55%",
    daysAgo: 49, tags: ["keyboard", "65%", "hot-swap", "keycaps", "compact"],
    fit: ["Close-ups of a 65% layout, the same size as the Loop 65.", "Shows hot-swap keycaps, a feature this product supports."] },
  v3: { id: "v3", title: "Lubing stabilizers on a budget keyboard", dur: "0:58", date: "Sep 2, 2026", views: "19.3K", img: img("desk.svg"), pos: "50% 82%",
    daysAgo: 81, tags: ["keyboard", "switches", "lubed", "sound test", "budget"],
    fit: ["Hands-on keyboard video with clear sound demos.", "Tutorial format, so less like the first-impressions video requested."] },
  v4: { id: "v4", title: "My desk setup under $300", dur: "0:59", date: "Oct 12, 2026", views: "63.0K", img: img("desk.svg"), pos: "50% 30%",
    daysAgo: 41, tags: ["desk setup", "home office", "budget", "wireless"],
    fit: ["Full desk setup with a compact keyboard in context.", "Not keyboard-focused; the keyboard appears briefly."] },
};

/** Public profile of an applicant. Private negotiation limits are in lib/private.ts. */
export type Applicant = {
  id: string;
  name: string;
  first: string;
  initials: string;
  handle: string;
  platform: "TikTok" | "YouTube Shorts";
  followers: string;
  followersN: number;
  metricDate: string;
  median: string;
  niche: string[];
  audience: string;
  shipsTo: string;
  format: "vertical" | "horizontal";
  note: string;
  /** The video submitted with the application. */
  video: Omit<Video, "id" | "fit" | "daysAgo" | "tags">;
  /** Hand-written notes on the submitted video. */
  fit: string[];
  /** Recent work used by the screening rubric. */
  portfolio: Video[];
};

export const MAYA: Omit<Applicant, "video" | "fit" | "note"> = {
  id: "maya", name: "Maya Okafor", first: "Maya", initials: "MO", handle: "@mayasdesk", platform: "TikTok",
  followers: "24.8K followers", followersN: 24800, metricDate: "Updated Nov 18, 2026", median: "27.4K",
  niche: ["desk setups", "compact keyboards", "Mac setups"], audience: "22–34, U.S., about 70% Mac users, remote workers",
  shipsTo: "US", format: "vertical", portfolio: Object.values(VIDEOS),
};

/** Builds Maya's applicant record from the video she submitted. */
export function mayaApplicant(videoId: string, note = ""): Applicant {
  const v = VIDEOS[videoId] ?? VIDEOS.v1;
  return { ...MAYA, note, video: v, fit: v.fit ?? [] };
}

const vid = (id: string, title: string, daysAgo: number, tags: string[], views: string, image = "keyboard.svg", pos = "50% 50%", dur = "0:50", date = ""): Video =>
  ({ id, title, daysAgo, tags, views, img: img(image), pos, dur, date });

export const OTHERS: Applicant[] = [
  { id: "jon", name: "Jon Reyes", first: "Jon", initials: "JR", handle: "@jonbuilds", platform: "YouTube Shorts", followers: "31.5K subscribers", followersN: 31500,
    metricDate: "Updated Nov 15, 2026", median: "22.1K", niche: ["mechanical keyboards", "MacBook desks"], audience: "18–29, U.S., keyboard hobbyists",
    shipsTo: "US", format: "vertical", note: "Happy to shoot this on a MacBook desk to show the macOS pairing.",
    video: { title: "Wireless 65% keyboard on a MacBook desk", dur: "0:55", date: "Nov 3, 2026", views: "34.8K", img: img("desk.svg"), pos: "35% 85%" },
    fit: ["Pairs a 65% wireless board with a Mac, matching the Loop 65’s macOS support.", "Opens with the keyboard already set up, so less unboxing than requested."],
    portfolio: [
      vid("j1", "Wireless 65% keyboard on a MacBook desk", 19, ["keyboard", "65%", "wireless", "mac", "bluetooth"], "34.8K", "desk.svg", "35% 85%", "0:55", "Nov 3"),
      vid("j2", "Bluetooth vs 2.4GHz on a Mac: latency test", 44, ["keyboard", "wireless", "bluetooth", "mac", "battery"], "21.0K"),
      vid("j3", "Hot-swap boards under $120", 70, ["keyboard", "hot-swap", "budget", "value"], "17.4K"),
    ] },
  { id: "tess", name: "Tess Lindqvist", first: "Tess", initials: "TL", handle: "@tessworks", platform: "TikTok", followers: "8.9K followers", followersN: 8900,
    metricDate: "Updated Nov 12, 2026", median: "6.2K", niche: ["quiet offices", "productivity"], audience: "22–35, U.S., hybrid office workers",
    shipsTo: "US", format: "vertical", note: "",
    video: { title: "Quiet keyboard for a shared office", dur: "0:44", date: "Oct 21, 2026", views: "11.4K", img: img("keyboard.svg"), pos: "15% 60%" },
    fit: ["Close-up switch sound comparison, useful for a first-impressions brief.", "Smaller audience, but brand-owned videos have no follower minimum."],
    portfolio: [
      vid("t1", "Quiet keyboard for a shared office", 32, ["keyboard", "quiet", "sound test", "shared", "calls"], "11.4K", "keyboard.svg", "15% 60%", "0:44", "Oct 21"),
      vid("t2", "Tactile vs linear for open-plan offices", 55, ["keyboard", "switches", "linear", "tactile", "quiet"], "7.9K"),
      vid("t3", "Compact desk for hybrid work", 76, ["keyboard", "compact", "desk setup", "home office"], "5.6K", "desk.svg"),
    ] },
];

export function fmtK(n: number) {
  if (n >= 1000) return `${Math.round((n / 1000) * 10) / 10}K`;
  return String(n);
}
