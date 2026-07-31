# Arkansas EFA — the published record: data downloads

Everything here was transcribed from the two annual reports the Arkansas
Office of Special Projects / DESE has published on the Education Freedom
Account program, plus the program's appropriation record. The state
publishes these as PDF tables only; this is the same content, machine-readable.

License: CC BY-NC 4.0. Suggested citation:

    Rush, Joel. Arkansas EFA — the published record. Sidetown Labs, 2026.
    https://arkansas-efa.sidetownlabs.com/.

Every file carries a `source_file` column naming the PDF each row came from,
so any cell can be traced back to the page it was printed on. Full method,
reconciliation checks and known anomalies: the site's Methodology page.

## Four things to read before using these files

1. **`efa-recipients-2024-25-spring.csv` is one semester, not one year.** The
   2024-25 report's Appendix B covers spring 2025 transactions only; the report
   states provider identities could not be reliably determined for autumn 2024.
   Its $43,185,261 is 51.1% of the same report's full-year all-student total of
   $84,506,226. Every row carries `period = spring_2025_only`. Do not sum it as
   an annual figure.

2. **The two retention tables describe different transitions.** The 2023-24
   report's Table 2 is 2023-24 → 2024-25. The 2024-25 report's Table 2 is
   2024-25 → 2025-26. They are stacked in one file with a `transition` column
   and must not be differenced against each other: they cover partly different
   school populations, and matching them requires a key that collapses distinct
   campuses. The 2024-25 → 2025-26 rows are the only school-level 2025-26 data
   in the published record.

3. **No persistent school identifier exists.** Schools appear by name only, the
   names change between reports, and names are not unique within a report once
   the disambiguating city is stripped. Any cross-year join has to be
   exact-normalized and has to report its miss rate. A school cannot be tracked
   reliably across two years of its own program.

4. **Two files give different Succeed Scholarship award figures, on purpose.**
   `efa-statewide-summary.csv` carries $7,617 and `efa-award-series.csv`
   carries $7,618 for the same 2024-25 quantity. This is a defect in the
   source, reproduced rather than patched, and the difference is the point:

   Former Succeed Scholarship participants receive 100% of the prior year's foundation funding under § 6-18-2505(a)(2). The 2024-25 annual report prints two different figures for this: $7,617 on p3 and $7,618 on p5. $7,618 is 100% of the 2023-24 foundation rate exactly, so p3 is a typo in the source. efa_state_summary.csv captured p3's figure; it is reported here as the source defect it is, not silently corrected.

   The statewide summary is a transcription and keeps what the report printed;
   the award series is computed from the foundation rate and is therefore the
   figure to use. Correcting the transcription would destroy the evidence that
   the source contradicts itself.

## Files

### `efa-recipients-2024-25-spring.csv`

1,971 rows. Every named recipient of EFA funds, 2024-25 SPRING SEMESTER ONLY (1,971 rows). 2024-25 annual report, Appendix B. Do not sum this as a full year -- see the README.

### `efa-retention-by-school.csv`

224 rows. Per-school retention from BOTH annual reports (224 rows). Two different transitions: 2023-24 to 2024-25 and 2024-25 to 2025-26. Filter on `transition` before comparing anything; filter on `row_type` before treating it as school-level.

### `efa-spending-by-category.csv`

42 rows. Expenditure by category and cohort -- all students, private-school students, homeschool students (42 rows). 2024-25 annual report, Tables 3, 4 and 5.

### `efa-assessment-by-school.csv`

128 rows. Average math and ELA percentile by school, 2024-25 (128 rows). 2024-25 annual report, Appendix C. Nulls are where the source prints N/A.

### `efa-assessment-by-instrument.csv`

17 rows. Average percentile and test completions by assessment instrument, 2024-25 (17 rows). 2024-25 annual report, Table 8.

### `efa-atlas-performance-levels.csv`

14 rows. ATLAS performance-level distributions, statewide and for the four schools that administered it (14 rows). 2024-25 annual report, Table 11 and Appendix D. Rows summing to 99 or 101 are the source's independent rounding -- not normalized.

### `efa-providers-2023-24.csv`

6 rows. The entire named-recipient universe published for 2023-24 -- six rows. 2023-24 annual report, Table 3.

### `efa-participation-by-school.csv`

223 rows. Participating schools with EFA enrollment, total enrollment and EFA share, 2023-24 and 2024-25 (223 rows). Table 1 of both annual reports.

### `efa-statewide-summary.csv`

53 rows. Every statewide headline figure published in either report (53 rows), including the 2025-26 outlook metrics, which are forward-looking rather than actuals.

### `efa-appropriations.csv`

12 rows. Appropriated and spent amounts by fiscal year, with the as-of date and source document for each -- including the two conflicting 2023-24 totals.

### `efa-obtained-2026-27.csv`

8 rows. The 2026-27 figures that come from the Arkansas Advocate rather than from a state publication, each with its source_kind and the badge this page gives it. Five are from application records released under freedom-of-information law (badged obtained); three are statements the Department made to the reporter (badged reported). The article's hedged 'nearly 57,000 applications' is deliberately not carried — see the site's methodology.

### `efa-coverage-matrix.csv`

26 rows. What the state publishes, by measure and year — the grid behind the coverage figure. Each cell is published, partial, obtained, conflict or absent. Probes dated in the absence register.

### `efa-absence-register.csv`

17 rows. The verified absence register: things the published record does not contain, each scoped to exactly what was searched, plus who obtained the data anyway where that is known. `evidence` is `searched` (someone looked — `checked` gives the date) or `documentary` (the report itself settles it — `citation` gives the reference).

### `efa-homeschool-series.csv`

29 rows. Home-schooled students in Arkansas by school year, 1997-98 to 2025-26 — the series behind the home-schooling chart. All home-schooled students, not only those with EFA accounts. DESE annual home school reports, as compiled in this project.

### `efa-award-series.csv`

4 rows. The per-account award by year, 2023-24 to 2026-27 — the series behind the 90%-rule chart. `allocated_usd` is the statutory 90% of the prior year's foundation rate (Ark. Code Ann. § 6-18-2505(a)(1)) and is computed, not transcribed; `net_to_family_usd` is what remains after the payment-platform fee withheld under § 6-18-2505(e)(2)(B), is not derivable, and carries its citation in `net_source`. Do not use the two interchangeably.


## Combined workbook

`arkansas-efa-published-record.xlsx` carries every table above as one sheet
each, with a Read Me sheet repeating the warnings above.
