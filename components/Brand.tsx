"use client";

import { useEffect, useRef } from "react";
import { campaignTerms, fmtK, img, type Campaign } from "@/lib/data";
import { applicants, dealStatus, listings, screeningKey, type Lane, type RankedApplicant } from "@/lib/model";
import type { Rubric } from "@/lib/rubric";
import type { ScreeningView } from "@/lib/screening";
import type { Evidence } from "@/lib/youcom";
import type { Ctx } from "./ctx";
import { Check, SelfReported, Status, TermsList, Thumb } from "./ui";

export default function BrandView({ ctx }: { ctx: Ctx }) {
  const { s, set } = ctx;
  const count = applicants(s).length;
  const shortlisted = applicants(s).filter((a) => a.status === "shortlisted").length;
  const tabs: [typeof s.bTab, string, number | null][] = [
    ["builder", "Campaign builder", null],
    ["applicants", "Applicants", s.published && s.screening ? count : null],
    ["negotiation", "Agent negotiation", s.published && shortlisted ? shortlisted : null],
  ];
  return (
    <div>
      <div className="brandhead">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="mark" aria-hidden="true">HW</span>
          <div>
            <p style={{ fontWeight: 700 }}>Halden Works</p>
            <p className="small muted">Brand workspace · fictional brand</p>
          </div>
        </div>
        <nav className="tabs" aria-label="Brand sections">
          {tabs.map(([id, label, n]) => (
            <button key={id} type="button" aria-pressed={s.bTab === id} onClick={() => set({ bTab: id })}>
              {label}
              {n !== null && <span className="count">{n}</span>}
            </button>
          ))}
        </nav>
      </div>
      {s.bTab === "builder" && <Builder ctx={ctx} />}
      {s.bTab === "applicants" && <Applicants ctx={ctx} />}
      {s.bTab === "negotiation" && <Negotiation ctx={ctx} />}
    </div>
  );
}

/* ---------------- Campaign builder ---------------- */

function Builder({ ctx }: { ctx: Ctx }) {
  const { s, set, publish } = ctx;
  const c = s.c;
  const kb = listings(c).kb;
  const owned = c.type === "owned";
  const on = (k: keyof Campaign) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    set((p) => ({ c: { ...p.c, [k]: e.target.value }, error: "" }));

  return (
    <main className="wrap">
      <div className="pagehead">
        <div>
          <p className="eyebrow">New campaign brief</p>
          <h1>{c.product} · first-impressions campaign</h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {s.published ? <span className="st st-published">Published</span> : <span className="st st-draft">Draft</span>}
          <span className="chip sample">Sample data</span>
        </div>
      </div>

      <div className="cols">
        <div className="formcol">
          {s.published && (
            <div className="info green" role="status">
              <Check size={18} />
              <div>
                <strong>Brief published.</strong> Matched creators can see it now. Fields are locked: after a creator accepts, changes to fee, rights or deliverables need both sides to re-accept.
              </div>
            </div>
          )}
          <fieldset disabled={s.published}>
            <legend className="sr">Campaign brief</legend>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <section className="card section" aria-labelledby="s1">
                <h2 id="s1"><span className="num">1</span>Product</h2>
                <div className="grid2">
                  <div className="field"><label htmlFor="f-product">Product name</label><input id="f-product" className="input" value={c.product} onChange={on("product")} /></div>
                  <div className="field"><label htmlFor="f-sku">SKU</label><input id="f-sku" className="input" value={c.sku} onChange={on("sku")} /></div>
                </div>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="f-cat">Category</label>
                    <select id="f-cat" className="input" value={c.category} onChange={on("category")}>
                      <option value="Keyboards">Keyboards</option>
                      <option value="Stands">Stands</option>
                      <option value="Organization">Desk organization</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="f-compat">Compatibility</label>
                    <input id="f-compat" className="input" value={c.compat} onChange={on("compat")} />
                    <span className="help">Used to match creators with a compatible setup.</span>
                  </div>
                </div>
                <div className="field">
                  <span className="lab">Product photo</span>
                  <div className="photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img("keyboard.svg")} alt="Halden Loop 65 keyboard on an oak desk beside a mug and notebook" />
                    <div>
                      <p style={{ fontWeight: 600 }}>loop65-desk.jpg</p>
                      <p className="small muted">1200 × 900 · sample image (uploads are off in this demo)</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="card section" aria-labelledby="s2">
                <h2 id="s2"><span className="num">2</span>Campaign type</h2>
                <div className="opts" role="radiogroup" aria-labelledby="s2">
                  <label className="opt">
                    <input type="radio" name="ctype" value="owned" checked={owned} onChange={on("type")} />
                    <div><p className="t">Video delivered to the brand</p><p className="d">Creator sends the file. No post required. Brand uses it under the rights below.</p></div>
                  </label>
                  <label className="opt">
                    <input type="radio" name="ctype" value="sponsored" checked={!owned} onChange={on("type")} />
                    <div><p className="t">Sponsored post on creator’s channel</p><p className="d">Creator publishes the video with an #ad disclosure.</p></div>
                  </label>
                </div>
                {owned ? (
                  <div className="info cobalt">
                    <div>No follower minimum. Applicants are ranked by how closely their past videos match this product and format.</div>
                  </div>
                ) : (
                  <div className="grid2">
                    <div className="field">
                      <label htmlFor="f-min">Follower minimum</label>
                      <div className="affix"><input id="f-min" type="number" min={0} step={1000} value={c.followerMin} onChange={on("followerMin")} /><span>followers</span></div>
                      <span className="help">Applies to the channel the creator posts on.</span>
                    </div>
                    <div className="info" style={{ alignSelf: "end" }}>Applicants below the minimum are flagged, then ranked by relevant portfolio work.</div>
                  </div>
                )}
              </section>

              <section className="card section" aria-labelledby="s3">
                <h2 id="s3"><span className="num">3</span>Offer and deliverable</h2>
                <div className="grid2">
                  <div className="field"><label htmlFor="f-fee">Flat fee</label><div className="affix"><span>$</span><input id="f-fee" type="number" min={0} step={5} value={c.fee} onChange={on("fee")} /><span>USD</span></div></div>
                  <div className="field"><span className="lab">Posting requirement</span><div className="readonly">{owned ? "No post required: video delivered to the brand" : "Post required on the creator’s channel"}</div><span className="help">Set by the campaign type.</span></div>
                </div>
                <div className="field"><label htmlFor="f-del">Deliverable</label><input id="f-del" className="input" value={c.deliverable} onChange={on("deliverable")} /></div>
                <div className="grid2">
                  <div className="field"><label htmlFor="f-dl">Delivery deadline</label><div className="affix"><input id="f-dl" type="number" min={1} value={c.deadline} onChange={on("deadline")} /><span>days after the sample arrives</span></div></div>
                  <div className="field"><label htmlFor="f-rev">Brand review window</label><div className="affix"><input id="f-rev" type="number" min={1} value={c.review} onChange={on("review")} /><span>business days</span></div></div>
                </div>
              </section>

              <section className="card section" aria-labelledby="s4">
                <h2 id="s4"><span className="num">4</span>Samples and usage rights</h2>
                <div className="grid2">
                  <div className="field"><label htmlFor="f-qty">Sample quantity</label><div className="affix"><input id="f-qty" type="number" min={1} value={c.qty} onChange={on("qty")} /><span>units · one per accepted creator</span></div></div>
                  <div className="field">
                    <label htmlFor="f-ship">Ships to</label>
                    <select id="f-ship" className="input" value={c.ship} onChange={on("ship")}>
                      <option value="the contiguous U.S.">Contiguous U.S.</option>
                      <option value="all 50 U.S. states">All 50 U.S. states</option>
                    </select>
                    <span className="help">Brand pays shipping. Addresses are shared only after acceptance.</span>
                  </div>
                </div>
                <div className="field">
                  <span className="lab" id="own-l">Sample ownership</span>
                  <div className="opts" role="radiogroup" aria-labelledby="own-l">
                    <label className="opt"><input type="radio" name="own" value="keep" checked={c.own === "keep"} onChange={on("own")} /><div><p className="t">Creator keeps the sample</p><p className="d">No return needed.</p></div></label>
                    <label className="opt"><input type="radio" name="own" value="return" checked={c.own === "return"} onChange={on("own")} /><div><p className="t">Loaner: creator returns it</p><p className="d">Within 14 days. Brand pays return shipping.</p></div></label>
                  </div>
                </div>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="f-use">Content usage rights</label>
                    <select id="f-use" className="input" value={c.usage} onChange={on("usage")}>
                      <option value="30">Organic social · 30 days</option>
                      <option value="90">Organic social · 90 days</option>
                      <option value="180">Organic social · 180 days</option>
                    </select>
                  </div>
                  <div className="field"><span className="lab">Paid advertising rights</span><div className="readonly">Excluded</div><span className="help">Paid ad rights need a separate agreement with a stated duration.</span></div>
                </div>
              </section>

              <section className="card section" aria-labelledby="s5">
                <h2 id="s5"><span className="num">5</span>Brand agent limits <span className="chip">Private</span></h2>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="f-max">Highest fee the agent may agree to</label>
                    <div className="affix"><span>$</span><input id="f-max" type="number" min={0} step={5} value={c.maxFee} onChange={on("maxFee")} /><span>USD</span></div>
                    <span className="help">Never shown to creators or their agents.</span>
                  </div>
                  <div className="info" style={{ alignSelf: "end" }}>Agents draft terms only. You and the creator approve every final term sheet.</div>
                </div>
              </section>
            </div>
          </fieldset>
        </div>

        <aside className="prevcol" aria-label="Live offer preview">
          <p className="eyebrow">Live preview · what creators see</p>
          <article className="card fcard">
            <div className="fimg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img("keyboard.svg")} alt="" />
              <span className="fee">{kb.fee}</span>
            </div>
            <div className="fbody">
              <p className="fbrand"><span className="mark sm" aria-hidden="true">HW</span>Halden Works</p>
              <p className="ftitle">{c.product}</p>
              <div className="fchips"><span className="chip">{kb.post}</span><span className="chip">{kb.sample}</span></div>
              <p className="why"><Check /><span>Example match reason: “You’ve published three keyboard videos in the past 90 days.”</span></p>
            </div>
            <div className="tsec">
              <div className="hrow"><h3 className="h3">Offer terms</h3><span className="chip sample">Sample data</span></div>
              <TermsList rows={kb.terms} />
            </div>
          </article>
          {s.error && <p className="error" role="alert">{s.error}</p>}
          {s.published ? (
            <button type="button" className="btn primary block" onClick={() => set({ bTab: "applicants" })}>
              Screen applicants with You.com →
            </button>
          ) : (
            <>
              <button type="button" className="btn primary block" onClick={publish}>Publish brief</button>
              <p className="small muted">Creators see these exact terms. Payment and shipment tracking are handled outside this demo.</p>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

/* ---------------- Applicants + You.com screening ---------------- */

const domain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function SourceChips({ sources, dark }: { sources: Evidence[]; dark?: boolean }) {
  if (!sources.length) return null;
  return (
    <span className="srcs">
      {sources.map((e) => (
        <a key={e.url} className={`src ${dark ? "dark" : ""}`} href={e.url} target="_blank" rel="noreferrer" title={e.title}>
          {domain(e.url)}{e.date ? ` · ${e.date.slice(0, 10)}` : ""}
        </a>
      ))}
    </span>
  );
}

function youcomLabel(v: ScreeningView) {
  const y = v.youcom;
  if (v.offline) return { cls: "", text: "Starting criteria · live You.com search runs on the server version" };
  if (y.status === "off") return { cls: "", text: "You.com is off (no API key) · starting criteria" };
  if (y.status === "error") return { cls: "warn", text: "Live search unavailable right now · starting criteria" };
  if (y.status === "empty") return { cls: "warn", text: "You.com found nothing recent · starting criteria" };
  const when = y.fetchedAt ? new Date(y.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  return { cls: "live", text: `You.com live · ${y.queries.length} searches · ${y.sources} sources · past ${y.window === "month" ? "30 days" : "year"}${when ? ` · ${when}` : ""}` };
}

function Applicants({ ctx }: { ctx: Ctx }) {
  const { s, set, setApplicantStatus, runScreening } = ctx;
  const key = screeningKey(s);
  const stale = s.published && s.screeningFor !== key;
  useEffect(() => {
    if (stale && !s.screenRunning) runScreening();
  }, [stale, s.screenRunning, runScreening]);

  if (!s.published)
    return (
      <main className="wrap">
        <div className="card empty">
          <h1 style={{ fontSize: 24 }}>No applicants yet</h1>
          <p className="muted">Publish the keyboard brief so matched creators can apply.</p>
          <button type="button" className="btn primary" onClick={() => set({ bTab: "builder" })}>Go to campaign builder</button>
        </div>
      </main>
    );

  const c = s.c;
  const kb = listings(c).kb;
  const owned = c.type === "owned";
  const v = s.screening;
  const list = applicants(s);
  const selId = list.some((a) => a.id === s.selA) ? s.selA : list[0]?.id;
  const a = list.find((x) => x.id === selId);
  const shortlisted = list.filter((x) => x.status === "shortlisted").length;
  const label = v ? youcomLabel(v) : null;
  const counts = v?.counts;
  const funnel = counts
    ? [
        { label: "Applications", count: counts.total },
        { label: "Top 100 by today’s criteria", count: counts.shortlist },
        { label: owned ? "Meet the brief (ships to U.S., vertical, 3+ keyboard videos in 90 days)" : `Meet the brief (incl. ${fmtK(Number(c.followerMin) || 0)}+ followers)`, count: counts.passedChecks },
        { label: "Finalists for your review", count: counts.finalists },
      ]
    : [];

  return (
    <main className="wrap">
      <div className="pagehead">
        <div>
          <p className="eyebrow">Applicants · {c.product}</p>
          <h1>Review applicants</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Ranked by recent videos that show what buyers care about this month, not by follower count. {owned ? "Brand-owned video: no follower minimum." : `Sponsored post: ${fmtK(Number(c.followerMin) || 0)}+ followers.`}
          </p>
        </div>
        <div className="fchips">
          <span className="chip">{kb.fee} flat fee</span>
          <span className="chip">{owned ? "Video delivered to brand" : "Sponsored post"}</span>
          <span className="chip">{kb.sample}</span>
          <span className="chip sample">Sample applicants</span>
        </div>
      </div>

      <div className="scrgrid">
        <section className="card section" aria-labelledby="crit-h">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h2 id="crit-h">What buyers care about this month</h2>
            <button type="button" className="textbtn" onClick={runScreening} disabled={s.screenRunning}>{s.screenRunning ? "Searching…" : "Search again"}</button>
          </div>
          {label && <span className={`livepill ${label.cls}`}>{label.text}</span>}
          {!v && <p className="muted small">Reading today’s web with You.com…</p>}
          {v && (
            <div className="funnel">
              {v.rubric.criteria.map((cr) => (
                <div key={cr.id} className="step">
                  <div className="row"><span>{cr.label}</span><span className="num">{Math.round(cr.weight * 100)}%</span></div>
                  <div className="bar"><span style={{ width: `${Math.round(cr.weight * 100)}%` }} /></div>
                  {cr.evidence.length > 0 && <SourceChips sources={cr.evidence} />}
                </div>
              ))}
            </div>
          )}
          {v?.rubric.note && v.youcom.status !== "off" && <p className="small muted">{v.rubric.note}</p>}
        </section>

        <section className="card section" aria-labelledby="scr-h">
          <h2 id="scr-h">Screening</h2>
          {!v && <p className="muted small">Ranking 1,000 sample applicants…</p>}
          {v && (
            <div className="funnel">
              {funnel.map((f) => (
                <div key={f.label} className="step">
                  <div className="row"><span>{f.label}</span><span className="num">{f.count.toLocaleString()}</span></div>
                  <div className="bar"><span style={{ width: `${Math.max((f.count / funnel[0].count) * 100, 1.5)}%` }} /></div>
                </div>
              ))}
            </div>
          )}
          {v && (
            <details className="small">
              <summary>See the top 100</summary>
              <ol className="top100">
                {v.shortlist.map((x) => (
                  <li key={x.id}><span>{x.name} <span className="muted">{x.handle}</span></span><span className="num">{x.score}</span></li>
                ))}
              </ol>
            </details>
          )}
          <p className="small muted">Screening ranks and explains; you make every shortlist decision. It never uses inferred traits such as politics or income.</p>
        </section>
      </div>

      <div className="split">
        <div className="alist" role="group" aria-label="Finalists, ranked by score">
          {list.map((x) => (
            <button key={x.id} type="button" className="aitem" aria-pressed={x.id === selId} onClick={() => set({ selA: x.id })}>
              <span className="rank" aria-label={`Rank ${x.rank}`}>{x.rank}</span>
              <span className="avatar">{x.initials}</span>
              <span style={{ flex: 1, minWidth: 0, display: "block" }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <span className="nm">{x.name}</span>
                  <Status status={dealStatus(s, x.id)} />
                </span>
                <span className="meta" style={{ display: "block" }}>{x.handle} · {x.platform} · {x.followers}</span>
                <span className="fit" style={{ display: "block" }}>Score {x.score} · {x.recentCategoryVideos} keyboard videos in 90 days</span>
                {x.isNew && <span className="chip cobalt" style={{ marginTop: 6 }}>New application</span>}
              </span>
            </button>
          ))}
          {v && !s.apps.kb && <div className="info" style={{ fontSize: 13 }}>Maya Okafor hasn’t applied yet. Switch to Creator view to apply as Maya; screening re-runs with her in the pool.</div>}
          {v && list.length === 0 && <div className="info" style={{ fontSize: 13 }}>No applicant meets every requirement of this brief.</div>}
          {shortlisted > 0 && (
            <button type="button" className="btn primary block" onClick={() => set({ bTab: "negotiation" })}>
              Negotiate with {shortlisted} shortlisted {shortlisted === 1 ? "creator" : "creators"} →
            </button>
          )}
        </div>
        {a && v && <ApplicantPanel ctx={ctx} a={a} rubric={v.rubric} setApplicantStatus={setApplicantStatus} />}
      </div>
    </main>
  );
}

function ApplicantPanel({ ctx, a, rubric, setApplicantStatus }: { ctx: Ctx; a: RankedApplicant; rubric: Rubric; setApplicantStatus: Ctx["setApplicantStatus"] }) {
  const status = dealStatus(ctx.s, a.id);
  const evidenceFor = (id: string) => rubric.criteria.find((c) => c.id === id)?.evidence ?? [];
  return (
    <section className="card apanel" aria-labelledby="ap-name">
      <div className="ahead">
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <span className="avatar lg">{a.initials}</span>
          <div>
            <h2 id="ap-name" style={{ fontSize: 24 }}>{a.name}</h2>
            <p className="muted">{a.handle} · {a.platform}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="score"><strong>{a.score}</strong><small>score</small></span>
          <Status status={status} />
        </div>
      </div>

      <div className="vfeature">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="eyebrow">Submitted video</p>
          <Thumb src={a.video.img} pos={a.video.pos} dur={a.video.dur} plat={a.platform} playSize={20} alt={`Thumbnail: ${a.video.title}`} />
        </div>
        <div className="fitcol">
          <div>
            <h3 style={{ fontSize: 19, lineHeight: 1.3 }}>“{a.video.title}”</h3>
            <p className="small muted" style={{ marginTop: 4 }}>{a.video.dur} · posted {a.video.date} · {a.video.views} views <SelfReported /></p>
          </div>
          <ul className="lists">
            {a.fit.map((f) => (
              <li key={f}><Check color="#1F4FD8" /><span>{f}</span></li>
            ))}
          </ul>
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>Why it fits this month’s criteria</p>
            <ul className="lists">
              {a.matched.map((m) => (
                <li key={m.id}>
                  <Check color="#1F4FD8" />
                  <span>
                    <strong>{m.label}</strong>: shown in {m.videos.map((t) => `“${t}”`).join(", ")}
                    <SourceChips sources={evidenceFor(m.id)} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {a.note && (
            <div>
              <p className="eyebrow" style={{ marginBottom: 6 }}>Note from {a.first}</p>
              <p className="quote">{a.note}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Supporting context</p>
        <div className="stats">
          <div className="stat"><p className="small muted">Platform</p><p className="sv">{a.platform}</p><p className="sn">{a.handle}</p></div>
          <div className="stat"><p className="small muted">Audience</p><p className="sv">{a.followers}</p><SelfReported /><p className="sn">{a.metricDate}</p></div>
          <div className="stat"><p className="small muted">Recent views</p><p className="sv">{a.median}</p><SelfReported /><p className="sn">Median of last 10 videos</p></div>
        </div>
      </div>

      <div className="actions">
        {a.status === "applied" ? (
          <>
            <button type="button" className="btn primary" onClick={() => setApplicantStatus(a.id, "shortlisted", `${a.first} shortlisted. Their application now shows “Shortlisted.”`)}>Shortlist</button>
            <button type="button" className="btn danger" onClick={() => setApplicantStatus(a.id, "declined", `${a.first} declined.`)}>Decline</button>
            <p className="small muted" style={{ flex: "1 1 220px" }}>Shortlisting lets your agent negotiate with {a.first}’s agent. Nothing is final until you both approve.</p>
          </>
        ) : (
          <>
            <p style={{ fontWeight: 600, flex: "1 1 260px" }}>
              {a.status === "shortlisted" ? `Shortlisted. ${a.first} now sees “Shortlisted” on this application.` : `Declined. ${a.first} sees “Declined” on this application.`}
            </p>
            {a.status === "shortlisted" && (
              <button type="button" className="btn primary" onClick={() => ctx.set({ bTab: "negotiation" })}>Go to negotiation</button>
            )}
            <button type="button" className="btn sec" onClick={() => setApplicantStatus(a.id, "applied", "Status reset to Applied.")}>Undo</button>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------------- Agent negotiation ---------------- */

function researchLabel(r: NonNullable<Ctx["s"]["research"]>) {
  if (r.pending) return { cls: "", text: "You.com Research: checking public creator rates…" };
  if (r.status !== "live" || !r.content) return { cls: "warn", text: `You.com Research unavailable${r.error ? ` (${r.error})` : ""}` };
  const lo = Number(r.content.fee_low_usd), hi = Number(r.content.fee_high_usd);
  const range = Number.isFinite(lo) && Number.isFinite(hi) ? `typical $${lo}–$${hi}` : "answer received";
  return { cls: "live", text: `You.com Research: ${range}${r.seconds ? ` · ${r.seconds}s` : ""}` };
}

function Negotiation({ ctx }: { ctx: Ctx }) {
  const { s, set, runNegotiation, approve } = ctx;
  const list = applicants(s).filter((a) => a.status === "shortlisted");
  if (!s.published || !list.length)
    return (
      <main className="wrap">
        <div className="card empty">
          <h1 style={{ fontSize: 24 }}>Shortlist creators first</h1>
          <p className="muted">Your agent negotiates only with creators you’ve shortlisted.</p>
          <button type="button" className="btn primary" onClick={() => set({ bTab: s.published ? "applicants" : "builder" })}>
            {s.published ? "Review applicants" : "Go to campaign builder"}
          </button>
        </div>
      </main>
    );

  const base = campaignTerms(s.c);
  const started = list.some((a) => s.lanes[a.id]);
  const agreed = list.filter((a) => s.lanes[a.id]?.outcome === "agreed");
  const total = agreed.reduce((sum, a) => sum + (s.lanes[a.id]?.terms?.fee ?? 0), 0);

  return (
    <main className="wrap">
      <div className="agentbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="mark" style={{ background: "#F5F2EC", color: "#1D1D1F" }} aria-hidden="true">HW</span>
          <div>
            <p style={{ fontWeight: 700 }}>Halden Works brand agent</p>
            <p className="small" style={{ color: "#C9C5BC" }}>Negotiates with each shortlisted creator’s agent in parallel · fee cap ${s.c.maxFee} (private)</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {started && <span className={`mode ${s.negLive ? "live" : ""}`}>{s.negLive === null ? "connecting…" : s.negLive ? "Live Claude agents" : "Scripted replay"}</span>}
          {s.negLive && s.research && <span className={`mode ${researchLabel(s.research).cls === "live" ? "live" : ""}`} title={s.research.sources.map((x) => x.url).join("\n")}>{researchLabel(s.research).text}</span>}
          {s.negLive && s.news && <span className={`mode ${s.news.status === "live" ? "live" : ""}`}>Creator agents: {s.news.status === "live" ? `${s.news.results.length} launch sources` : "no live news"}</span>}
          <button type="button" className="btn primary" disabled={s.negRunning} onClick={runNegotiation}>
            {s.negRunning ? "Negotiating…" : started ? "Re-run agents" : `Start agents (${list.length})`}
          </button>
        </div>
      </div>

      {s.negNotice && <div className="info" style={{ marginBottom: 16 }}>{s.negNotice}</div>}
      {started && s.negLive === false && <div className="info" style={{ marginBottom: 16 }}>Replay of a scripted run: the agents’ messages are pre-written and cite no live sources. Live agents, You.com evidence and Research run on the server version with API keys.</div>}
      {!started && (
        <div className="info cobalt" style={{ marginBottom: 16 }}>
          Opening offer for every creator: ${base.fee} flat fee, {base.deadline}, {base.usageRights.toLowerCase()}, {base.keepSample ? "creator keeps the sample" : "loaner sample"}. Each creator’s agent has its own private minimum.
        </div>
      )}

      <div className="lanes">
        {list.map((a) => (
          <LaneView key={a.id} a={a} lane={s.lanes[a.id]} baseDeadline={base.deadline} baseUsage={base.usageRights} basePayment={base.payment} onApprove={() => approve(a.id, "brand")} />
        ))}
      </div>

      <div className="card summary">
        <p className="small">
          <strong>{agreed.length}/{list.length} term sheets agreed by agents</strong>
          <span className="muted"> · total ${total.toLocaleString()}{agreed.length ? ` · average $${Math.round(total / agreed.length)} per video` : ""}</span>
        </p>
        <p className="small muted">Agents shortlist and draft. Brand and creator approve every final term sheet.</p>
      </div>
    </main>
  );
}

function LaneView({ a, lane, baseDeadline, baseUsage, basePayment, onApprove }: { a: RankedApplicant; lane?: Lane; baseDeadline: string; baseUsage: string; basePayment: string; onApprove: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const n = lane?.turns.length ?? 0;
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [n, lane?.thinking]);
  const round = Math.ceil((n + 1) / 2);
  const pill = !lane ? null : lane.outcome === "agreed" ? <span className="st st-agreed">Agreed</span> : lane.outcome === "failed" ? <span className="st st-nodeal">Agent error</span> : lane.outcome === "no-deal" || lane.outcome === "walked" ? <span className="st st-nodeal">No deal</span> : <span className="st st-negotiating">Round {round}</span>;

  return (
    <section className="card lane" aria-label={`Negotiation with ${a.name}`}>
      <div className="lh">
        <span className="avatar">{a.initials}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14 }}>{a.first}’s agent</p>
          <p className="small muted">{a.handle} · {a.followers}</p>
        </div>
        {pill}
      </div>
      <div ref={box} className="chat" aria-live="polite">
        {!lane && <p className="small muted">Waiting to start.</p>}
        {lane?.turns.map((t, i) => (
          <div key={i} className={`bubble ${t.from} pop`}>
            <p className="who">{t.from === "brand" ? "Halden agent" : `${a.first}’s agent`} · {t.status}{t.usedResearch ? " · used Research" : ""}</p>
            <p>{t.text}</p>
            <SourceChips sources={t.sources ?? []} dark={t.from === "creator"} />
            <div className="tchips">
              <span className={`tchip ${t.status === "accept" ? "ok" : ""}`}>${t.terms.fee}</span>
              {t.terms.deadline !== baseDeadline && <span className={`tchip ${t.status === "accept" ? "ok" : ""}`}>{t.terms.deadline}</span>}
              {t.terms.usageRights !== baseUsage && <span className={`tchip ${t.status === "accept" ? "ok" : ""}`}>{t.terms.usageRights}</span>}
              {t.terms.payment !== basePayment && <span className={`tchip ${t.status === "accept" ? "ok" : ""}`}>Paid {t.terms.payment.toLowerCase()}</span>}
            </div>
          </div>
        ))}
        {lane?.thinking && (
          <div className={`typing ${lane.thinking}`} aria-label={`${lane.thinking === "brand" ? "Halden agent" : `${a.first}’s agent`} is typing`}>
            <span>•</span><span>•</span><span>•</span>
          </div>
        )}
        {lane?.error && <p className="error small">{lane.error}</p>}
      </div>
      {lane?.outcome === "agreed" && lane.terms && (
        <div className="sheet pop">
          <p style={{ fontWeight: 700 }}>Draft term sheet</p>
          <dl>
            <dt>Fee</dt><dd>${lane.terms.fee}</dd>
            <dt>Due</dt><dd>{lane.terms.deadline}</dd>
            <dt>Usage</dt><dd>{lane.terms.usageRights}</dd>
            <dt>Payment</dt><dd>{lane.terms.payment}</dd>
            <dt>Sample</dt><dd>{lane.terms.keepSample ? "Creator keeps it" : "Return it"}</dd>
          </dl>
          {lane.terms.deliverable.includes("honest con") && <p className="small muted">Creator may mention one honest con on camera.</p>}
          <div className="approvals">
            <span className={`st ${lane.brandOk ? "st-confirmed" : "st-draft"}`}>Brand {lane.brandOk ? "approved" : "pending"}</span>
            <span className={`st ${lane.creatorOk ? "st-confirmed" : "st-draft"}`}>{a.first} {lane.creatorOk ? (a.id === "maya" ? "accepted" : "accepted (simulated)") : "pending"}</span>
          </div>
          {!lane.brandOk ? (
            <button type="button" className="btn primary block" onClick={onApprove}>Approve term sheet</button>
          ) : lane.creatorOk ? (
            <p className="small" style={{ fontWeight: 600, color: "#1E6B35" }}>Deal confirmed · sample slot reserved</p>
          ) : (
            <p className="small muted">Waiting for {a.first} to accept in the creator view.</p>
          )}
        </div>
      )}
    </section>
  );
}
