# Product Finder

A clickable demo of a two-sided marketplace for tech accessories. Small brands find short-form creators whose past videos fit their product, and creators find paid unboxing and demo work with clear terms. AI screening ranks applicants, and AI agents for the brand and each creator negotiate a draft term sheet that both sides approve.

This version merges two earlier demos:

- **Deskside prototype** (yh5050): campaign builder with a live offer preview, mobile creator feed with match reasons, apply-with-a-past-video flow, and brand applicant review with Shortlist/Decline. Shared state keeps both sides on the same terms and status.
- **Product Finder hackathon demo** ([zhujiabin74/product-finder](https://github.com/zhujiabin74/product-finder)): You.com screening funnel and web evidence, and parallel brand-agent ↔ creator-agent negotiation with Claude, with a scripted replay when no key is set.

All brands, creators, metrics and terms are fictional sample data. Product images are illustrations, not photos.

## Demo flow

Use the role switch in the top bar to move between the two sides.

1. **Brand view → Campaign builder.** Review the Halden Loop 65 brief ($150 flat fee, keep the sample, 90 days of organic usage, no paid ads). Set the agent's private fee cap and click **Publish brief**.
2. **Creator view.** The keyboard brief appears in Maya's matched feed. Open it, check **Offer terms**, pick a past video, review what you receive and owe, then **Apply**.
3. **Brand view → Applicants.** The AI screening funnel ranks applicants by relevant portfolio work. Maya ranks first. **Shortlist** her (and anyone else).
4. **Brand view → Agent negotiation.** **Start agents.** The brand agent negotiates with each shortlisted creator's agent in parallel, within the private fee cap.
5. **Approve.** The brand approves each term sheet. In Creator view, Maya reviews and accepts hers. The status changes to **Deal confirmed** on both sides.

**Reset demo** in the top bar starts over.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional: add keys
npm run dev
```

- With no `ANTHROPIC_API_KEY`, the negotiation plays a scripted replay, so the demo always works.
- With `ANTHROPIC_API_KEY`, live Claude agents negotiate. Each agent has private limits: the brand's fee cap and each creator's minimum fee.
- `YDC_API_KEY` turns on live You.com evidence in applicant review.

## Deploy

- **Full app (live agents):** deploy to Vercel or any Node host and set the keys above as environment variables.
- **GitHub Pages (static):** `.github/workflows/pages.yml` builds a static export on every push to `main`. Pages can't run API routes, so the screening shows demo data and the negotiation runs as a scripted replay in the browser.

## Code map

- `app/page.tsx`: shared demo state, role switch and the negotiation runner
- `components/Brand.tsx`: campaign builder, applicants with AI screening, agent negotiation
- `components/Creator.tsx`: mobile creator feed, offer detail, apply flow, applications, term sheet
- `lib/data.ts`: sample campaign, creators and videos
- `lib/model.ts`: listings, ranking and status logic
- `lib/scripts.ts`: scripted negotiation replay (runs on the server or in the browser)
- `lib/agents.ts`, `app/api/negotiate`: live Claude agents
- `lib/youcom.ts`, `app/api/screen`: You.com search
