# Arkansas EFA — the published record: data downloads

Everything here was transcribed from the two annual reports the Arkansas
Office of Special Projects / DESE has published on the Education Freedom
Account programme, plus the programme's appropriation record. The state
publishes these as PDF tables only; this is the same content, machine-readable.

Licence: CC BY-NC 4.0. Suggested citation:

    Rush, Joel. Arkansas EFA — the published record. Sidetown Labs, 2026.
    https://arkansas-efa.sidetownlabs.com/.

Every file carries a `source_file` column naming the PDF each row came from,
so any cell can be traced back to the page it was printed on. Full method,
reconciliation checks and known anomalies: the site's Methodology page.

## Three things to read before using these files

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
   exact-normalised and has to report its miss rate. A school cannot be tracked
   reliably across two years of its own programme.

## Files

### `efa-recipients-2024-25-spring.csv`

1,971 rows. Every named recipient of EFA funds, 2024-25 SPRING SEMESTER ONLY (1,971 rows). 2024-25 annual report, Appendix B. Do not sum this as a full year -- see the README.

### `efa-retention-by-school.csv`

224 rows. Per-school retention from BOTH annual reports (224 rows). Two different transitions: 2023-24 to 2024-25 and 2024-25 to 2025-26. Filter on `transition` before comparing anything; filter on `row_type` before treating it as school-level.

### `efa-spending-by-category.csv`

42 rows. Expenditure by category and cohort -- all students, private-school students, homeschool students (42 rows). 2024-25 annual report, Tables 3, 4 and 5.

### `efa-assessment-by-school.csv`

128 rows. Average maths and ELA percentile by school, 2024-25 (128 rows). 2024-25 annual report, Appendix C. Nulls are where the source prints N/A.

### `efa-assessment-by-instrument.csv`

17 rows. Average percentile and test completions by assessment instrument, 2024-25 (17 rows). 2024-25 annual report, Table 8.

### `efa-atlas-performance-levels.csv`

14 rows. ATLAS performance-level distributions, statewide and for the four schools that administered it (14 rows). 2024-25 annual report, Table 11 and Appendix D. Rows summing to 99 or 101 are the source's independent rounding -- not normalised.

### `efa-providers-2023-24.csv`

6 rows. The entire named-recipient universe published for 2023-24 -- six rows. 2023-24 annual report, Table 3.

### `efa-participation-by-school.csv`

223 rows. Participating schools with EFA enrolment, total enrolment and EFA share, 2023-24 and 2024-25 (223 rows). Table 1 of both annual reports.

### `efa-statewide-summary.csv`

53 rows. Every statewide headline figure published in either report (53 rows), including the 2025-26 outlook metrics, which are forward-looking rather than actuals.

### `efa-appropriations.csv`

12 rows. Appropriated and spent amounts by fiscal year, with the as-of date and source document for each -- including the two conflicting 2023-24 totals.

### `efa-coverage-matrix.csv`

26 rows. What the state publishes, by measure and year — the grid behind the coverage figure. Each cell is published, partial, obtained, conflict or absent. Probes dated in the absence register.

### `efa-absence-register.csv`

17 rows. The verified absence register: things the published record does not contain, each scoped to exactly what was searched and dated to when, plus who obtained the data anyway where that is known.


## Combined workbook

`arkansas-efa-published-record.xlsx` carries every table above as one sheet
each, with a Read Me sheet repeating the three warnings.
