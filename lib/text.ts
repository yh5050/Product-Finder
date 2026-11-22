const cache = new Map<string, RegExp>();

// True when `term` appears in `text` as a whole word or phrase: "mac" matches "on a Mac" but not "machine", and
// "loud" does not match "cloud". Edges that are not letters or digits (such as "75%" or "under $") need no boundary.
export function mentions(text: string, term: string): boolean {
  let re = cache.get(term);
  if (!re) {
    const t = term.trim().toLowerCase();
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const start = /^[a-z0-9]/.test(t) ? "(?<![a-z0-9])" : "";
    const end = /[a-z0-9]$/.test(t) ? "(?![a-z0-9])" : "";
    re = new RegExp(start + escaped + end, "i");
    cache.set(term, re);
  }
  return re.test(text);
}
