# Unboxed

Unboxed is a clickable demo of a two-sided marketplace for tech accessories. Small brands find short-form creators whose recent videos fit their product, and creators find paid unboxing and demo work with clear terms. You.com reads the past month of the web to decide what the brand should screen for, AI agents for the brand and each creator negotiate a draft term sheet, and both people approve it.

This version merges three earlier demos:

- **Deskside prototype** (yh5050): campaign builder with a live offer preview, mobile creator feed with match reasons, apply-with-a-past-video flow, brand applicant review with Shortlist/Decline, and dual approval. Shared state keeps both sides on the same terms and status.
- **Product Finder hackathon demo** ([zhujiabin74/product-finder](https://github.com/zhujiabin74/product-finder)): screening funnel and parallel brand-agent ↔ creator-agent negotiation with Claude.
- **Product Finder, You.com edition** ([mAE7777/Product-Finder](https://github.com/mAE7777/Product-Finder), live at [unboxing-henna.vercel.app](https://unboxing-henna.vercel.app/)): a You.com-built screening rubric over 1,000 sample applicants, You.com Research on creator rates, agent limits enforced in code, private data kept on the server, signed screening evidence, and the test suite.

All brands, creators, metrics and terms are fictional sample data. Product images are illustrations, not photos.

## Demo flow

Use the role switch in the top bar to move between the two sides.

1. **Brand view → Campaign builder.** Review the Halden Loop 65 brief ($150 flat fee, keep the sample, 90 days of organic usage, no paid ads). Set the agent's private fee cap and click **Publish brief**.
2. **Creator view.** The brief appears in Maya's matched feed. Open it, check **Offer terms**, pick a past video, review what you receive and owe, then **Apply**.
3. **Brand view → Applicants.** Screening runs: You.com searches the past 30 days on what buyers care about for this kind of keyboard, the results become a weighted rubric (each criterion linked to its sources), the rubric ranks 1,000 sample applicants, keeps the top 100, then keeps those that meet the brief (ships to the U.S., vertical video, 3+ keyboard videos in 90 days, and the follower minimum for sponsored posts). Each finalist shows which recent videos match which criterion. **Shortlist** Maya (and anyone else).
4. **Brand view → Agent negotiation.** **Start agents.** The brand agent negotiates with each shortlisted creator's agent in parallel. Live messages show the sources they cite; You.com Research on public creator rates informs the brand's later offers.
5. **Approve.** The brand approves each term sheet. In Creator view, Maya reviews and accepts hers. The status changes to **Deal confirmed** on both sides.

**Reset demo** in the top bar starts over.

## How the safety rules work

- **Private limits stay private.** Each creator's minimum fee and priorities live in `lib/private.ts`, which only the server imports. The brand's fee cap goes only to the brand agent. Tests check that no browser file imports them and that no API response contains them.
- **Limits are enforced in code, not just in the prompt.** The brand never goes above its cap, a creator never accepts below its minimum, an accept copies the other side's terms exactly, and a private figure that slips into a message is replaced before anyone sees it.
- **Sources are real.** The screening's You.com evidence is handed to the browser as a signed token; the negotiation verifies it before the brand agent may cite it, and source chips only point at results the agent was given.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add keys
npm run dev
```

- With `YDC_API_KEY`, screening and agent evidence use live You.com Search and Research. Without it the screen says so and screens on fixed starting criteria.
- With `ANTHROPIC_API_KEY`, live Claude agents negotiate and the model picks the rubric from the You.com results. Without it the negotiation is a labeled replay of a scripted run.
- `POST /api/negotiate?mock=1` forces the replay even when a key is set.

## Tests

```bash
npm test        # pool, rubric, scoring, You.com client, agents, privacy
npm run lint
npm run build
```

## Deploy

- **Full app (live You.com and agents):** deploy to Vercel or any Node host and set the keys above. Set `EVIDENCE_SECRET` too, so screening tokens are signed with a dedicated secret.
- **GitHub Pages (static):** `.github/workflows/pages.yml` runs the tests and builds a static export on every push to `main`. It also rebuilds the previous merged version from its commit and serves it at `/previous/` (linked from the top bar). Pages can't run API routes, so screening uses the starting criteria in the browser and the negotiation runs as a scripted replay.

## Code map

- `app/page.tsx`: shared demo state, role switch, screening and negotiation runners
- `components/Brand.tsx`: campaign builder, applicants with You.com screening, agent negotiation
- `components/Creator.tsx`: mobile creator feed, offer detail, apply flow, applications, term sheet
- `lib/data.ts`: public sample campaign, creators and videos
- `lib/private.ts`: creators' private negotiation limits (server only)
- `lib/screening.ts`, `lib/rubric.ts`: the 1,000-applicant pool, rubric and scoring (browser-safe)
- `lib/rubric-llm.ts`, `lib/market.ts`, `lib/youcom.ts`, `lib/cache.ts`: You.com search and Research, model-picked rubric, signed evidence (server)
- `lib/agents.ts`, `app/api/negotiate`: live Claude agents with enforced limits
- `lib/scripts.ts`: scripted negotiation replay (server or browser)
