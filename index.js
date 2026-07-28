/* Arkansas EFA — page entry point.
 *
 * Loads data/efa.json once, hands it to each renderer, and wires the inline
 * download links. Nothing here computes a displayed value.
 */
import { loadEfa, loadVintage, renderVintage, downloads } from "./shared.js";
import * as C from "./charts.js";

/* Every published CSV, in the order the page uses them. The filenames must
 * match scripts/build_downloads.py's output names; spot_check.py asserts that
 * every name referenced here actually exists in data/downloads/. */
const FILES = [
  ["efa-recipients-2024-25-spring.csv", "Recipients, spring 2025"],
  ["efa-retention-by-school.csv", "Retention by school"],
  ["efa-spending-by-category.csv", "Spending by category"],
  ["efa-assessment-by-school.csv", "Assessment by school"],
  ["efa-assessment-by-instrument.csv", "Assessment by instrument"],
  ["efa-atlas-performance-levels.csv", "ATLAS performance levels"],
  ["efa-providers-2023-24.csv", "Providers, 2023-24"],
  ["efa-participation-by-school.csv", "Participation by school"],
  ["efa-statewide-summary.csv", "Statewide summary"],
  ["efa-appropriations.csv", "Appropriations"],
  ["efa-obtained-2026-27.csv", "2026-27, obtained and reported"],
  ["efa-coverage-matrix.csv", "Coverage matrix"],
  ["efa-absence-register.csv", "Absence register"],
  ["arkansas-efa-published-record.xlsx", "Everything, one workbook"],
];
const LABEL = Object.fromEntries(FILES);

function wireDownloads() {
  document.querySelectorAll("[data-downloads]").forEach(node => {
    const names = node.getAttribute("data-downloads").split(",").map(s => s.trim());
    node.outerHTML = downloads(names.map(n => [n, LABEL[n] || n]));
  });
  const all = document.getElementById("all-downloads");
  if (all) all.outerHTML = downloads(FILES);
}

async function main() {
  let D;
  try {
    D = await loadEfa();
  } catch (err) {
    document.getElementById("main").insertAdjacentHTML("afterbegin",
      `<div class="note"><p>The data file could not be loaded (${err.message}). ` +
      `Charts are unavailable; the text of the page is unaffected.</p></div>`);
    return;
  }

  C.kpis(D, "kpis");
  C.funnel(D, "c-funnel");
  C.sector(D, "c-sector");
  C.prior(D, "c-prior");
  C.eligibility(D, "c-elig");
  C.moneyChart(D, "c-money");
  C.categories(D, "c-cats");
  C.twoProgrammes(D, "c-twoprog");
  C.explosion(D, "c-explosion");
  C.concentration(D, "c-conc", "conc-summary");
  C.topRecipients(D, "c-top");
  C.shareOfEnrolment(D, "c-share");
  C.growth(D, "c-growth");
  C.impliedDollars(D, "c-implied");
  C.semesterCheck(D, "c-semester", "sem-note");
  C.identity(D, "c-identity");
  C.assessment(D, "c-assess");
  C.retention(D, "c-ret");
  C.award(D, "c-award");
  C.obtainedTuition(D, "c-tuition");
  C.obtainedSchools(D, "c-schools-2627");
  C.homeschool(D, "c-hs");
  C.instruments(D, "c-instruments");
  C.atlas(D, "c-atlas");
  C.coverage(D, "c-coverage");
  C.register(D, "c-ns");
  C.completeness(D, "c-audit");
  C.reconciliation(D, "c-recon");

  fillDerivedCounts(D);
  wireChartScroll();
  renderVintage(await loadVintage(), "vintage");
}

/* Below 900px each chart host becomes a horizontal scroll container (see the
 * narrow-viewport block in app.css), because shrinking a 900-unit viewBox onto
 * a phone rendered the type at 3.4px. A scrollable region has to be reachable
 * by keyboard, so the host takes a tabindex — but only while it actually
 * scrolls. Adding 22 permanent tab stops a desktop reader can do nothing with
 * would be its own accessibility defect, so this follows the same media query
 * the stylesheet uses and keeps the two in step. */
function wireChartScroll() {
  const mq = window.matchMedia("(max-width: 899px)");
  const hosts = document.querySelectorAll('.card > div[id^="c-"]');
  const apply = () => hosts.forEach(h => {
    // Only the hosts that actually overflow. The absence register is an HTML
    // host matching the same selector and it reflows rather than scrolling, so
    // giving it a tab stop would be a stop that goes nowhere.
    const scrolls = mq.matches && h.scrollWidth > h.clientWidth + 1;
    if (scrolls) {
      h.setAttribute("tabindex", "0");
      h.setAttribute("role", "region");
      const t = h.querySelector("svg > title");
      if (t) h.setAttribute("aria-label", t.textContent + " (scrolls horizontally)");
    } else {
      h.removeAttribute("tabindex");
      h.removeAttribute("role");
      h.removeAttribute("aria-label");
    }
  });
  apply();
  mq.addEventListener("change", apply);
}

/* Counts that appear as prose rather than inside a chart: the findings block at
 * the top and the two disclosure summaries at the foot. Every one is read from
 * efa.json here rather than typed into the markup — a hardcoded "15 checks" is
 * a number that goes stale silently, which is the exact failure this page
 * exists to criticise. The static values in index.html are correct fallbacks
 * for a module failure, not a second source of truth. */
function fillDerivedCounts(D) {
  const c = C.registerCounts(D);
  const set = (sel, v) => document.querySelectorAll(sel).forEach(n => { n.textContent = v; });
  set('[data-count="holes"]', c.holes);
  set('[data-count="withheld"]', c.withheld);
  set('[data-count="obtained"]', c.obtained);

  const audit = document.getElementById("audit-claim");
  if (audit) {
    const sweep = D.completeness.filter(r => r.status === "found in sweep").length;
    audit.textContent =
      `${D.completeness.length} objects in the two reports — all accounted for. ` +
      `${sweep} were missed by the first pass and found by a later sweep.`;
  }

  const recon = document.getElementById("recon-claim");
  if (recon) {
    const total = D.reconciliation.length;
    const exact = D.reconciliation.filter(r => r.verdict === "reconciles").length;
    recon.textContent =
      `${total} checks: ${exact} reconcile exactly, ${total - exact} are recorded as found ` +
      `rather than patched.`;
  }
}

wireDownloads();
main();
