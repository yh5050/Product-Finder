"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/data";
import { applicants, dealStatus, initialState, kbTerms, screeningKey, type Lane, type State } from "@/lib/model";
import { replay, type NegotiationEvent } from "@/lib/scripts";
import { baselineRubric } from "@/lib/rubric";
import { applicantPool, requirements, screen, toView, type ScreeningView } from "@/lib/screening";
import type { Ctx, Patch } from "@/components/ctx";
import BrandView from "@/components/Brand";
import CreatorView from "@/components/Creator";

export default function Home() {
  const [s, setS] = useState<State>(initialState);
  const stateRef = useRef(s);
  stateRef.current = s;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runId = useRef(0);

  const set = useCallback((p: Patch) => setS((prev) => ({ ...prev, ...(typeof p === "function" ? p(prev) : p) })), []);

  const say = useCallback(
    (msg: string) => {
      set({ toast: msg });
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => set({ toast: "" }), 4000);
    },
    [set],
  );
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Scroll to the top when the screen changes.
  const screenKey = `${s.role}-${s.bTab}-${s.cScr}-${s.listing}`;
  const lastKey = useRef(screenKey);
  useEffect(() => {
    if (lastKey.current !== screenKey) window.scrollTo(0, 0);
    lastKey.current = screenKey;
  }, [screenKey]);

  const publish = () => {
    const c = stateRef.current.c;
    if (!(Number(c.fee) > 0)) return set({ error: "Add a flat fee above $0 before publishing." });
    if (!c.deliverable.trim()) return set({ error: "Describe the deliverable before publishing." });
    if (!(Number(c.qty) > 0)) return set({ error: "Add at least one sample unit." });
    if (Number(c.maxFee) < Number(c.fee)) return set({ error: "The agent’s fee cap must be at least the posted fee." });
    set({ published: true, error: "" });
    say("Brief published. Matched creators can see it now.");
  };

  const apply = () => {
    const cur = stateRef.current;
    set({
      apps: { ...cur.apps, [cur.listing]: { status: "applied", video: cur.pick, note: cur.note.trim() } },
      cScr: "done",
      selA: cur.listing === "kb" ? "maya" : cur.selA,
    });
    say("Applied. Status: Applied.");
  };

  const setApplicantStatus: Ctx["setApplicantStatus"] = (id, status, msg) => {
    set((prev) => {
      const lanes = { ...prev.lanes };
      if (status !== "shortlisted") delete lanes[id];
      if (id === "maya") return { apps: { ...prev.apps, kb: { ...prev.apps.kb, status } }, lanes };
      return { others: { ...prev.others, [id]: status }, lanes };
    });
    if (msg) say(msg);
  };

  const onEvent = (ev: NegotiationEvent, id: number) => {
    if (runId.current !== id) return;
    if (ev.type === "mode") return set(ev.live ? { negLive: true, research: { status: "off", content: null, sources: [], pending: true } } : { negLive: false, research: null });
    if (ev.type === "end") return set({ negRunning: false });
    if (ev.type === "research") return set({ research: { status: ev.status, content: ev.content, sources: ev.sources, error: ev.error, seconds: ev.seconds } });
    if (ev.type === "creatorEvidence") return set({ news: { status: ev.status, results: ev.results, error: ev.error } });
    if (ev.type === "notice") return set({ negNotice: ev.message });
    if (ev.type === "fatal") return set({ negNotice: ev.message, negRunning: false });
    const cid = ev.creatorId;
    set((prev) => {
      const l: Lane = { ...(prev.lanes[cid] ?? { turns: [], thinking: null }) };
      if (ev.type === "thinking") l.thinking = ev.from;
      if (ev.type === "turn") { l.turns = [...l.turns, ev.turn]; l.thinking = null; }
      if (ev.type === "done") {
        l.outcome = ev.outcome; l.terms = ev.terms; l.thinking = null;
        // Seeded creators accept on their side automatically; Maya accepts in the creator view.
        if (cid !== "maya" && ev.outcome === "agreed") l.creatorOk = true;
      }
      if (ev.type === "error") l.error = ev.message;
      return { lanes: { ...prev.lanes, [cid]: l } };
    });
  };

  const runNegotiation = async (only?: string[]) => {
    const cur = stateRef.current;
    // The brand agent talks to every finalist the brand hasn't declined, all at once.
    const pool = applicants(cur).filter((a) => a.status !== "declined").map((a) => a.id);
    const ids = only ? pool.filter((x) => only.includes(x)) : pool;
    if (!ids.length) return;
    const id = only && cur.negRunning ? runId.current : ++runId.current;
    const fresh = Object.fromEntries(ids.map((k) => [k, { turns: [], thinking: null }]));
    set((prev) => ({
      negRunning: true,
      ...(only ? {} : { negLive: null, research: null, news: null, negNotice: "" }),
      lanes: only ? { ...prev.lanes, ...fresh } : fresh,
      apps: ids.includes("maya") && prev.apps.kb ? { ...prev.apps, kb: { ...prev.apps.kb, status: "shortlisted" } } : prev.apps,
      others: { ...prev.others, ...(Object.fromEntries(ids.filter((k) => k !== "maya").map((k) => [k, "shortlisted"])) as Partial<State["others"]>) },
    }));
    const opening = kbTerms(cur);
    const body = { brand: cur.c.brand, product: cur.c.product, type: cur.c.type, opening, maxFee: Number(cur.c.maxFee), creatorIds: ids, mayaVideo: cur.apps.kb?.video, screeningId: cur.screening?.screeningId ?? null };
    const send = (ev: NegotiationEvent) => onEvent(ev, id);
    try {
      const res = await fetch(`${BASE_PATH}/api/negotiate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok || !res.body || !(res.headers.get("content-type") ?? "").includes("ndjson")) throw new Error("no server");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) if (line) send(JSON.parse(line));
      }
      set({ negRunning: false });
    } catch {
      // Static hosting (GitHub Pages) has no API routes: play the scripted negotiation in the browser.
      send({ type: "mode", live: false });
      await replay(ids, opening, cur.c.brand, cur.c.product, send, Number(cur.c.maxFee) || Infinity);
      if (runId.current === id) set({ negRunning: false });
    }
  };

  const screenRun = useRef(0);
  const runScreening = useCallback(async () => {
    const cur = stateRef.current;
    const key = screeningKey(cur);
    const id = ++screenRun.current;
    set({ screenRunning: true, screeningFor: key });
    const started = Date.now();
    let view: ScreeningView;
    try {
      const res = await fetch(`${BASE_PATH}/api/screen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mayaApplied: !!cur.apps.kb, type: cur.c.type, followerMin: Number(cur.c.followerMin), product: cur.c.product }),
      });
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) throw new Error("no server");
      view = await res.json();
    } catch {
      // Static hosting (GitHub Pages): screen in the browser on the starting criteria, labeled as such.
      const rubric = baselineRubric("off", "Live search needs the server version of this app.");
      const result = screen(applicantPool(!!cur.apps.kb), rubric, requirements(cur.c).followerMin);
      view = toView(result, rubric, {
        screeningId: null,
        youcom: { status: "off", window: "month", sources: 0, queries: [] },
        seconds: Math.round((Date.now() - started) / 100) / 10,
        offline: true,
      });
    }
    if (screenRun.current !== id) return;
    set({ screening: view, screenRunning: false });
  }, [set]);

  const approve: Ctx["approve"] = (id, side) => {
    set((prev) => {
      const l = prev.lanes[id];
      if (!l) return {};
      return { lanes: { ...prev.lanes, [id]: { ...l, [side === "brand" ? "brandOk" : "creatorOk"]: true } } };
    });
    const after = { ...stateRef.current.lanes[id], [side === "brand" ? "brandOk" : "creatorOk"]: true };
    say(after.brandOk && after.creatorOk ? "Both sides approved. Deal confirmed and sample slot reserved." : side === "brand" ? "Brand approved the term sheet." : "You accepted the term sheet.");
  };

  const ctx: Ctx = { s, set, say, publish, apply, setApplicantStatus, runNegotiation, approve, runScreening };

  const mayaDeal = dealStatus(s, "maya");
  const steps = [
    { label: "Publish brief", done: s.published },
    { label: "Creator applies", done: !!s.apps.kb },
    { label: "Brand shortlists", done: ["shortlisted"].includes(s.apps.kb?.status ?? "") },
    { label: "Agents negotiate", done: ["agreed", "confirmed"].includes(mayaDeal) },
    { label: "Both approve", done: mayaDeal === "confirmed" },
  ];
  const nextHint = !s.published
    ? "Next: publish the keyboard brief in Brand view."
    : !s.apps.kb
      ? "Next: switch to Creator view and apply as Maya."
      : s.apps.kb.status === "applied"
        ? "Next: Brand view → Applicants. Shortlist Maya."
        : s.apps.kb.status === "declined"
          ? "Maya was declined. Use Undo in Brand view to try again."
          : mayaDeal === "shortlisted"
            ? "Next: Brand view → Agent negotiation. Start the agents."
            : mayaDeal === "negotiating"
              ? "Agents are negotiating…"
              : mayaDeal === "agreed"
                ? "Next: brand approves in Agent negotiation; Maya accepts in Creator view."
                : mayaDeal === "nodeal"
                  ? "No deal with Maya. Re-run the agents to try again."
                  : "Done: the deal is confirmed on both sides.";

  return (
    <div className="app">
      <header className="demobar" aria-label="Prototype controls">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span className="eyebrow">Prototype · sample data</span>
          <span style={{ fontFamily: "var(--font-tight), sans-serif", fontWeight: 700, fontSize: 17 }}>Unboxed</span>
        </div>
        <div role="group" aria-label="Demo role" className="seg">
          <button type="button" aria-pressed={s.role === "brand"} onClick={() => set({ role: "brand" })}>Brand view · Halden Works</button>
          <button
            type="button"
            aria-pressed={s.role === "creator"}
            onClick={() => set((p) => ({ role: "creator", cScr: p.cScr === "done" || p.cScr === "review" ? "apps" : p.cScr }))}
          >
            Creator view · Maya Okafor
          </button>
        </div>
        <ol className="steps" aria-label="Demo progress">
          {steps.map((st, i) => (
            <li key={st.label} data-done={st.done}>
              <span className="n">{i + 1}</span>
              {st.label}
            </li>
          ))}
        </ol>
        <p className="hint" style={{ flex: "1 1 240px" }}>{nextHint}</p>
        {process.env.NEXT_PUBLIC_PREVIOUS_URL && (
          <a className="linkbtn" href={process.env.NEXT_PUBLIC_PREVIOUS_URL}>Previous version</a>
        )}
        <button
          type="button"
          className="linkbtn"
          onClick={() => {
            runId.current++;
            setS(initialState());
          }}
        >
          Reset demo
        </button>
      </header>

      <div className="sr" aria-live="polite">{s.toast}</div>
      {s.toast && (
        <div className="toast" role="status">
          <span>{s.toast}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => set({ toast: "" })}>Dismiss</button>
        </div>
      )}

      {s.role === "brand" ? <BrandView ctx={ctx} /> : <CreatorView ctx={ctx} />}
    </div>
  );
}
