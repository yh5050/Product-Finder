"use client";

import { VIDEOS } from "@/lib/data";
import { dealStatus, listings } from "@/lib/model";
import type { Ctx } from "./ctx";
import { Back, Check, SelfReported, Status, TermsList, Thumb } from "./ui";

export default function CreatorView({ ctx }: { ctx: Ctx }) {
  const { s, set } = ctx;
  const showTabs = s.cScr === "feed" || s.cScr === "apps";
  const myCount = Object.keys(s.apps).length;
  const kbStatus = s.apps.kb ? dealStatus(s, "maya") : "";

  return (
    <div className="cstage">
      <div className="phone" role="region" aria-label="Creator app, mobile view">
        <div className="phead">
          <p className="wordmark">Un<span>boxed</span></p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="small muted">@mayasdesk</span>
            <span className="avatar" aria-hidden="true">MO</span>
          </div>
        </div>
        {showTabs && (
          <nav className="ptabs" aria-label="Creator sections">
            <button type="button" aria-pressed={s.cScr !== "apps"} onClick={() => set({ cScr: "feed" })}>Opportunities</button>
            <button type="button" aria-pressed={s.cScr === "apps"} onClick={() => set({ cScr: "apps" })}>My applications ({myCount})</button>
          </nav>
        )}
        {s.cScr === "feed" && <Feed ctx={ctx} />}
        {s.cScr === "detail" && <Detail ctx={ctx} />}
        {s.cScr === "review" && <Review ctx={ctx} />}
        {s.cScr === "done" && <Done ctx={ctx} />}
        {s.cScr === "apps" && <MyApps ctx={ctx} />}
      </div>

      <aside className="side" aria-label="About this view">
        <div className="card">
          <p className="eyebrow">Creator view</p>
          <p style={{ fontWeight: 600, marginTop: 6 }}>Mobile-first, shown at phone width</p>
          <p className="small muted" style={{ marginTop: 6 }}>
            Signed in as Maya Okafor, a fictional desk-setup creator: TikTok, 24.8K followers (self-reported), 4 videos in the past 90 days.
          </p>
        </div>
        <div className="card">
          <p className="eyebrow">Application status</p>
          <p style={{ marginTop: 8 }}>
            {kbStatus ? <Status status={kbStatus} /> : <span className="st st-draft">{s.published ? "Not applied" : "Brief not published"}</span>}
          </p>
          <p className="small muted" style={{ marginTop: 8 }}>Keyboard brief from Halden Works. Updates when the brand or the agents act.</p>
        </div>
      </aside>
    </div>
  );
}

function statusFor(ctx: Ctx, listingId: string) {
  const app = ctx.s.apps[listingId];
  if (!app) return "";
  return listingId === "kb" ? dealStatus(ctx.s, "maya") : app.status;
}

function open(ctx: Ctx, id: string) {
  const l = listings(ctx.s.c)[id];
  const a = ctx.s.apps[id];
  ctx.set({ cScr: "detail", listing: id, pick: a ? a.video : l.rel[0], note: a ? a.note : "" });
}

function Feed({ ctx }: { ctx: Ctx }) {
  const { s, set } = ctx;
  const all = listings(s.c);
  const feed = [all.kb, all.stand, all.org].filter((l) => {
    if (l.id === "kb" && !s.published) return false;
    if (s.fCat !== "all" && l.cat !== s.fCat) return false;
    if (s.fPost === "req" && !l.postReq) return false;
    if (s.fPost === "none" && l.postReq) return false;
    return true;
  });
  const cats: [string, string][] = [["all", "All"], ["Keyboards", "Keyboards"], ["Stands", "Stands"], ["Organization", "Organization"]];
  const posts: [string, string][] = [["any", "Any"], ["req", "Post required"], ["none", "No post"]];

  return (
    <div className="pbody">
      <div>
        <h1 className="h2">Matched for you</h1>
        <p className="small muted" style={{ marginTop: 4 }}>Based on 4 videos from the past 90 days on TikTok</p>
      </div>
      <div className="filters">
        <div className="frow" role="group" aria-label="Filter by category">
          <span className="lab" aria-hidden="true">Category</span>
          {cats.map(([v, label]) => (
            <button key={v} type="button" className="fchip" aria-pressed={s.fCat === v} onClick={() => set({ fCat: v })}>{label}</button>
          ))}
        </div>
        <div className="frow" role="group" aria-label="Filter by posting requirement">
          <span className="lab" aria-hidden="true">Posting</span>
          {posts.map(([v, label]) => (
            <button key={v} type="button" className="fchip" aria-pressed={s.fPost === v} onClick={() => set({ fPost: v })}>{label}</button>
          ))}
        </div>
      </div>
      <p className="small muted" aria-live="polite">{feed.length} {feed.length === 1 ? "opportunity" : "opportunities"} · sample data</p>
      {feed.map((l) => {
        const st = statusFor(ctx, l.id);
        return (
          <article key={l.id} className="card fcard">
            <button type="button" className="fbtn" onClick={() => open(ctx, l.id)} aria-label={`${l.title} from ${l.brand}, ${l.fee}. View offer`}>
              <span className="fimg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.img} alt="" />
                <span className="fee">{l.fee}</span>
                {st && <Status status={st} style={{ position: "absolute", right: 12, top: 12 }} />}
              </span>
              <span className="fbody">
                <span className="fbrand"><span className="mark sm" aria-hidden="true">{l.mark}</span>{l.brand}</span>
                <span className="ftitle">{l.title}</span>
                <span className="fchips"><span className="chip">{l.post}</span><span className="chip">{l.sample}</span></span>
                <span className="why"><Check /><span>{l.match}</span></span>
              </span>
            </button>
          </article>
        );
      })}
      {feed.length === 0 && (
        <div className="info">
          No matches for these filters.{" "}
          <button type="button" className="textbtn" style={{ padding: 0, minHeight: 0 }} onClick={() => set({ fCat: "all", fPost: "any" })}>Clear filters</button>
        </div>
      )}
      {!s.published && (s.fCat === "all" || s.fCat === "Keyboards") && (
        <div className="info cobalt" style={{ flexDirection: "column", gap: 8 }}>
          <p><strong>A keyboard brief is coming.</strong> Halden Works hasn’t published it yet.</p>
          <button type="button" className="btn sec" onClick={() => set({ role: "brand" })}>Switch to Brand view to publish</button>
        </div>
      )}
    </div>
  );
}

function Detail({ ctx }: { ctx: Ctx }) {
  const { s, set, approve } = ctx;
  const L = listings(s.c)[s.listing];
  const app = s.apps[L.id];
  const st = statusFor(ctx, L.id);
  const lane = L.id === "kb" ? s.lanes.maya : undefined;
  const videoTitle = app ? VIDEOS[app.video].title : "";
  const msg: Record<string, string> = {
    applied: `You applied with “${videoTitle}.” ${L.brand} hasn’t reviewed it yet.`,
    shortlisted: `${L.brand} shortlisted you based on your “${videoTitle}” video. Their agent will negotiate terms with yours.`,
    negotiating: `Your agent is negotiating with ${L.brand}’s agent now. Nothing is final until you approve.`,
    agreed: "Your agent and the brand’s agent agreed on terms. Review and accept below.",
    confirmed: "Deal confirmed by both sides. The brand will ship your sample.",
    nodeal: "The agents didn’t reach terms this time.",
    declined: `${L.brand} went with other creators this time.`,
  };
  const banner = st === "declined" || st === "nodeal" ? "declined" : st === "confirmed" ? "shortlisted" : "applied";

  return (
    <div className="pbody">
      <button type="button" className="backbtn" onClick={() => set({ cScr: "feed" })}><Back />Opportunities</button>
      <div className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={L.img} alt={L.alt} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="fbrand"><span className="mark sm" aria-hidden="true">{L.mark}</span>{L.brand} <span className="chip sample" style={{ marginLeft: "auto" }}>Sample data</span></p>
        <h1 className="h2">{L.title}</h1>
        <p className="small muted">{L.blurb}</p>
        <div className="fchips"><span className="chip cobalt">{L.fee} flat fee</span><span className="chip">{L.post}</span><span className="chip">{L.sample}</span></div>
      </div>

      {st && (
        <div className={`banner ${st === "shortlisted" ? "shortlisted" : banner}`} role="status">
          <Status status={st} style={{ background: "#FFFFFF" }} />
          <p className="small">{msg[st]}</p>
        </div>
      )}

      {lane?.outcome === "agreed" && lane.terms && (
        <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }} aria-labelledby="ts-h">
          <h2 id="ts-h" className="h3">Term sheet your agent agreed</h2>
          <dl className="terms">
            <dt>Fee</dt><dd><p className="v">${lane.terms.fee} flat fee</p><p className="n">Posted offer was {L.fee}</p></dd>
            <dt>Due</dt><dd><p className="v">{lane.terms.deadline}</p></dd>
            <dt>Usage</dt><dd><p className="v">{lane.terms.usageRights}</p><p className="n">Paid advertising rights excluded</p></dd>
            <dt>Payment</dt><dd><p className="v">{lane.terms.payment}</p></dd>
            <dt>Sample</dt><dd><p className="v">{lane.terms.keepSample ? "You keep it" : "Return it"}</p></dd>
          </dl>
          <div className="approvals">
            <span className={`st ${lane.brandOk ? "st-confirmed" : "st-draft"}`}>Halden {lane.brandOk ? "approved" : "pending"}</span>
            <span className={`st ${lane.creatorOk ? "st-confirmed" : "st-draft"}`}>You {lane.creatorOk ? "accepted" : "pending"}</span>
          </div>
          {!lane.creatorOk ? (
            <button type="button" className="btn primary block" onClick={() => approve("maya", "creator")}>Accept term sheet</button>
          ) : !lane.brandOk ? (
            <p className="small muted">Waiting for Halden Works to approve.</p>
          ) : null}
        </section>
      )}

      <section className="callout" aria-labelledby="why-h">
        <h2 id="why-h" className="eyebrow" style={{ color: "#1D2E66" }}>Why this matches you</h2>
        <p className="reason"><Check size={18} /><span>{L.match}</span></p>
        <p className="small" style={{ color: "#1D2E66" }}>{L.matchSub}</p>
        <div className="vrow">
          {L.rel.map((id) => {
            const v = VIDEOS[id];
            const chosen = s.pick === id && !app;
            return (
              <button key={id} type="button" className="vcard" aria-pressed={chosen} onClick={() => !app && set({ pick: id })}
                aria-label={`${v.title}. ${app ? "Your video" : chosen ? "Selected for your application" : "Select for your application"}`}>
                <Thumb src={v.img} pos={v.pos} dur={v.dur} className="short" />
                <span className="vt">{v.title}</span>
                <span className="vm">{v.date} · {v.views} views</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card" aria-labelledby="terms-h" style={{ padding: "4px 16px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 6px" }}>
          <h2 id="terms-h" className="h3">Offer terms</h2>
          <span className="small muted">Same terms the brand sees</span>
        </div>
        <TermsList rows={L.terms} extra={<><dt>Works with</dt><dd><p className="v">{L.compat}</p></dd></>} />
      </section>

      {!app && (
        <section className="card" aria-labelledby="apply-h" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 id="apply-h" className="h3">Apply with a past video</h2>
          <div className="pick" role="radiogroup" aria-labelledby="apply-h">
            {["v1", "v2", "v3", "v4"].map((id) => {
              const v = VIDEOS[id];
              return (
                <label key={id} className="pitem">
                  <input type="radio" name="vid" value={id} checked={s.pick === id} onChange={() => set({ pick: id })} />
                  <span className="thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.img} alt="" style={{ objectPosition: v.pos }} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="pt" style={{ display: "block" }}>{v.title}</span>
                    <span className="pm" style={{ display: "block" }}>{v.date} · {v.dur} · {v.views} views</span>
                  </span>
                  {L.relevant.includes(id) && <span className="chip cobalt">Relevant</span>}
                </label>
              );
            })}
          </div>
          <div className="field">
            <label htmlFor="f-note">Note to {L.brand} (optional)</label>
            <textarea id="f-note" className="input" value={s.note} onChange={(e) => set({ note: e.target.value })} placeholder="One line on your angle for this product" />
          </div>
          <button type="button" className="btn primary block" onClick={() => set({ cScr: "review" })}>Review application</button>
        </section>
      )}
    </div>
  );
}

function Review({ ctx }: { ctx: Ctx }) {
  const { s, set, apply } = ctx;
  const L = listings(s.c)[s.listing];
  const v = VIDEOS[s.pick];
  return (
    <div className="pbody">
      <button type="button" className="backbtn" onClick={() => set({ cScr: "detail" })}><Back />Edit application</button>
      <div>
        <p className="eyebrow">Step 2 of 2</p>
        <h1 className="h2" style={{ marginTop: 4 }}>Review before you apply</h1>
        <p className="small muted" style={{ marginTop: 4 }}>{L.title} · {L.brand}</p>
      </div>
      <section className="card" style={{ padding: 14, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span className="thumb" style={{ width: 84, flex: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.img} alt="" style={{ objectPosition: v.pos }} />
          <span className="dur">{v.dur}</span>
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <p className="eyebrow">Your video</p>
          <p style={{ fontWeight: 600 }}>{v.title}</p>
          <p className="small muted">{v.date} · {v.views} views</p>
          {s.note.trim() && <p className="small" style={{ marginTop: 4 }}>Note: “{s.note}”</p>}
        </div>
      </section>
      <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 className="h3">You receive</h2>
        <ul className="lists">{L.receive.map((r) => <li key={r}><Check color="#1E6B35" /><span>{r}</span></li>)}</ul>
        <h2 className="h3" style={{ marginTop: 8 }}>You owe</h2>
        <ul className="lists">{L.owe.map((r) => <li key={r}><span aria-hidden="true" style={{ fontWeight: 700 }}>→</span><span>{r}</span></li>)}</ul>
      </section>
      <section className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 className="h3">Shared with {L.brand}</h2>
        <p className="small">Maya Okafor · @mayasdesk · TikTok · 24.8K followers <SelfReported /></p>
        <p className="small muted">Your shipping address is shared only if a deal is confirmed. If you’re shortlisted, your agent may negotiate within limits you set.</p>
      </section>
      <button type="button" className="btn primary block" onClick={apply}>Apply</button>
      <button type="button" className="btn sec block" onClick={() => set({ cScr: "detail" })}>Edit</button>
    </div>
  );
}

function Done({ ctx }: { ctx: Ctx }) {
  const { s, set } = ctx;
  const L = listings(s.c)[s.listing];
  const st = statusFor(ctx, L.id);
  return (
    <div className="pbody">
      <div className="done" role="status">
        <span className="ok" aria-hidden="true"><Check size={30} color="#FFFFFF" /></span>
        <h1 className="h2">Application sent</h1>
        <Status status={st} />
        <p className="muted">{L.brand} reviews applicants for the {L.title}. If they shortlist you, this application will show “Shortlisted.”</p>
      </div>
      <section className="card" style={{ padding: "4px 16px 12px" }}>
        <dl className="terms">
          <dt>Video</dt><dd><p className="v">{VIDEOS[s.pick].title}</p></dd>
          <dt>Fee</dt><dd><p className="v">{L.fee} flat fee</p></dd>
          <dt>Sample</dt><dd><p className="v">{L.sample}</p></dd>
        </dl>
      </section>
      <button type="button" className="btn primary block" onClick={() => set({ cScr: "apps" })}>View my applications</button>
      <button type="button" className="btn sec block" onClick={() => set({ cScr: "feed" })}>Back to opportunities</button>
    </div>
  );
}

function MyApps({ ctx }: { ctx: Ctx }) {
  const { s, set } = ctx;
  const all = listings(s.c);
  const ids = Object.keys(s.apps);
  return (
    <div className="pbody">
      <h1 className="h2">My applications</h1>
      {ids.map((id) => {
        const l = all[id];
        const lane = id === "kb" ? s.lanes.maya : undefined;
        const fee = lane?.outcome === "agreed" && lane.terms ? `$${lane.terms.fee} agreed` : l.fee;
        return (
          <button key={id} type="button" className="arow" onClick={() => open(ctx, id)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={l.img} alt="" />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontWeight: 600 }}>{l.title}</span>
              <span className="small muted">{l.brand} · {fee} · applied with “{VIDEOS[s.apps[id].video].title}”</span>
              <Status status={statusFor(ctx, id)} style={{ alignSelf: "flex-start" }} />
            </span>
          </button>
        );
      })}
      {ids.length === 0 && (
        <>
          <div className="info">You haven’t applied to anything yet.</div>
          <button type="button" className="btn sec" onClick={() => set({ cScr: "feed" })}>Browse opportunities</button>
        </>
      )}
    </div>
  );
}
