/* Arkansas EFA — page entry point.
 *
 * Loads data/efa.json once, hands it to each renderer, and wires the inline
 * download links. Nothing here computes a displayed value.
 */
import { loadEfa, loadVintage, renderVintage, downloads, num, money, dollars } from "./shared.js";
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
  ["efa-homeschool-series.csv", "Home schooling, 1997 to now"],
  ["efa-appropriations.csv", "Appropriations"],
  ["efa-award-series.csv", "Award by year"],
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
  C.funnelTable(D, "t-funnel");
  C.moneyChart(D, "c-money");
  C.sector(D, "c-sector");
  C.prior(D, "c-prior");
  C.eligibilityTable(D, "t-elig");
  C.categories(D, "c-cats");
  C.twoPrograms(D, "c-twoprog");
  C.homeschool(D, "c-hs");
  C.explosion(D, "c-explosion");
  C.concentration(D, "c-conc", "conc-summary");
  C.topRecipientsTable(D, "t-top");
  C.shareOfEnrollment(D, "c-share");
  C.growth(D, "c-growth");
  C.impliedDollarsTable(D, "t-implied");
  C.identity(D, "c-identity");
  C.assessment(D, "c-assess");
  C.retention(D, "c-ret");
  C.award(D, "c-award");
  C.obtainedTuition(D, "c-tuition");
  C.obtainedSchools(D, "c-schools-2627");
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
  // Charts and tables alike: below 900px both become their own horizontal
  // scroll container, and a scroll container the keyboard cannot reach is a
  // region a keyboard user cannot read. The four S38 tables scroll for exactly
  // the same reason the charts do, so they get the same treatment.
  const hosts = document.querySelectorAll('.card > div[id^="c-"], .card .table-scroll');
  const apply = () => hosts.forEach(h => {
    // Only the hosts that actually overflow. The absence register is an HTML
    // host matching the same selector and it reflows rather than scrolling, so
    // giving it a tab stop would be a stop that goes nowhere.
    const scrolls = mq.matches && h.scrollWidth > h.clientWidth + 1;
    if (scrolls) {
      h.setAttribute("tabindex", "0");
      h.setAttribute("role", "region");
      const t = h.querySelector("svg > title") || h.querySelector("table > caption");
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
 * exists to criticize. The static values in index.html are correct fallbacks
 * for a module failure, not a second source of truth. */
/* Figures that appear inside a sentence rather than inside a chart. Same rule
 * as the counts above and the same failure mode: the opening line of Part one
 * carried "roughly one in ten Arkansas students" and "a third of a billion" for
 * as long as the page was live, and neither could be checked against anything
 * in efa.json — the first had no denominator anywhere in the data, the second
 * rounded a $309m ceiling up by 8% in the direction that flattered the point.
 * Every figure below is a function of efa.json. Formatting happens here, which
 * is presentation; the quantity never does. */
function proseFigures(D) {
  const fig = Object.fromEntries(D.obtained_2026_27.figures.map(f => [f.key, f.value]));
  const s34 = D.state_summary["34"], s35 = D.state_summary["35"];
  // The three appropriations records behind the $309m ceiling and the one that
  // corroborates it. Located by (fy, measure) rather than by index: the
  // appropriations array is source-ordered and a new record would shift it.
  const approp = (fy, measure) =>
    D.appropriations.find(r => r.fy === fy && r.measure === measure);
  // money() rounds to whole millions above $10m, which prints the first year's
  // spend as $35m — the same overstatement, one order down. One decimal here.
  const oneDp = v => "$" + (v / 1e6).toFixed(1) + "m";
  return {
    // Part one's opening sentence. approved_2627 is `reported` tier, which is
    // why the sentence attributes it in the same breath rather than after it.
    approved_2627: num(fig.approved_total),
    approved_first_year: num(s34.total_approved_applicants),
    spend_first_year: oneDp(s34.total_funding_usd),
    approp_ceiling: money(D.derived.appropriated_36_with_supplement),
    // The 2026-27 school-application outcomes. The page published the under-
    // review count in the CSV and omitted it from the sentence summarizing it,
    // so the sentence said 176 applied, 164 approved, 2 denied — ten schools
    // short of its own arithmetic. All four are bound; the identity holds.
    schools_applied: num(fig.schools_applied),
    schools_approved: num(fig.schools_approved),
    schools_denied: num(fig.schools_denied),
    schools_under_review: num(fig.schools_under_review),
    // How much of the school-level record the growth chart can actually cover.
    growth_matched: num(D.identity.matched),
    growth_total: num(D.identity.fy35_total),
    growth_unresolved: num(D.identity.unresolved),
    // ATLAS: four schools chose to sit the state test, out of the participants.
    atlas_other: num(s35.n_schools - D.atlas.schools.length),
    atlas_total: num(s35.n_schools),
    // The applications the funnel table can no longer follow. Both reports
    // publish applied and approved and neither labels the difference, so the
    // page says "did not result in an approval" and never "denied" — some may
    // have been withdrawn, duplicated or incomplete, and `denied` would assert
    // more than the record supports. The counts are bound; the wording is the
    // sentence's own job.
    applicants_34: num(s34.total_applicants),
    applicants_35: num(s35.total_applicants),
    not_approved_34: num(D.derived.not_approved_34),
    not_approved_35: num(D.derived.not_approved_35),
    pct_not_approved_34: D.derived.pct_not_approved_34 + "%",
    pct_not_approved_35: D.derived.pct_not_approved_35 + "%",
    // Eligibility: the share fell while the count rose. Both halves have to be
    // in the sentence or it says the opposite of what happened.
    elig_disability_34: s34.pct_eligibility_students_with_disabilities + "%",
    elig_disability_35: s35.pct_eligibility_students_with_disabilities + "%",
    disability_students_34: num(D.derived.disability_students_34),
    disability_students_35: num(D.derived.disability_students_35),
    // 2023-24's non-tuition spending. ClassWallet is deliberately not one of the
    // shops: its figure is a processing fee, not a purchase, and the split is
    // made in the builder from the source table's own expense_type column.
    shops_34: word(D.derived.providers_34_shops),
    shops_total_34: oneDp(D.derived.providers_34_shops_total),
    tuition_total_34: oneDp(D.derived.providers_34_tuition_total),
    processing_fee_34: dollars(D.derived.providers_34_processing_fee),
    largest_shop_34: D.derived.providers_34_largest_shop,
    recipients_n: num(D.recipients.n),
    // Part two's opening sentence. It used to say the five 2025-26 figures "do
    // not agree", which mischaracterized them: they measure five different
    // quantities — a base appropriation, a reserve authorization, its transfer,
    // a supplemental and its matching transfer — not five rival estimates of
    // one. The defensible point is that no single document totals them. Both
    // counts are bound because they differ: two of the five are separate
    // approvals printed in one ALC-PEER exhibit, so five figures come from four
    // documents, and the sentence is wrong the moment a sixth record lands.
    money_figures_36: word(D.appropriations.filter(r => r.fy === 36).length),
    money_docs_36: word(new Set(D.appropriations.filter(r => r.fy === 36)
      .map(r => r.url)).size),
    // The $309m ceiling is one of the page's `derived` figures, and the badge
    // definition promises every one of them a cross-check against a different
    // published figure. This one's had none surfaced anywhere. The corroboration
    // is Act 156 of 2026: the enacted 2026-27 base appropriation is the same
    // figure to the dollar. That is corroboration, not verification — see the
    // note in #money, which says so explicitly rather than letting the match
    // imply more than it earns.
    approp_base_36: dollars(approp(36, "appropriated").amount),
    approp_supp_36: dollars(approp(36, "supplemental").amount),
    approp_ceiling_exact: dollars(D.derived.appropriated_36_with_supplement),
    approp_37_exact: dollars(approp(37, "appropriated").amount),
    // The two account values the implied-dollar columns multiply by. One
    // statewide figure per year, which is why the dollar ranking cannot differ
    // from the student ranking — the sentence saying so has to carry the
    // figures that make it true.
    award_34: dollars(D.award.by_fy["34"].allocated),
    award_35: dollars(D.award.by_fy["35"].allocated),
  };
}

/* Small counts read as words in a sentence and as numerals in a table. This is
 * presentation, which is this file's job; the quantity is still the data's. */
const WORDS = ["zero", "one", "two", "three", "four", "five",
               "six", "seven", "eight", "nine", "ten"];
const word = v => WORDS[v] || num(v);

function fillDerivedCounts(D) {
  const c = C.registerCounts(D);
  const set = (sel, v) => document.querySelectorAll(sel).forEach(n => { n.textContent = v; });
  set('[data-count="holes"]', c.holes);
  set('[data-count="withheld"]', c.withheld);
  set('[data-count="obtained"]', c.obtained);
  // The register's evidence split. Bound rather than typed for the same reason
  // as the rest: the sentence under the register used to assert that every row
  // carried a check date, and four rows did not.
  set('[data-count="searched"]', c.searched);
  set('[data-count="documentary"]', c.documentary);
  const prose = proseFigures(D);
  Object.keys(prose).forEach(k => set(`[data-efa="${k}"]`, prose[k]));

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
