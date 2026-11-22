// Server only: each creator agent's private limits. Never imported by browser code and never sent to the browser.

export type PrivateLimits = { minFee: number; priorities: string; personality: string };

export const PRIVATE: Record<string, PrivateLimits> = {
  maya: {
    minFee: 170,
    priorities: "Wants about $200 because the brand can reuse the video, and needs 4 extra days to finish another shoot. Keeps the sample.",
    personality: "Warm, confident, knows her rates.",
  },
  jon: {
    minFee: 130,
    priorities: "Flexible on fee, but wants to mention one honest con on camera and 2 extra days.",
    personality: "Nerdy, detail-oriented, cares about honest reviews.",
  },
  tess: {
    minFee: 110,
    priorities: "Happy with the brief. Wants payment within 7 days of approval instead of net 30.",
    personality: "Upbeat, newer to brand deals, careful about payment terms.",
  },
};

const PRIORITIES = [
  "Wants the full fee upfront in two weeks or less.",
  "Prefers organic usage only; reposting longer costs extra.",
  "Needs at least two extra days for editing.",
  "Wants to keep the sample and get a discount code for followers.",
  "Flexible on terms; cares most about creative freedom.",
];
const PERSONALITY = ["Direct and quick to decide.", "Friendly, asks a lot of questions.", "Careful, reads every term.", "Relaxed, open to most offers."];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** Private limits for any applicant: hand-written for the three named creators, derived from the id for the rest. */
export function privateLimits(id: string): PrivateLimits {
  if (PRIVATE[id]) return PRIVATE[id];
  const h = hash(id);
  return {
    minFee: 80 + (h % 23) * 10,
    priorities: PRIORITIES[h % PRIORITIES.length],
    personality: PERSONALITY[(h >>> 8) % PERSONALITY.length],
  };
}
