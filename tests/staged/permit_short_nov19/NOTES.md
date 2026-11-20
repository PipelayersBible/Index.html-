# Permit shortener (Nov 19) — WORK IN PROGRESS (resumed after a machine restart)

Status: sources being read, baseline being measured. Nothing built yet. See below as it fills in.
Sources confirmed so far: 29 CFR 1926.1206(a)-(p) https://www.law.cornell.edu/cfr/text/29/1926.1206 ;
1910.146(f)(1)-(15), (e)(3) https://www.law.cornell.edu/cfr/text/29/1910.146 ; 8 CCR 5157(f)(1)-(15), (e)(3), (c)(5)(B)3
"calibrated direct-reading instrument" https://www.dir.ca.gov/title8/5157.html

## Progress log (in case of another restart)
- Nov 19 late: baseline measured with tests/m_measure.js: 42 boxes, 875 words, 8305 px (9.8 screens at 390x844).
- patches/01_new_form.html written (the shortened form markup, all old ids kept; new ids cpMeter, cpMeterCal, cpPosted).
  Patch script 01 (swap the form block + JS) NOT written yet.
- NEW DIRECTION from Tommy via the lead: nationwide. Requirement list = federal (1926 Subpart AA, 1910.146) + every
  state-plan state that adds permit items; permit carries the union for the job's state (reuse the
  tests/r1706 state_rules.json pattern); unknown state = federal + cheap common additions. Cite each state difference.
- Federal/CA facts confirmed so far: 1926.1206 and 8 CCR 1955 have 16 items (incl. ventilation-failure detection);
  1910.146(f) and 8 CCR 5157(f) have 15 (no ventilation item). Meter is under "testing equipment" (n)/(13)/(14);
  a calibration date is not a listed permit item in any of the four. Portal posting: 1926.1205(c), 1910.146(e)(3),
  8 CCR 1954(c), 5157(e)(3). "calibrated direct-reading instrument": 8 CCR 5157(c)(5)(B)3.
