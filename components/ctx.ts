import type { State } from "@/lib/model";

export type Patch = Partial<State> | ((s: State) => Partial<State>);

/** Shared state and actions passed to every view, so brand and creator always see the same data. */
export type Ctx = {
  s: State;
  set: (p: Patch) => void;
  say: (msg: string) => void;
  publish: () => void;
  apply: () => void;
  setApplicantStatus: (id: string, status: "applied" | "shortlisted" | "declined", msg?: string) => void;
  runNegotiation: () => void;
  approve: (id: string, side: "brand" | "creator") => void;
  runScreening: () => void;
};
