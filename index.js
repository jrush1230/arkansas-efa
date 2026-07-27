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
  C.homeschool(D, "c-hs");
  C.instruments(D, "c-instruments");
  C.atlas(D, "c-atlas");
  C.coverage(D, "c-coverage");
  C.register(D, "c-ns");
  C.completeness(D, "c-audit");
  C.reconciliation(D, "c-recon");

  renderVintage(await loadVintage(), "vintage");
}

wireDownloads();
main();
