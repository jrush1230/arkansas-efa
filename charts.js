/* Arkansas EFA — chart renderers.
 *
 * One function per figure. Every one takes the loaded efa.json and draws it.
 * None of them contains a datum: layout constants and color token names only.
 * That is the invariant this file exists to hold, and scripts/spot_check.py
 * enforces it by asserting the rendered values against the source tables.
 *
 * Ported from design/EFA_chart_pack_v6.html. Four corrections were applied in
 * the port and are marked CORRECTION where they occur.
 */
import { el, svg, text, hover, css, money, dollars, num, titleCase, truncate, badge,
  longDate, periodLabel } from "./shared.js";

const W = 900;   // every chart's viewBox width; height varies

/* Badge tier -> color token, so a tier drawn inside an SVG reads as the same
 * object as the HTML .verify-badge pill. Names only; the values live in
 * app.css and the tier list itself lives in build_efa_json.py's TIERS. */
const TIER_TOKEN = {
  published: "--verify-exact",
  derived: "--verify-applied",
  obtained: "--obtained",
  reported: "--reported",
  absent: "--verify-observed",
};

/* ── Part one: how big is it? ───────────────────────────────────────────── */

export function kpis(D, hostId) {
  const fig = Object.fromEntries(D.obtained_2026_27.figures.map(f => [f.key, f]));
  const ob = Object.fromEntries(D.obtained_2026_27.figures.map(f => [f.key, f.value]));
  const s35 = D.state_summary["35"];
  const a36 = D.award.by_fy["36"];
  const hsShare = ob.approved_homeschool / ob.approved_total * 100;

  // CORRECTION: the badge is read from the figure's own `badge` field, which
  // build_efa_json.py resolves from source_kind. It used to be typed here, and
  // it was typed wrong: these three counts are a department spokesperson's
  // statement, not records released under FOIA, so they are `reported`.
  const asOf = fig.approved_total.as_of;
  const cards = [
    [num(ob.approved_total), "applications approved",
     `2026-27, as of ${longDate(asOf)}`, fig.approved_total.badge],
    [money(D.derived.appropriated_36_with_supplement), "appropriated",
     "2025-26, original act plus supplemental", "derived"],
    [num(D.recipients.n), "named recipients of funds",
     "2024-25, spring transactions only", "published"],
    [s35.pct_prior_public_school + "%", "had attended a public school",
     "2024-25, the year before joining", "published"],
    [Math.round(hsShare) + "%", "are home-schooled",
     `2026-27 approvals; ${s35.pct_sector_homeschool}% two years earlier`,
     fig.approved_homeschool.badge],
    [dollars(a36.allocated), "allocated per account",
     `2025-26; ${dollars(a36.net)} reaches the family`, "published"],
  ];
  document.getElementById(hostId).innerHTML = cards.map(([v, l, sub, kind]) =>
    `<div class="hero-stat"><div class="stat-number">${v}</div>` +
    `<div class="stat-label">${l}</div>` +
    `<div class="stat-sub">${sub} ${badge(kind)}</div></div>`).join("");
}

export function funnel(D, hostId) {
  const S = D.state_summary, ob = Object.fromEntries(
    D.obtained_2026_27.figures.map(f => [f.key, f.value]));
  // CORRECTION: the 2026-27 row starts at "approved". The pack drew an
  // "applied" bar at 57,000, which the source gives only as a spokesperson's
  // "nearly 57,000" — a hedged round number. Drawing it precisely would assert
  // a precision the source disclaims.
  // CORRECTION: the tier is per row, not per section. Three of these four years
  // are published; 2025-26 is the prior report's forward-looking Outlook and
  // 2026-27 is a department statement to a reporter. A single section badge
  // told the reader all four bars were published, which is false for half of
  // them, so each row now carries its own tier and the section badge is gone.
  const badge37 = D.obtained_2026_27.figures.find(f => f.key === "approved_total").badge;
  const rows = [
    { y: "2023-24", a: S["34"].total_applicants, ap: S["34"].total_approved_applicants,
      ac: S["34"].total_active_participants, tier: "published" },
    { y: "2024-25", a: S["35"].total_applicants, ap: S["35"].total_approved_applicants,
      ac: S["35"].total_active_participants, tier: "published" },
    { y: "2025-26", a: null, ap: D.derived.fy36_approved, ac: null,
      tag: "outlook", tier: "published" },
    { y: "2026-27", a: null, ap: ob.approved_total, ac: null,
      tag: "stated to a reporter", tier: badge37 },
  ];
  const RH = 62, PAD = 96, H = rows.length * RH + 34;
  const max = Math.max(...rows.flatMap(r => [r.a, r.ap, r.ac].filter(v => v != null)));
  const s = svg(hostId, W, H, "Applications, approvals and active accounts by year");
  const x = v => PAD + v / max * (W - PAD - 150);   // room for value + word
  rows.forEach((r, i) => {
    const y0 = i * RH + 12;
    text(s, 0, y0 + 20, r.y, "lbl");
    [["a", r.a, .34, "Applied"], ["ap", r.ap, .68, "Approved"], ["ac", r.ac, 1, "Active"]]
      .forEach(([, v, op, nm], j) => {
        if (v == null) return;
        const y = y0 + j * 12, bw = x(v) - PAD;
        hover(el("rect", { x: PAD, y, width: Math.max(bw, 2), height: 9, rx: 4,
          fill: css("--cat-1"), "fill-opacity": op }, s), `<b>${r.y} — ${nm}</b><br>${num(v)}`);
        text(s, PAD + bw + 8, y + 4.5, num(v), "val");
        text(s, PAD + bw + 8 + String(num(v)).length * 7.6 + 6, y + 4.5, nm.toLowerCase(), "ax");
      });
    // Per-row tier, in the label gutter beneath the year. Color follows the
    // badge token so it reads as the same object as the HTML pills; the word is
    // always present, because color is never the sole channel.
    text(s, 0, y0 + 34, r.tier, "ax")
      .setAttribute("fill", css(TIER_TOKEN[r.tier] || "--text-muted"));
    if (r.tag) text(s, 0, y0 + 46, r.tag, "ax");
  });
}

/* ── Part two: who is in it? ────────────────────────────────────────────── */

export function sector(D, hostId) {
  const S = D.state_summary["35"], ob = Object.fromEntries(
    D.obtained_2026_27.figures.map(f => [f.key, f.value]));
  const rows = [
    { y: "2024-25", p: S.n_sector_private_students, h: S.n_sector_homeschool_students },
    { y: "2026-27 (approved)", p: ob.approved_private, h: ob.approved_homeschool },
  ];
  const H = 170, PAD = 150, s = svg(hostId, W, H, "Private school and homeschool share of participants");
  rows.forEach((r, i) => {
    const tot = r.p + r.h, y = 26 + i * 72, w = v => v / tot * (W - PAD - 110);
    text(s, 0, y + 13, r.y, "lbl");
    let cx = PAD;
    [[r.p, css("--cat-1"), "Private school"], [r.h, css("--cat-2"), "Homeschool"]]
      .forEach(([v, c, nm]) => {
        const bw = w(v);
        hover(el("rect", { x: cx, y, width: Math.max(bw - 2, 2), height: 26, rx: 4, fill: c }, s),
          `<b>${nm}, ${r.y}</b><br>${num(v)} students — ${(v / tot * 100).toFixed(0)}% of ${num(tot)}`);
        if (bw > 40) text(s, cx + bw / 2 - 1, y + 13, (v / tot * 100).toFixed(0) + "%", "val", "middle")
          .setAttribute("fill", css("--page-plane"));
        cx += bw;
      });
    text(s, cx + 12, y + 13, num(tot) + " students", "val");
  });
  text(s, PAD, 152, "Both bars drawn to the same width: the message is the mix, not the growth. Counts at right.", "ax");
}

export function prior(D, hostId) {
  const a = D.state_summary["34"], b = D.state_summary["35"];
  const H = 210, PAD = 150, s = svg(hostId, W, H, "Where participants came from");
  const bars = [
    { y: "2023-24", seg: [
      ["Not previously public", a.pct_prior_not_public_school, css("--neutral")],
      ["Public school", a.pct_prior_public_school, css("--cat-1")]] },
    { y: "2024-25", seg: [
      ["Did not list", b.pct_prior_did_not_list, css("--neutral")],
      ["Private school", b.pct_prior_private_school, css("--cat-3")],
      ["Homeschool", b.pct_prior_homeschool, css("--cat-2")],
      ["Public school", b.pct_prior_public_school, css("--cat-1")],
      ["Pre-K", b.pct_prior_prek, css("--cat-7")],
      ["Did not attend", b.pct_prior_did_not_attend_school, css("--cat-6")]] },
  ];
  bars.forEach((bar, i) => {
    const y = 30 + i * 86; let cx = PAD;
    text(s, 0, y + 14, bar.y, "lbl");
    bar.seg.forEach(([nm, v, c]) => {
      const bw = v / 100 * (W - PAD - 30);
      hover(el("rect", { x: cx, y, width: Math.max(bw - 2, 2), height: 28, rx: 4, fill: c }, s),
        `<b>${nm}</b><br>${v}% of ${bar.y} participants`);
      if (bw > 44) text(s, cx + bw / 2 - 1, y + 14, v + "%", "val", "middle")
        .setAttribute("fill", css("--page-plane"));
      if (bw > 58) text(s, cx + bw / 2 - 1, y + 44, nm, "ax", "middle");
      cx += bw;
    });
  });
  text(s, PAD, 196, "The 2023-24 report published a two-way split only; the categories are not comparable across years.", "ax");
}

export function eligibility(D, hostId) {
  const a = D.state_summary["34"], b = D.state_summary["35"];
  const rows = [
    ["Students with disabilities", a.pct_eligibility_students_with_disabilities, b.pct_eligibility_students_with_disabilities],
    ["First-time kindergarten", a.pct_eligibility_kindergarten, b.pct_eligibility_kindergarten],
    ["Active-duty military", a.pct_eligibility_active_military, b.pct_eligibility_active_military],
    ["Foster care", a.pct_eligibility_foster_care, b.pct_eligibility_foster_care],
    ["D- or F-rated school", a.pct_eligibility_f_rated_school, b.pct_eligibility_d_or_f_rated_school],
    ["Succeed Scholarship", null, b.pct_eligibility_succeed_program],
    ["Law enforcement", null, b.pct_eligibility_law_enforcement],
  ];
  const H = 340, L = 250, R = W - 260, s = svg(hostId, W, H, "Eligibility category shares, 2023-24 to 2024-25");
  const max = 60, y = v => H - 58 - (v / max) * (H - 102);
  el("line", { x1: L, y1: 20, x2: L, y2: H - 58, class: "gl" }, s);
  el("line", { x1: R, y1: 20, x2: R, y2: H - 58, class: "gl" }, s);
  text(s, L, H - 36, "2023-24", "ax", "middle");
  text(s, R, H - 36, "2024-25", "ax", "middle");
  const decollide = (pts, lo, hi) => {          // two-pass label placement
    const MIN = 16, n = pts.length; pts.sort((p, q) => p.y - q.y);
    for (let i = 1; i < n; i++) pts[i].y = Math.max(pts[i].y, pts[i - 1].y + MIN);
    pts[n - 1].y = Math.min(pts[n - 1].y, hi);
    for (let i = n - 2; i >= 0; i--) pts[i].y = Math.min(pts[i].y, pts[i + 1].y - MIN);
    pts[0].y = Math.max(pts[0].y, lo);
    for (let i = 1; i < n; i++) pts[i].y = Math.max(pts[i].y, pts[i - 1].y + MIN);
    return pts;
  };
  const LO = 24, HI = H - 58;
  const ly1 = {}, ly2 = {};
  decollide(rows.filter(r => r[1] != null).map(r => ({ nm: r[0], y: y(r[1]) })), LO, HI)
    .forEach(p => ly1[p.nm] = p.y);
  decollide(rows.map(r => ({ nm: r[0], y: y(r[2]) })), LO, HI).forEach(p => ly2[p.nm] = p.y);
  rows.forEach(([nm, av, bv]) => {
    const c = nm.startsWith("Students with") ? css("--cat-1")
            : nm.startsWith("Active") ? css("--cat-2") : css("--neutral");
    const emph = c !== css("--neutral");
    if (av != null) {
      hover(el("line", { x1: L, y1: y(av), x2: R, y2: y(bv), stroke: c,
        "stroke-width": emph ? 2.5 : 1.5, "stroke-opacity": emph ? 1 : .55 }, s),
        `<b>${nm}</b><br>${av}% → ${bv}%`);
      el("circle", { cx: L, cy: y(av), r: 4, fill: c, "fill-opacity": emph ? 1 : .55 }, s);
      if (Math.abs(ly1[nm] - y(av)) > 3)
        el("line", { x1: L - 6, y1: y(av), x2: L - 12, y2: ly1[nm], stroke: c,
          "stroke-width": 1, "stroke-opacity": .45 }, s);
      text(s, L - 10, ly1[nm], `${nm}  ${av}%`, emph ? "val" : "lbl", "end");
    }
    el("circle", { cx: R, cy: y(bv), r: 4, fill: c, "fill-opacity": emph ? 1 : .55 }, s);
    if (Math.abs(ly2[nm] - y(bv)) > 3)
      el("line", { x1: R + 6, y1: y(bv), x2: R + 12, y2: ly2[nm], stroke: c,
        "stroke-width": 1, "stroke-opacity": .45 }, s);
    text(s, R + 10, ly2[nm], av == null ? `${bv}%  ${nm} (new)` : `${bv}%`,
      emph ? "val" : "lbl", "start");
  });
}

export function moneyChart(D, hostId) {
  const H = 340, PAD = 64, s = svg(hostId, W, H, "Appropriated, spent and requested amounts by year");
  // Year labels come from the data's own school_year, never a hardcoded map.
  const fys = Object.fromEntries(D.appropriations.map(r => [r.fy, r.school_year]));
  const color = { appropriated: css("--cat-1"), spent: css("--cat-3"),
    reserve: css("--cat-7"), supplemental: css("--cat-7"), requested: css("--cat-6") };
  const max = 400e6, y = v => H - 46 - (v / max) * (H - 80);
  const xs = fy => PAD + ((fy - 34) + 0.5) * ((W - PAD - 20) / 4);
  [0, 100e6, 200e6, 300e6, 400e6].forEach(v => {
    el("line", { x1: PAD, y1: y(v), x2: W - 20, y2: y(v), class: "gl" }, s);
    text(s, PAD - 10, y(v), "$" + (v / 1e6) + "m", "ax", "end");
  });
  Object.keys(fys).forEach(fy => text(s, xs(+fy), H - 22, fys[fy], "ax", "middle"));
  const byFy = {};
  D.appropriations.forEach(r => (byFy[r.fy] = byFy[r.fy] || []).push(r));
  Object.entries(byFy).forEach(([fy, recs]) => {
    recs.sort((a, b) => a.amount - b.amount);
    const seen = {};
    recs.forEach(r => {
      const k = Math.round(r.amount / 1e6);
      seen[k] = (seen[k] || 0) + 1;
      hover(el("circle", { cx: xs(+fy) + (seen[k] - 1) * 13, cy: y(r.amount), r: 6.5,
        fill: color[r.measure] || css("--neutral"),
        stroke: css("--surface-1"), "stroke-width": 2 }, s),
        `<b>${fys[fy]} — ${r.measure}</b><br>${dollars(r.amount)}<br>` +
        `<span style="opacity:.75">${r.as_of} · ${r.source}</span>`);
    });
  });
  const n36 = (byFy[36] || []).length;
  const spent34 = (byFy[34] || []).find(r => r.measure === "spent");
  text(s, xs(36) - 16, y(2.8e8), `2025-26: ${n36} figures, ${n36} documents  →`, "ax", "end");
  if (spent34) text(s, xs(34) + 16, y(spent34.amount), money(spent34.amount) + " actually spent", "ax");
}

/* ── Part three: where does the money go? ───────────────────────────────── */

export function categories(D, hostId) {
  const refundLabel = /refund/i;
  const all = D.categories_fy35;
  const c = all.filter(r => r.amount > 0);
  const refunds = all.find(r => refundLabel.test(r.label));
  const totD = D.categories_totals.amount, totT = D.categories_totals.transactions;
  const RH = 25, PAD = 210, H = c.length * RH + 52;
  const s = svg(hostId, W, H, "Spending by category: share of dollars and share of transactions");
  const half = (W - PAD - 40) / 2 - 26;
  text(s, PAD, 12, "Share of dollars", "ax");
  text(s, PAD + half + 52, 12, "Share of transactions", "ax");
  c.forEach((r, i) => {
    const y = 28 + i * RH;
    text(s, PAD - 12, y + 9, r.label, "lbl", "end");
    const dw = r.amount / totD * half, tw = r.transactions / totT * half;
    hover(el("rect", { x: PAD, y, width: Math.max(dw, 1.5), height: 11, rx: 4, fill: css("--cat-1") }, s),
      `<b>${r.label}</b><br>${dollars(r.amount)} — ${(r.amount / totD * 100).toFixed(1)}% of dollars`);
    hover(el("rect", { x: PAD + half + 52, y, width: Math.max(tw, 1.5), height: 11, rx: 4, fill: css("--cat-3") }, s),
      `<b>${r.label}</b><br>${num(r.transactions)} transactions — ${(r.transactions / totT * 100).toFixed(1)}%<br>average ${dollars(r.avg)}`);
    if (dw > 26) text(s, PAD + dw + 7, y + 5.5, (r.amount / totD * 100).toFixed(0) + "%", "ax");
    if (tw > 26) text(s, PAD + half + 52 + tw + 7, y + 5.5, (r.transactions / totT * 100).toFixed(0) + "%", "ax");
  });
  if (refunds) text(s, PAD, H - 14,
    `A refunds/cancellations row of ${dollars(refunds.amount)} across ${num(refunds.transactions)} transactions is omitted from these two bars.`, "ax");
}

export function twoPrograms(D, hostId) {
  const S = D.cat_by_sector, H = 430;
  const s = svg(hostId, W, H, "Spending by category, private school students versus homeschool students");
  [["Private school students", S.private, css("--cat-1")],
   ["Homeschool students", S.homeschool, css("--cat-3")]].forEach(([ttl, v, col], p) => {
    const x0 = p * 452 + 150;
    const rows = v.rows.filter(r => r.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 10);
    const max = rows[0].amount, bw = 452 - 202;
    text(s, x0 - 138, 16, ttl, "val");
    text(s, x0 - 138, 32,
      `${money(v.total)} · ${num(v.transactions)} transactions · ${dollars(v.avg)} average`, "ax");
    rows.forEach((r, i) => {
      const y = 52 + i * 30;
      text(s, x0 - 8, y + 7, truncate(r.label, 23), "lbl", "end");
      const w = r.amount / max * bw;
      hover(el("rect", { x: x0, y, width: Math.max(w, 2), height: 14, rx: 4, fill: col }, s),
        `<b>${r.label}</b><br>${dollars(r.amount)} — ${(r.amount / v.total * 100).toFixed(1)}% of ${ttl.toLowerCase()} spending<br>${num(r.transactions)} transactions`);
      const pc = r.amount / v.total * 100;
      text(s, x0 + w + 8, y + 7, pc < 0.5 ? "<1%" : pc.toFixed(0) + "%", "val");
    });
  });
  const y0 = 370;
  text(s, 12, y0, "Transactions per $1m spent", "val");
  [["Private school", S.private.transactions / (S.private.total / 1e6), css("--cat-1")],
   ["Homeschool", S.homeschool.transactions / (S.homeschool.total / 1e6), css("--cat-3")]]
    .forEach(([nm, v, c], i) => {
      const w = v / 6000 * 640;
      el("rect", { x: 170, y: y0 + 12 + i * 24, width: w, height: 15, rx: 4, fill: c }, s);
      text(s, 162, y0 + 20 + i * 24, nm, "lbl", "end");
      text(s, 170 + w + 8, y0 + 20 + i * 24, num(v), "val");
    });
}

export function explosion(D, hostId) {
  const H = 290, s = svg(hostId, W, H, "Named recipients of funds, 2023-24 versus 2024-25");
  const n34 = D.derived.n_recipients_fy34, n35 = D.recipients.n;
  const field = (x0, y0, n, cols, r, gap, c, cap, sub) => {
    for (let i = 0; i < n; i++)
      el("circle", { cx: x0 + (i % cols) * gap, cy: y0 + Math.floor(i / cols) * gap,
        r, fill: c, "fill-opacity": .85 }, s);
    text(s, x0 - 2, y0 - 24, cap, "val");
    text(s, x0 - 2, y0 - 8, sub, "ax");
  };
  field(24, 62, n34, 40, 5, 13, css("--cat-2"), `2023-24 — ${n34} named recipients`,
    "every one of them printable in a single table");
  field(400, 62, n35, 72, 2.1, 6.6, css("--cat-1"), `2024-25 — ${num(n35)} named recipients`,
    "forty-nine pages of appendix");
  text(s, 24, H - 14,
    "Each mark is one named recipient of Education Freedom Account money. Drawn to the same scale on both sides.", "ax");
}

export function concentration(D, hostId, summaryId) {
  const cur = D.recipients.curve, n = cur.length;
  const H = 330, PADL = 64, PADB = 48;
  const s = svg(hostId, W, H, "Every named recipient ranked by amount received");
  const lx = v => PADL + (Math.log10(v) / Math.log10(n)) * (W - PADL - 140);
  const ly = v => H - PADB - ((Math.log10(Math.max(v, 10)) - 1) / (Math.log10(1e7) - 1)) * (H - PADB - 26);
  [10, 100, 1000, 1e4, 1e5, 1e6, 1e7].forEach(v => {
    el("line", { x1: PADL, y1: ly(v), x2: W - 140, y2: ly(v), class: "gl" }, s);
    text(s, PADL - 10, ly(v), money(v), "ax", "end");
  });
  [1, 10, 100, 1000].forEach(v => text(s, lx(v), H - PADB + 18, "#" + num(v), "ax", "middle"));
  let d = "";
  cur.forEach((p, i) => { d += (i ? "L" : "M") + lx(p.rank).toFixed(1) + " " + ly(p.amount).toFixed(1); });
  el("path", { d, fill: "none", stroke: css("--cat-1"), "stroke-width": 2 }, s);
  // Annotate the three marks the prose names, located by rank in the data.
  [[0, -24], [3, -14], [13, 26]].forEach(([idx, dy]) => {
    const t = D.recipients.top[idx]; if (!t) return;
    const p = cur[idx], px = lx(p.rank), py = ly(p.amount);
    hover(el("circle", { cx: px, cy: py, r: 5, fill: css("--cat-2"),
      stroke: css("--surface-1"), "stroke-width": 2 }, s),
      `<b>${t.display}</b><br>rank ${p.rank} — ${dollars(p.amount)}`);
    el("line", { x1: px, y1: py, x2: px + 13, y2: py + dy, stroke: css("--cat-2"),
      "stroke-width": 1, "stroke-opacity": .5 }, s);
    text(s, px + 17, py + dy, t.display + " · " + money(p.amount), "ax");
  });
  const med = D.recipients.median;
  el("line", { x1: PADL, y1: ly(med), x2: W - 140, y2: ly(med), stroke: css("--cat-7"),
    "stroke-width": 1.5, "stroke-dasharray": "5 4" }, s);
  text(s, W - 136, ly(med), "median $" + num(med), "ax");
  text(s, PADL, H - 14, `Rank (log) × amount received (log). ${num(n)} recipients, ${periodLabel(D.recipients.period)}.`, "ax");
  const el_ = document.getElementById(summaryId);
  if (el_) el_.textContent = "Share of all recipient dollars: " +
    D.recipients.concentration.map(c => `top ${c.k} — ${(c.share * 100).toFixed(0)}%`).join("  ·  ");
}

export function topRecipients(D, hostId) {
  // CORRECTION: the caption sat at H-4 with a middle baseline, which put its
  // bottom edge 1.9px outside the viewBox and clipped the descenders — the same
  // defect fixed on the award chart at 19d5f37. Growing H alone does not fix it
  // (the caption is positioned FROM H and simply moves down with it); the
  // offset has to grow too. +34 with the caption at H-14 leaves 8px of margin.
  const t = D.recipients.top, RH = 25, PAD = 310, H = t.length * RH + 34;
  const s = svg(hostId, W, H, "The twenty largest recipients of funds");
  const max = t[0].amount;
  const RETAIL = ["BEST BUY", "AMAZON", "LAKESHORE", "OFFICE DEPOT", "STAPLES"];
  t.forEach((r, i) => {
    const y = 14 + i * RH, bw = r.amount / max * (W - PAD - 110);
    text(s, PAD - 12, y + 8, (i + 1) + ". " + r.display, "lbl", "end");
    const isVendor = RETAIL.some(k => r.name.toUpperCase().startsWith(k));
    hover(el("rect", { x: PAD, y, width: Math.max(bw, 2), height: 16, rx: 4,
      fill: isVendor ? css("--cat-2") : css("--cat-1") }, s),
      `<b>${r.name}</b><br>${dollars(r.amount)}`);
    text(s, PAD + bw + 9, y + 8, dollars(r.amount), "val");
  });
  text(s, PAD, H - 14, "Orange marks a national retailer rather than a school or education provider.", "ax");
}

/* ── Part four: which schools? ──────────────────────────────────────────── */

export function shareOfEnrollment(D, hostId) {
  const H = 250, s = svg(hostId, W, H, "Distribution of voucher students as a share of school enrollment");
  const bins = fy => {
    const b = new Array(10).fill(0);
    D.schools.filter(x => x.fy === fy && x.pct != null)
      .forEach(x => { b[Math.min(Math.floor(x.pct / 10), 9)]++; });
    return b;
  };
  const a = bins(34), c = bins(35), max = Math.max(...a, ...c);
  const n34 = D.schools.filter(x => x.fy === 34).length;
  const n35 = D.schools.filter(x => x.fy === 35).length;
  [[`2023-24 — ${n34} schools`, a, css("--neutral")],
   [`2024-25 — ${n35} schools`, c, css("--cat-1")]].forEach(([ttl, b, col], p) => {
    const x0 = 40 + p * 450, w = (450 - 90) / 10;
    text(s, x0, 18, ttl, "val");
    b.forEach((v, i) => {
      const h = v / max * 150, x = x0 + i * w, y = H - 58 - h;
      hover(el("rect", { x, y, width: w - 3, height: Math.max(h, 1), rx: 4, fill: col }, s),
        `<b>${i * 10}–${i * 10 + 9}% of enrollment</b><br>${v} school${v === 1 ? "" : "s"}`);
      if (v) text(s, x + (w - 3) / 2, y - 9, v, "ax", "middle");
    });
    [0, 50, 100].forEach(t => text(s, x0 + (t / 10) * w, H - 40, t + "%", "ax", "middle"));
    text(s, x0, H - 18, "voucher students as a share of the school's enrollment", "ax");
  });
}

export function growth(D, hostId) {
  const m = D.schools_joined.filter(r => !r.new_entrant)
    .sort((a, b) => (b.efa35 - b.efa34) - (a.efa35 - a.efa34)).slice(0, 26);
  const RH = 22, PAD = 250, H = m.length * RH + 42;
  const s = svg(hostId, W, H, "Change in voucher students per school, 2023-24 to 2024-25");
  const max = Math.max(...m.map(r => r.efa35));
  const x = v => PAD + v / max * (W - PAD - 96);
  m.forEach((r, i) => {
    const y = 16 + i * RH, d = r.efa35 - r.efa34;
    text(s, PAD - 12, y, truncate(r.name, 36), "lbl", "end");
    el("line", { x1: x(r.efa34), y1: y, x2: x(r.efa35), y2: y, stroke: css("--gridline"),
      "stroke-width": 3, "stroke-linecap": "round" }, s);
    const t = `<b>${r.name}</b><br>2023-24: ${r.efa34} voucher students<br>2024-25: ${r.efa35}<br>change: ${d > 0 ? "+" : ""}${d}`;
    hover(el("circle", { cx: x(r.efa34), cy: y, r: 4.5, fill: css("--neutral") }, s), t);
    hover(el("circle", { cx: x(r.efa35), cy: y, r: 5.5, fill: css("--cat-1"),
      stroke: css("--surface-1"), "stroke-width": 1.5 }, s), t);
    text(s, x(r.efa35) + 11, y, (d > 0 ? "+" : "") + d, "val");
  });
  text(s, PAD, H - 12, "Voucher students per school. Dumbbell: 2023-24 to 2024-25.", "ax");
}

export function impliedDollars(D, hostId) {
  const a34 = D.award.by_fy["34"].allocated, a35 = D.award.by_fy["35"].allocated;
  const m = D.schools_joined.filter(r => !r.new_entrant)
    .sort((a, b) => (b.implied35 - b.implied34) - (a.implied35 - a.implied34)).slice(0, 18);
  const RH = 30, PAD = 250, H = m.length * RH + 42;
  const s = svg(hostId, W, H, "Implied full-year dollars per school, derived");
  const max = Math.max(...m.map(r => r.implied35));
  const x = v => v / max * (W - PAD - 124);
  m.forEach((r, i) => {
    const y = 14 + i * RH;
    text(s, PAD - 12, y + 10, truncate(r.name, 36), "lbl", "end");
    hover(el("rect", { x: PAD, y: y + 1, width: Math.max(x(r.implied34), 1), height: 8, rx: 4,
      fill: css("--neutral") }, s),
      `<b>${r.name}</b><br>2023-24 implied: ${dollars(r.implied34)}<br><span style="opacity:.75">${r.efa34} students × ${dollars(a34)}</span>`);
    hover(el("rect", { x: PAD, y: y + 11, width: Math.max(x(r.implied35), 1), height: 8, rx: 4,
      fill: css("--cat-3") }, s),
      `<b>${r.name}</b><br>2024-25 implied: ${dollars(r.implied35)}<br><span style="opacity:.75">${r.efa35} students × ${dollars(a35)}</span>`);
    text(s, PAD + x(r.implied35) + 9, y + 5, money(r.implied35), "val");
    text(s, PAD + x(r.implied35) + 9, y + 18, "+" + money(r.implied35 - r.implied34), "ax");
  });
  text(s, PAD, H - 12, "Implied full-year dollars = voucher students × that year's account value. Ranked by increase.", "ax");
}

export function semesterCheck(D, hostId, noteId) {
  const m = D.schools_joined.filter(r => r.appendixB && r.efa35 >= 25 && r.ratio != null);
  const H = 340, PADL = 76, PADB = 52;
  const s = svg(hostId, W, H, "Appendix B spring dollars against implied full-year dollars");
  const maxI = Math.max(...m.map(r => r.implied35));
  const x = v => PADL + v / maxI * (W - PADL - 40), y = v => H - PADB - v / maxI * (H - PADB - 26);
  [0, 1e6, 2e6, 3e6, 4e6].forEach(v => {
    el("line", { x1: PADL, y1: y(v), x2: W - 40, y2: y(v), class: "gl" }, s);
    text(s, PADL - 10, y(v), money(v), "ax", "end");
    if (v) text(s, x(v), H - PADB + 18, money(v), "ax", "middle");
  });
  el("line", { x1: x(0), y1: y(0), x2: x(maxI), y2: y(maxI / 2), stroke: css("--cat-7"),
    "stroke-width": 2, "stroke-dasharray": "6 5" }, s);
  text(s, x(maxI) - 6, y(maxI / 2) - 14, "exactly half a year", "ax", "end")
    .setAttribute("fill", css("--prelim"));
  m.forEach(r => {
    hover(el("circle", { cx: x(r.implied35), cy: y(r.appendixB), r: 5,
      fill: r.ratio < 0.38 ? css("--cat-2") : css("--cat-3"), "fill-opacity": .72,
      stroke: css("--surface-1"), "stroke-width": 1 }, s),
      `<b>${r.name}</b><br>implied full year ${dollars(r.implied35)}<br>Appendix B (spring) ${dollars(r.appendixB)}<br>ratio ${(r.ratio * 100).toFixed(0)}%`);
  });
  text(s, PADL, H - 16,
    "x: implied full-year dollars · y: Appendix B spring dollars · one dot per school (25+ voucher students)", "ax");

  const sc = D.semester_check;
  const low = m.filter(r => r.ratio < 0.38).sort((a, b) => a.ratio - b.ratio);
  const note = document.getElementById(noteId);
  if (note) note.innerHTML =
    `Across the ${sc.n} schools with ${sc.threshold_students} or more voucher students the median ratio is ` +
    `<strong>${(sc.median * 100).toFixed(1)}%</strong> — independently corroborating the report's footnote and ` +
    `validating the implied-dollar arithmetic. A second, simpler corroboration needs no reconstruction at all: ` +
    `Appendix B's ${money(D.recipients.total)} is <strong>${(sc.appendix_over_fullyear * 100).toFixed(1)}%</strong> ` +
    `of the same report's full-year all-student total of ${money(D.categories_totals.amount)}. ` +
    (low.length ? `${low.length} school${low.length === 1 ? "" : "s"} in orange fall well below half ` +
      `(${low[0].name}: ${low[0].efa35} students, ${dollars(low[0].appendixB)} in Appendix B), which most likely means ` +
      `their spring transactions sit under a different name in the appendix — the same identifier problem as below, ` +
      `in a second guise. ` : "") +
    `<span class="pill obs">cross-checked</span>`;
}

export function identity(D, hostId) {
  const I = D.identity, H = 232, s = svg(hostId, W, H, "Schools traceable across two years by name");
  const bars = [
    ["Matches a 2023-24 name exactly", I.matched, css("--cat-3"), "Trackable across the two years."],
    ["No 2023-24 name match — renamed, or new; the record does not say which",
     I.unresolved, css("--cat-2"), "Untrackable without manual adjudication."],
  ];
  const tot = bars.reduce((a, b) => a + b[1], 0);
  let cx = 40; const y = 46, w = W - 80;
  bars.forEach(([nm, v, c, sub]) => {
    const bw = v / tot * w;
    hover(el("rect", { x: cx, y, width: Math.max(bw - 2, 2), height: 46, rx: 5, fill: c }, s),
      `<b>${v} schools</b><br>${nm}<br><span style="opacity:.75">${sub}</span>`);
    text(s, cx + bw / 2 - 1, y + 23, v, "val", "middle").setAttribute("fill", css("--page-plane"));
    cx += bw;
  });
  text(s, 40, 28, `The ${I.fy35_total} schools in the 2024-25 participation table`, "val");
  bars.forEach(([nm, v, c], i) => {
    const yy = 118 + i * 26;
    el("rect", { x: 40, y: yy - 6, width: 11, height: 11, rx: 3, fill: c }, s);
    text(s, 58, yy, `${v} — ${nm}`, "lbl");
  });
  text(s, 40, H - 30, `Within a single year the name is not a key either: ${I.collapse_fy34} names ` +
    `collapse in 2023-24 and ${I.collapse_fy35} in 2024-25 once the disambiguating city is stripped.`, "ax");
  text(s, 40, H - 12,
    "“St. Joseph Catholic School” appears three times in the 2023-24 table.", "ax");
}

export function assessment(D, hostId) {
  const m = D.schools_joined.filter(r => r.math != null && r.ela != null);
  const H = 380, PAD = 60, s = svg(hostId, W, H, "Average math and ELA percentile by school");
  const x = v => PAD + v / 100 * (W - PAD - 60), y = v => H - PAD - v / 100 * (H - PAD - 30);
  [0, 25, 50, 75, 100].forEach(v => {
    el("line", { x1: PAD, y1: y(v), x2: W - 60, y2: y(v), class: "gl" }, s);
    el("line", { x1: x(v), y1: 30, x2: x(v), y2: H - PAD, class: "gl" }, s);
    text(s, PAD - 10, y(v), v, "ax", "end");
    text(s, x(v), H - PAD + 18, v, "ax", "middle");
  });
  el("line", { x1: x(50), y1: 30, x2: x(50), y2: H - PAD, stroke: css("--cat-7"), "stroke-width": 1.5 }, s);
  el("line", { x1: PAD, y1: y(50), x2: W - 60, y2: y(50), stroke: css("--cat-7"), "stroke-width": 1.5 }, s);
  text(s, x(50) + 7, 38, "national norm", "ax").setAttribute("fill", css("--prelim"));
  m.forEach(r => {
    hover(el("circle", { cx: x(r.math), cy: y(r.ela), r: Math.max(3.5, Math.sqrt(r.efa35) / 2.1),
      fill: css("--cat-1"), "fill-opacity": .42, stroke: css("--cat-1"), "stroke-opacity": .7 }, s),
      `<b>${r.name}</b><br>math ${r.math}th percentile · ELA ${r.ela}th<br>${r.efa35} voucher students`);
  });
  text(s, PAD, H - 16,
    `x: average math percentile · y: average ELA percentile · ${m.length} schools`, "ax");
}

export function retention(D, hostId) {
  // CORRECTION: school-level only. The source table's 127 rows are 126 schools
  // plus one Homeschool aggregate; the pack plotted all 127 and captioned it
  // "one mark per school (127)". The aggregate is stated beside the chart
  // instead, never inside it.
  const r = D.retention.schools.slice().sort((a, b) => a.in_program - b.in_program);
  const H = 210, PADL = 44, s = svg(hostId, W, H, "Share of each school's voucher students continuing into 2025-26");
  const x = v => PADL + (v / 100) * (W - PADL - 60);
  [0, 25, 50, 75, 100].forEach(v => {
    el("line", { x1: x(v), y1: 24, x2: x(v), y2: H - 46, class: "gl" }, s);
    text(s, x(v), H - 30, v + "%", "ax", "middle");
  });
  r.forEach((d, i) => {
    hover(el("circle", { cx: x(d.in_program), cy: (i % 9) * 13 + 24, r: 4, fill: css("--cat-1"),
      "fill-opacity": .55, stroke: css("--surface-1"), "stroke-width": 1 }, s),
      `<b>${d.school}</b><br>${d.in_program}% stayed in the program<br>${d.same_school}% stayed at this school`);
  });
  const med = r[Math.floor(r.length / 2)].in_program;
  el("line", { x1: x(med), y1: 16, x2: x(med), y2: H - 46, stroke: css("--cat-2"), "stroke-width": 2 }, s);
  text(s, x(med) + 8, 16, "median " + med + "%", "val");
  const agg = D.retention.aggregate[0];
  text(s, PADL, H - 24,
    `One mark per school (${r.length}). Horizontal position is the share of its voucher students continuing in the program.`, "ax");
  if (agg) text(s, PADL, H - 8,
    `The table's ${D.retention.n_rows_in_table}th row is a Homeschool aggregate (${agg.in_program}%), not a school — excluded here.`, "ax");
}

export function award(D, hostId) {
  const rows = ["34", "35", "36", "37"].map(k => D.award.by_fy[k]);
  const H = 276, PADL = 70, s = svg(hostId, W, H, "The 90% rule: foundation funding and the voucher account value");
  const max = 10500, y = v => H - 68 - (v / max) * (H - 100);   // H grew by 16 for a 2-line caption; plot box unchanged
  [0, 2500, 5000, 7500, 10000].forEach(v => {
    el("line", { x1: PADL, y1: y(v), x2: W - 30, y2: y(v), class: "gl" }, s);
    text(s, PADL - 10, y(v), "$" + num(v), "ax", "end");
  });
  const bw = (W - PADL - 60) / rows.length;
  rows.forEach((r, i) => {
    const x0 = PADL + i * bw + 18;
    hover(el("rect", { x: x0, y: y(r.foundation_prior_year), width: bw * 0.34,
      height: y(0) - y(r.foundation_prior_year), rx: 4, fill: css("--neutral"), "fill-opacity": .8 }, s),
      `<b>${r.school_year}</b><br>Foundation funding per public school student, ${r.foundation_prior_school_year}: ${dollars(r.foundation_prior_year)}`);
    hover(el("rect", { x: x0 + bw * 0.34 + 3, y: y(r.allocated), width: bw * 0.34,
      height: y(0) - y(r.allocated), rx: 4, fill: css("--cat-1") }, s),
      `<b>${r.school_year}</b><br>Allocated per account: ${dollars(r.allocated)}<br>` +
      `${(r.pct_of_prior_foundation * 100).toFixed(2)}% of the prior year's foundation funding` +
      (r.net ? `<br>Net to the family after the platform fee: ${dollars(r.net)}` +
               ` (${(r.implied_withholding * 100).toFixed(2)}% withheld)` : ""));
    // CORRECTION: the net line is drawn only where a net figure was actually
    // published. 2023-24 and 2024-25 have none, and drawing it level with the
    // allocation there would assert that gross equalled net, which no source says.
    if (r.net) el("line", { x1: x0 + bw * 0.34 + 3, y1: y(r.net), x2: x0 + bw * 0.68 + 3, y2: y(r.net),
      stroke: css("--page-plane"), "stroke-width": 2, "stroke-dasharray": "3 3" }, s);
    text(s, x0 + bw * 0.34, y(r.foundation_prior_year) - 11, dollars(r.foundation_prior_year), "ax", "middle");
    text(s, x0 + bw * 0.34 + 3 + bw * 0.17, y(r.allocated) - 11, dollars(r.allocated), "val", "middle");
    text(s, x0 + bw * 0.34, H - 46, r.school_year, "ax", "middle");
  });
  text(s, PADL, H - 22,
    "Every year is exactly 90% of the prior year's foundation funding.", "ax");
  text(s, PADL, H - 8,
    "Dashed line = net to the family after the payment-platform fee, where one is published.", "ax");
}

/** The five figures that genuinely came from the released records: average
 *  tuition, and the school-application outcome counts. These were in the data
 *  from the first build and drawn nowhere, while three department statements
 *  wore the badge they had earned. Added 2026-07-27.
 *
 *  The tuition figure is approximate — the article says "about $9,800" — and is
 *  drawn as a band rather than a bar edge, because plotting a hedged number as
 *  a precise mark is the same error as plotting "nearly 57,000". */
export function obtainedTuition(D, hostId) {
  const fig = Object.fromEntries(D.obtained_2026_27.figures.map(f => [f.key, f]));
  const a37 = D.award.by_fy["37"];
  const tuition = fig.avg_tuition.value;
  // H carries three caption lines below the plot; the lines start at x=0 rather
  // than at PADL because at PADL they run past the 900-unit viewBox and clip.
  const H = 214, PADL = 210, s = svg(hostId, W, H,
    "Average tuition at a participating private school against the 2026-27 voucher");
  const max = 11000, x = v => PADL + (v / max) * (W - PADL - 150);

  const bars = [
    ["Average tuition charged", tuition, css("--obtained"), true,
     `${fig.avg_tuition.note} Drawn as an approximate band, not a precise edge.`],
    ["Allocated per account", a37.allocated, css("--cat-1"), false,
     `${dollars(a37.allocated)} — 90% of the prior year's foundation funding.`],
    ["Net reaching the family", a37.net, css("--neutral"), false,
     `${dollars(a37.net)} after the payment-platform fee.`],
  ];
  bars.forEach(([nm, v, col, approx, tip], i) => {
    const y = 30 + i * 40, bw = x(v) - PADL;
    text(s, PADL - 12, y + 10, nm, "lbl", "end");
    hover(el("rect", { x: PADL, y, width: Math.max(bw, 2), height: 20, rx: 4, fill: col,
      "fill-opacity": approx ? .55 : 1 }, s), `<b>${nm}</b><br>${tip}`);
    if (approx) {
      // A soft right edge: the value is hedged, so the bar should not end in a
      // hard line. Drawn as a hatched over-run rather than a gradient so it
      // survives a monochrome print.
      for (let k = 0; k < 5; k++)
        el("line", { x1: PADL + bw - 10 + k * 5, y1: y, x2: PADL + bw - 18 + k * 5, y2: y + 20,
          stroke: css("--obtained"), "stroke-width": 1, "stroke-opacity": .5 }, s);
    }
    text(s, PADL + bw + 10, y + 10, (approx ? "about " : "") + dollars(v), "val");
  });

  // The gap is the finding. Bracket it between the tuition band and the award.
  const gy = 30, gx0 = x(a37.allocated), gx1 = x(tuition);
  el("line", { x1: gx0, y1: gy - 12, x2: gx1, y2: gy - 12, stroke: css("--cat-2"),
    "stroke-width": 1.5 }, s);
  [gx0, gx1].forEach(gx => el("line", { x1: gx, y1: gy - 16, x2: gx, y2: gy - 8,
    stroke: css("--cat-2"), "stroke-width": 1.5 }, s));
  text(s, (gx0 + gx1) / 2, gy - 22, dollars(D.derived.tuition_gap_vs_allocated_37) + " gap",
    "val", "middle").setAttribute("fill", css("--cat-2"));

  text(s, 0, H - 40,
    `The gap a family covers itself: ${dollars(D.derived.tuition_gap_vs_allocated_37)} against ` +
    `the allocated award, or ${dollars(D.derived.tuition_gap_vs_net_37)} against the net`, "ax");
  text(s, 0, H - 26,
    `amount that actually reaches the account — which is the ` +
    `“${D.derived.tuition_gap_as_reported}” the source article reports,`, "ax");
  text(s, 0, H - 12,
    "reproduced here from its own figures rather than quoted.", "ax");
}

/** Outcome of the 2026-27 school applications: 176 applied, 164 approved,
 *  2 denied, 10 under review. All four from the released records. */
export function obtainedSchools(D, hostId) {
  const f = Object.fromEntries(D.obtained_2026_27.figures.map(x => [x.key, x.value]));
  const H = 132, PADL = 210, s = svg(hostId, W, H,
    "Private schools applying to participate in 2026-27, and the outcome");
  const total = f.schools_applied, w = W - PADL - 150;
  text(s, PADL - 12, 26, "Applied to participate", "lbl", "end");
  hover(el("rect", { x: PADL, y: 16, width: w, height: 20, rx: 4, fill: css("--neutral") }, s),
    `<b>Applied</b><br>${total} private schools applied to participate in 2026-27`);
  text(s, PADL + w + 10, 26, num(total), "val");

  let cx = PADL;
  const parts = [
    ["Approved", f.schools_approved, css("--obtained")],
    ["Still under review", f.schools_under_review, css("--prelim")],
    ["Denied", f.schools_denied, css("--cat-2")],
  ];
  parts.forEach(([nm, v, col]) => {
    const bw = v / total * w;
    hover(el("rect", { x: cx, y: 56, width: Math.max(bw - 1.5, 1.5), height: 20, rx: 4,
      fill: col }, s),
      `<b>${nm}</b><br>${v} of ${total} — ${(v / total * 100).toFixed(1)}%`);
    cx += bw;
  });
  text(s, PADL - 12, 66, "Outcome", "lbl", "end");
  // The three counts are spelled out in the legend directly below; repeating
  // them at the bar's right edge ran 96px past the viewBox and clipped.
  text(s, PADL + w + 10, 66, num(f.schools_approved) + " approved", "val");

  let lx = PADL;
  parts.forEach(([nm, v, col]) => {
    el("rect", { x: lx, y: 92, width: 11, height: 11, rx: 3, fill: col }, s);
    text(s, lx + 17, 98, `${nm} — ${v}`, "ax");
    lx += (nm.length + String(v).length) * 6.3 + 42;
  });
  text(s, PADL, H - 8,
    "Two denials in 176 applications. Nothing published explains either one.", "ax");
}

export function homeschool(D, hostId) {
  const h = D.homeschool, H = 270, PADL = 62, PADB = 44;
  const s = svg(hostId, W, H, "Home-schooled students in Arkansas, 1997-98 to 2025-26");
  const max = Math.max(...h.map(d => d.n)) * 1.08;
  const x = i => PADL + (i / (h.length - 1)) * (W - PADL - 40);
  const y = v => H - PADB - (v / max) * (H - PADB - 26);
  // The EFA-era band starts at the program's first year, taken from the
  // award series rather than typed.
  const firstEfaYear = D.award.by_fy["34"].school_year;
  const efaStart = h.findIndex(d => d.school_year.slice(0, 4) === firstEfaYear.slice(0, 4));
  if (efaStart > 0) el("rect", { x: x(efaStart), y: 20, width: W - 40 - x(efaStart),
    height: H - PADB - 20, fill: css("--band-efa") }, s);
  [0, 10000, 20000, 30000, 40000].forEach(v => {
    el("line", { x1: PADL, y1: y(v), x2: W - 40, y2: y(v), class: "gl" }, s);
    text(s, PADL - 10, y(v), num(v), "ax", "end");
  });
  let d = "";
  h.forEach((p, i) => { d += (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.n).toFixed(1); });
  el("path", { d, fill: "none", stroke: css("--cat-1"), "stroke-width": 2.5 }, s);
  h.forEach((p, i) => hover(el("circle", { cx: x(i), cy: y(p.n), r: 8, fill: "transparent" }, s),
    `<b>${p.school_year}</b><br>${num(p.n)} home-schooled students`));
  [0, 10, 20, h.length - 1].forEach(i => text(s, x(i), H - PADB + 20, h[i].school_year.slice(0, 4), "ax", "middle"));
  if (efaStart > 0) text(s, x(efaStart) - 8, H - PADB - 12, "EFA era", "ax", "end");
  const last = h[h.length - 1];
  el("circle", { cx: x(h.length - 1), cy: y(last.n), r: 5, fill: css("--cat-1") }, s);
  text(s, x(h.length - 1) - 8, y(last.n) - 16, num(last.n), "val", "end");
}

/* ── Part four continued: assessment ────────────────────────────────────── */

export function instruments(D, hostId) {
  const I = D.instruments, RH = 24, PAD = 210, H = I.length * RH + 56;
  const s = svg(hostId, W, H, "Assessment instruments used, completions and average percentiles");
  const max = Math.max(...I.map(r => r.completions)), BARW = 290, DX = 610, DW = 210;
  text(s, PAD, 14, "Test completions", "ax");
  text(s, DX, 14, "Average percentile", "ax");
  text(s, DX + 126, 14, "● math", "ax").setAttribute("fill", css("--cat-2"));
  text(s, DX + 176, 14, "● reading", "ax").setAttribute("fill", css("--cat-3"));
  const sx = v => DX + v / 100 * DW;
  I.forEach((r, i) => {
    const y = 30 + i * RH;
    // Axis labels are shortened; the tooltip carries the name exactly as printed.
    text(s, PAD - 10, y + 7, truncate(r.short, 31), "lbl", "end");
    const w = r.completions / max * BARW;
    hover(el("rect", { x: PAD, y, width: Math.max(w, 2), height: 13, rx: 4, fill: css("--cat-1") }, s),
      `<b>${r.name}</b><br>${num(r.completions)} completions<br>math ${r.math}th · reading ${r.reading}th percentile`);
    text(s, PAD + w + 8, y + 7, num(r.completions), "ax");
    el("line", { x1: sx(0), y1: y + 7, x2: sx(100), y2: y + 7, stroke: css("--gridline"), "stroke-width": 1 }, s);
    [[r.math, css("--cat-2"), "math"], [r.reading, css("--cat-3"), "reading"]].forEach(([v, c, nm]) =>
      hover(el("circle", { cx: sx(v), cy: y + 7, r: 4.5, fill: c }, s),
        `<b>${r.name}</b><br>${nm} ${v}th percentile`));
    if (i === I.length - 1) [0, 50, 100].forEach(v => text(s, sx(v), y + 24, v, "ax", "middle"));
  });
  el("line", { x1: sx(50), y1: 24, x2: sx(50), y2: H - 32, stroke: css("--cat-7"), "stroke-width": 1.5 }, s);
}

export function atlas(D, hostId) {
  const A = D.atlas, H = 300, PAD = 210;
  const s = svg(hostId, W, H, "ATLAS performance levels, statewide and by school");
  const cols = [css("--cat-2"), css("--cat-7"), css("--cat-1"), css("--cat-3")];
  const bar = (label, vals, y, subject) => {
    text(s, PAD - 10, y + 13, label, "lbl", "end");
    if (!vals) { text(s, PAD, y + 13, "not administered", "ax"); return; }
    let cx = PAD; const w = W - PAD - 168;
    // Values are drawn exactly as printed. Six of the fourteen published rows
    // sum to 99 or 101 — the source rounds each level independently — so the
    // bar deliberately does not reach the full width. Normalizing to 100 would
    // invent precision the source does not have.
    vals.forEach((v, i) => {
      const bw = v / 100 * w;
      if (bw > 0) {
        hover(el("rect", { x: cx, y, width: Math.max(bw - 2, 1.5), height: 26, rx: 4, fill: cols[i] }, s),
          `<b>${subject} — Level ${i + 1}</b><br>${v}% of students`);
        if (bw > 34) text(s, cx + bw / 2 - 1, y + 13, v + "%", "val", "middle")
          .setAttribute("fill", css("--page-plane"));
      }
      cx += bw;
    });
    const sum = vals.reduce((a, b) => a + b, 0);
    text(s, W - 162, y + 13, (vals[2] + vals[3]) + "% proficient+" + (sum !== 100 ? ` (sums ${sum})` : ""), "val");
  };
  text(s, PAD - 10, 16, "All EFA students taking ATLAS", "val", "end");
  let y = 30;
  Object.entries(A.levels).forEach(([sub, v]) => { bar(sub, v, y, sub); y += 34; });
  y += 14;
  text(s, PAD - 10, y - 6, "By school (ELA)", "val", "end");
  A.schools.forEach(sc => { bar(truncate(sc.display, 30), sc.ELA, y + 4, sc.display); y += 34; });
}

/* ── Part five: what is not known ───────────────────────────────────────── */

export function coverage(D, hostId) {
  const rows = D.coverage.rows, yrs = D.coverage.years;
  const RH = 23, PAD = 270, H = rows.length * RH + 58;
  const s = svg(hostId, W, H, "What the state publishes, by measure and year");
  const cw = (W - PAD - 40) / yrs.length;
  const KEY = {
    published: ["Published", css("--cat-3")],
    partial: ["Partial", css("--cat-7")],
    obtained: ["Obtained under FOIA", css("--obtained")],
    // This label used to lead with the word the `reported` badge now owns, and
    // that tier means something quite different: a figure given to a
    // journalist. These cells are the opposite — the state's own documents
    // state the measure and disagree with each other. (spot_check family K
    // asserts the old wording is gone, so it is not quoted here.)
    conflict: ["Stated inconsistently", css("--cat-2")],
    absent: ["Absent", null],
  };
  yrs.forEach((yr, j) => text(s, PAD + j * cw + cw / 2, 18, yr, "ax", "middle"));
  rows.forEach((r, i) => {
    const y = 32 + i * RH;
    text(s, PAD - 12, y + 9, r.measure, "lbl", "end");
    r.cells.forEach((st, j) => {
      const [lab, col] = KEY[st];
      const cx = PAD + j * cw + cw / 2, w = cw - 14;
      if (st === "absent") {
        el("rect", { x: cx - w / 2, y: y + 2, width: w, height: 14, rx: 4, fill: "none",
          stroke: css("--neutral"), "stroke-width": 1, "stroke-opacity": .5 }, s);
      } else {
        hover(el("rect", { x: cx - w / 2, y: y + 2, width: w, height: 14, rx: 4, fill: col,
          "fill-opacity": st === "partial" ? .5 : 1 }, s), `<b>${r.measure}, ${yrs[j]}</b><br>${lab}`);
        if (st === "conflict") el("line", { x1: cx - w / 2 + 3, y1: y + 9, x2: cx + w / 2 - 3, y2: y + 9,
          stroke: css("--page-plane"), "stroke-width": 2 }, s);
      }
    });
  });
  const used = new Set(rows.flatMap(r => r.cells));
  let lx = PAD - 12;
  Object.entries(KEY).filter(([k]) => used.has(k)).forEach(([k, [lab, col]]) => {
    const yy = H - 16;
    el("rect", { x: lx, y: yy - 8, width: 11, height: 11, rx: 3,
      fill: col || "none", "fill-opacity": k === "partial" ? .5 : 1,
      stroke: col ? null : css("--neutral"), "stroke-opacity": col ? null : .5 }, s);
    text(s, lx + 17, yy - 2, lab, "ax");
    lx += lab.length * 6.3 + 44;
  });
}

// Color follows the claim: "collected, not published" is the category the
// obtained badge surfaces in the main body, so it wears the obtained token.
// Declaration order is also display order for the summary chips: the two
// "the state never had it" kinds, then the withheld kind, then the three
// "printed once / partly / not yet" kinds, then the one published row.
const REGISTER_KIND = {
  "never collected": ["--verify-observed", "--verify-observed-bg"],
  "never published": ["--verify-observed", "--verify-observed-bg"],
  "collected, not published": ["--obtained", "--obtained-bg"],
  "published once, then dropped": ["--prelim", "--prelim-bg"],
  "published but broken": ["--prelim", "--prelim-bg"],
  "not yet published": ["--prelim", "--prelim-bg"],
  "published": ["--verify-exact", "--verify-exact-bg"],
};

/** Counts the register groups into. Exported so the findings block at the top
 *  of the page states the same numbers this section draws, from one source. */
export function registerCounts(D) {
  const byKind = {};
  D.register.forEach(r => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
  return {
    byKind,
    total: D.register.length,
    // A "hole" is any row that is not the one row recording something the
    // state does publish -- that row is in the register because this project's
    // own QA twice said it did not exist, not because it is missing.
    holes: D.register.filter(r => r.kind !== "published").length,
    withheld: byKind["collected, not published"] || 0,
    // Rows carrying a positive receipt: someone obtained it anyway. The school
    // identifier's note is a NEGATIVE ("not obtainable"), so it is excluded --
    // counting it would claim a receipt that does not exist.
    obtained: D.register.filter(r =>
      r.obtained_by && !/^not obtainable/i.test(r.obtained_by)).length,
  };
}

export function register(D, hostId) {
  const counts = registerCounts(D);
  // The distribution is the finding: four things never collected, five held and
  // withheld. That shape is invisible when sixteen probes run as open prose, so
  // it is stated first and each entry collapses to one line under it.
  const chips = Object.keys(REGISTER_KIND)
    .filter(k => counts.byKind[k])
    .map(k => {
      const [fg, bg] = REGISTER_KIND[k];
      return `<span class="k" style="background:var(${bg});color:var(${fg})">` +
             `${counts.byKind[k]} ${k}</span>`;
    }).join("");

  const rows = D.register.map(r => {
    const [fg, bg] = REGISTER_KIND[r.kind] || ["--verify-observed", "--verify-observed-bg"];
    // The closed label names what is inside, so a reader knows the probe exists
    // and is one click away. Two real spans rather than CSS ::content: the text
    // is selectable, findable with ctrl-F, and survives a stylesheet failure.
    const shows = r.obtained_by ? "show the probe and the receipt" : "show the probe";
    return `<details class="regrow">
      <summary><span class="f">${r.field}</span>` +
      `<span class="k" style="background:var(${bg});color:var(${fg})">${r.kind}</span>` +
      `<span class="hint hint-shut">${shows}</span><span class="hint hint-open">hide</span></summary>
      <div class="probe"><strong style="color:var(--text-muted);font-weight:600">Probe.</strong> ${r.probe}</div>
      ${r.obtained_by ? `<div class="got"><b>Obtained by.</b> ${r.obtained_by}</div>` : ""}
    </details>`;
  }).join("");

  document.getElementById(hostId).innerHTML =
    `<p class="reg-summary">${chips}</p>${rows}`;
}

export function completeness(D, hostId) {
  const pill = v => v === "used" ? '<span class="pill exact">used</span>'
    : v === "found in sweep" ? '<span class="pill prelim">found in sweep</span>'
    : '<span class="pill obs">reference only</span>';
  document.getElementById(hostId).innerHTML =
    "<thead><tr><th>Report</th><th>Object</th><th>Contents</th><th>Status</th></tr></thead><tbody>" +
    D.completeness.map(r => `<tr><td>${r.report}</td><td><strong>${r.object}</strong></td>` +
      `<td>${r.contents}</td><td>${pill(r.status)}</td></tr>`).join("") + "</tbody>";
}

export function reconciliation(D, hostId) {
  const fmt = (v, r) => typeof v !== "number" ? v
    : r.unit === "count" ? num(v) : r.unit === "pct" ? v + "%" : dollars(v);
  const cls = v => v === "reconciles" ? "exact" : v === "does not reconcile" ? "prelim" : "obs";
  document.getElementById(hostId).innerHTML =
    "<thead><tr><th>Check</th><th style='text-align:right'>Computed</th>" +
    "<th style='text-align:right'>Stated in source</th><th>Result</th></tr></thead><tbody>" +
    D.reconciliation.map(r => `<tr><td>${r.what}` +
      (r.detail ? `<div style="font-size:12px;color:var(--text-muted);margin-top:3px">${r.detail}</div>` : "") +
      `</td><td class="n">${fmt(r.computed, r)}</td><td class="n">${fmt(r.stated, r)}</td>` +
      `<td><span class="pill ${cls(r.verdict)}">${r.verdict}</span></td></tr>`).join("") +
    "</tbody>";
}
