/* Arkansas EFA — shared formatters, SVG helpers and the data loader.
 *
 * Sibling to the enrollment and fiscal sites' shared.js. Everything here is
 * presentation: formatting, geometry, hover plumbing. No module in this project
 * computes a displayed quantity — that all happens in scripts/build_efa_json.py
 * and arrives via data/efa.json. If you find yourself about to type a number
 * into a renderer, it belongs in the builder instead. (The proof-of-concept did
 * type them, and four unsourced figures rode into an approved design that way.)
 */

export const NS = "http://www.w3.org/2000/svg";

/* Single source of the data path. src/ resolves it as '../data/'; the published
   root layout rewrites it to './data/' (see build_public_surface.py's
   EXPECTED_DATA_URL_REWRITES, which asserts the exact occurrence count). */
const DATA_BASE = "./data/";


/* ── formatters ─────────────────────────────────────────────────────────── */

export const money = n =>
  n >= 1e9 ? "$" + (n / 1e9).toFixed(2) + "bn"
  : n >= 1e6 ? "$" + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "m"
  : n >= 1e3 ? "$" + Math.round(n / 1e3) + "k"
  : "$" + Math.round(n);

export const dollars = n => "$" + Math.round(n).toLocaleString("en-US");
export const num = n => Math.round(n).toLocaleString("en-US");
export const pct = (n, dp = 0) => n.toFixed(dp) + "%";

/** Title-case matching the builder's, for names stored verbatim upstream.
 *  ATLAS school names and Appendix B recipient names are stored EXACTLY as
 *  printed (an extraction audit fixed a pass that title-cased them while
 *  claiming otherwise). Display may prettify; the data must not. */
const SMALL = new Set(["of", "the", "and", "for", "at", "in", "to", "a", "de"]);
export const titleCase = s => String(s).toLowerCase().split(" ")
  .map((w, i) => (SMALL.has(w) && i) ? w : w.replace(/^[a-z(]/, c => c.toUpperCase()))
  .join(" ");

export const truncate = (s, n) => s.length > n ? s.slice(0, n - 1) + "…" : s;

const MONTHS = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];
/** "2026-06-26" -> "26 June 2026". Dates come from the data with their own
 *  provenance; only the rendering happens here. */
export const longDate = iso => {
  const [y, m, d] = String(iso).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** "spring_2025_only" -> "spring 2025". The period flag is a data value; this
 *  only makes it readable. */
export const periodLabel = p => String(p).replace(/_only$/, "").replace(/_/g, " ");

/** Read a CSS custom property off :root, so charts follow the theme without
 *  duplicating any token value in JS. */
export const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

/* ── SVG primitives ─────────────────────────────────────────────────────── */

export function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

/** Create a viewBox'd svg inside `host` (an id, without the #). Charts are
 *  authored at a fixed viewBox and scale to the container; nothing is measured
 *  from the DOM, so there is no resize path to get wrong. */
export function svg(hostId, w, h, title) {
  const host = document.getElementById(hostId);
  if (!host) return null;
  const s = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img" });
  if (title) {
    const t = el("title", {}, s);
    t.textContent = title;
  }
  host.appendChild(s);
  return s;
}

export function text(s, x, y, str, cls, anchor) {
  const e = el("text", {
    x, y, class: cls || "lbl",
    "text-anchor": anchor || "start", "dominant-baseline": "middle",
  }, s);
  e.textContent = str;
  return e;
}

/* ── hover tooltip ──────────────────────────────────────────────────────── */

let tipEl = null;
function tip() {
  if (!tipEl) {
    tipEl = document.createElement("div");
    tipEl.id = "tt";
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

/** Attach a tooltip to a mark. Keyboard-reachable: the mark also gets a
 *  <title> child, so a screen reader and a no-pointer user get the same text
 *  the hover gives. */
export function hover(node, html) {
  if (!node) return node;
  node.classList.add("mark");
  const plain = html.replace(/<br\s*\/?>/gi, " · ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const t = el("title", {}, node);
  t.textContent = plain;
  node.addEventListener("mousemove", e => {
    const el_ = tip();
    el_.innerHTML = html;
    el_.style.opacity = 1;
    const r = el_.getBoundingClientRect();
    el_.style.left = Math.min(e.clientX + 14, innerWidth - r.width - 10) + "px";
    el_.style.top = Math.max(e.clientY - r.height - 12, 8) + "px";
  });
  node.addEventListener("mouseleave", () => { tip().style.opacity = 0; });
  return node;
}

/* ── page furniture ─────────────────────────────────────────────────────── */

/** The provenance badge. `kind` is published | derived | obtained | absent.
 *  The text label is mandatory — color is never the sole channel. */
export function badge(kind) {
  return `<span class="verify-badge" data-verify="${kind}">` +
         `<span class="verify-dot" aria-hidden="true"></span>${kind}</span>`;
}

/** Inline download links for the machine-readable files, rendered beside the
 *  figure they belong to. Paths go through DATA_BASE so the publish script's
 *  '../data/' -> './data/' rewrite catches them; a template literal would not
 *  match its exact-string manifest. */
export function downloads(files) {
  return `<div class="downloads">` + files.map(([href, label]) =>
    `<a class="dl-btn" href="${DATA_BASE + "downloads/" + href}" download>${label} ` +
    `<span class="ext">${href.endsWith(".xlsx") ? "XLSX" : "CSV"}</span></a>`).join("") +
    `</div>`;
}

/* ── data loading ───────────────────────────────────────────────────────── */

export async function loadEfa() {
  const res = await fetch(DATA_BASE + "efa.json");
  if (!res.ok) throw new Error(`efa.json: HTTP ${res.status}`);
  return res.json();
}

export async function loadVintage() {
  try {
    const res = await fetch(DATA_BASE + "vintage.json");
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

/** Footer vintage line, built from vintage.json's own derived fields. */
export function renderVintage(v, hostId) {
  const host = document.getElementById(hostId);
  if (!host || !v) return;
  host.innerHTML =
    `<strong>Data vintage.</strong> Latest annual report: ${v.latest_report_school_year}. ` +
    `Award amounts through ${v.award_through}. Appropriations through ${v.appropriations_through}. ` +
    `Absence register last probed ${v.register_checked}. Built ${v.generated}.`;
}
