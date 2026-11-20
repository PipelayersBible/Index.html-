# d5: nationwide chunks (federal PHMSA rule, CGA best practices, APWA colors, winter). Sources read 2026-11-20.
def load(S, U):
    E196 = 'https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-D/part-196'
    U('fed-phmsa-excavator-196-1', 'Federal rule for digging near pipelines: 49 CFR 196 excavator duties', 'Digging near pipelines: federal excavator rule',
      """The federal rule for excavators near gas and hazardous liquid pipelines is 49 CFR Part 196 (PHMSA). It sets the floor in every state; the state one-call law adds the numbers (days of notice, ticket life, tolerance zone).
Before and during digging (196.103) the excavator must: (a) use the one-call system before digging to tell operators when and where; (b) if there are pipelines in the area, wait for the operator to come and mark them before digging; (c) dig with proper regard for the marked location and take all practicable steps to prevent damage; (d) use one-call again as needed to get lines located and marked.
Damage (196.107): "If a pipeline is damaged in any way by excavation activity, the excavator must promptly report" it to the operator, even when there is no leak. A scraped coating counts.
Release (196.109): if the damage lets out regulated gas or hazardous liquid, promptly call 911.
"Excavation" here covers "both mechanized and non-mechanized equipment, including hand tools."
PHMSA enforces this rule itself only in states whose own enforcement it has found inadequate; otherwise the state enforces its law.""",
      '49 CFR 196.3, 196.101, 196.103, 196.107, 196.109 (eCFR, up to date as of Oct 22, 2026)', E196, ed='eCFR current as of October 22, 2026')
    U('fed-phmsa-excavator-196-2', 'Federal enforcement for pipeline damage by excavators: 49 CFR 196 Subpart C', 'Digging near pipelines: federal excavator rule',
      """Federal enforcement against excavators who damage pipelines is in 49 CFR Part 196, Subpart C. PHMSA uses its normal process (49 CFR Part 190): a notice of probable violation, 30 days to answer or ask for a hearing, a final order, and a chance to ask for reconsideration (196.203). It may assess a civil penalty (196.205); the maximum amounts are the ones Congress set in 49 U.S.C. 60122 (196.207). It can also ask the Attorney General to sue in federal court for an injunction, penalties and punitive damages (196.209), and criminal penalties are possible under 49 U.S.C. 60123 (196.211).
If an operator fails to answer a locate request or marks its pipeline wrong, PHMSA can enforce the operator's own damage prevention duties (196.111, pointing to 49 CFR 192.614 and 195.442).
For a crew this means: a pipeline hit with no ticket, digging before the marks, or not reporting the hit can be a federal case as well as a state one. Dollar amounts were not read here; they change each year with inflation.""",
      '49 CFR 196.111, 196.201 to 196.211 (eCFR, up to date as of Oct 22, 2026)', E196, ed='eCFR current as of October 22, 2026', conf='medium')
    U('std-cga-tolerance-zone-1', 'Common Ground Alliance best practice: tolerance zone and digging inside it', 'Digging near utilities: industry best practices',
      """The Common Ground Alliance (CGA) Best Practices are the industry's agreed good practice for damage prevention; several state laws point to them. They are not law. Where the state law is stricter, the state law wins.
Practice 5.19, Excavation Tolerance Zone: the excavator observes a zone made of the width of the facility plus 18 inches on either side of its outside edge, measured flat. CGA says this does not replace a state rule that sets a wider zone (many states use 24 inches).
Practice 5.20, Excavation within Tolerance Zone: inside the zone the excavator uses whatever reasonable care is needed to protect the lines. Methods to consider, depending on ground and weather: pot holing, hand digging when practical, soft digging, vacuum excavation, pneumatic hand tools, other mechanical methods with the owner's approval. Hand digging and non-invasive methods are not required for removing pavement.
Use the state's own number first; fall back on 18 inches plus the width of the line only where the state sets none.""",
      'CGA Best Practices, Practices 5.19 and 5.20 (bestpractices.commongroundalliance.com)', 'https://bestpractices.commongroundalliance.com/5-Excavation/519-Excavation-Tolerance-Zone', ed='CGA Best Practices online edition, read Nov 20, 2026 (version number not shown on the page)', lic='summary', conf='medium')
    U('std-apwa-color-code-1', 'Utility marking colors: what each paint and flag color means (APWA Uniform Color Code)', 'Locate marks: colors and what they mean',
      """Locate marks use the APWA Uniform Color Code (ANSI Z535.1 safety colors) across the country:
Red: electric power lines, cables, conduit and lighting cables.
Yellow: gas, oil, steam, petroleum or gaseous materials.
Orange: communication, alarm or signal lines, cables or conduit (phone, cable TV, fiber).
Blue: potable water.
Green: sewers and drain lines.
Purple: reclaimed water, irrigation and slurry lines.
White: proposed excavation (the excavator's own marks).
Pink: temporary survey markings.
APWA's guidance with the code: contact one-call before digging; mark your proposed dig in white; operators' marks should show the owner's name or initials and the width of the line when it is over 2 inches; inside the tolerance zone dig only with non-powered hand tools or non-invasive methods until the line is exposed. Where a state sets no zone, APWA recommends 18 inches from each side of the line plus its width.
Do not paint over, move or "freshen" a locator's marks yourself. If they fade, call 811 for a remark.""",
      'APWA Uniform Color Code (rev. 4/99), apwa.org', 'https://www.apwa.org/wp-content/uploads/Uniform-Color-Code-1.pdf', ed='APWA Uniform Color Code, revised April 1999', lic='summary')
    U('std-onecall-winter-snow-1', '811 in winter: snow, frozen ground and locate marks', 'Locate marks: winter, snow and bad weather',
      """Snow and frozen ground do not suspend the dig law anywhere: you still need a ticket, the wait, and marks you can see before a machine goes in.
White marks do not show on snow. Several one-call rules name another color for the excavator's pre-marks when snow is on the ground, and it is not the same everywhere: check your state's rule before you mark.
Marks buried by snow, plowed off or washed out are "no longer visible" under every law read: stop in that area and call 811 for a remark, and allow the normal re-mark time. Protect marks with stakes or flags next to the paint when snow is coming, and take photos of the marks the day they go down.
Operators may get more time to mark in bad weather under some state laws, but they have to say so before the deadline; check positive response instead of assuming.
Frozen ground is not a reason to skip potholing. Hand tools, air or hot-water vacuum still have to find the line inside the tolerance zone before the bucket or a frost ripper works there.
Examples from the laws and handbooks read on Nov 20, 2026: Illinois law and the Alaska handbook say black when snow is on the ground; the Dig Safe manual for New England recommends fluorescent pink; Georgia and South Carolina list ice and snow as extraordinary circumstances that let an operator post a later marking date; Louisiana extends the mark-by time for inclement weather.""",
      'State one-call laws and 811 center handbooks read Nov 20, 2026: 220 ILCS 50/10; AK handbook p. 3; Dig Safe manual p. 9; O.C.G.A. 25-9-3(17); SC811 manual p. 20; La. R.S. 40:1749.14(C)(3)', 'https://ilga.gov/legislation/ilcs/ilcs3.asp?ActID=1286', ed='Sources as read November 20, 2026', lic='summary', conf='medium')
