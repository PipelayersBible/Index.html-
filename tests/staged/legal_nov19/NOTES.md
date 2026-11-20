# Legal research, Nov 19, 2026 (on r17.10)

Researcher's notes to prepare questions and drafts for Tommy's lawyer. **Not legal advice; I am not a lawyer.**
Nothing was applied, deployed, committed, pushed or sent. `_src/index.html` was not edited. Server: not touched.

## What is in this folder

| File | What |
|---|---|
| `NOTES.md` | This file: findings ranked by risk, sources, questions for the lawyer |
| `drafts/terms_v1.2_changes.md` | Clause-by-clause text for Terms v1.2, on top of the v1.1 draft |
| `drafts/privacy_v1.2_changes.md` | Same for the Privacy Policy |
| `drafts/order_form_draft.md` | One-page order form (the billing screen refers to one; none existed) |
| `drafts/employee_notice_template.md` | A notice a customer company can give its crew, with state add-ons |
| `drafts/website_wording.md` | 10 line changes for pipelayersbible.com |
| `patches/01_safety_and_hours_wording.py` | Built: trench and crew-hours wording (words only) |
| `patches/02_terms_in_short.py` | Built: the "In short" Terms line on the join and Set Password screens |
| `tests/t_legal_wording.js` | Test for both patches |

## What I read first (prior work, not repeated here)

- Legal Review Drafts 01–06 and the r16.77–r16.83 notes (repo copies in `.legal/`).
- Terms / Privacy v1.1 drafts and NOTES (`/tmp/claude-0/legal11/`, same files as the Project's `claude/Legal_v1.1_Drafts/`).
- Live `terms.html` / `privacy.html` (still v1.0, effective Nov 17, 2026).
- Release notes r17.06–r17.10, `tests/staged/onboard2/NOTES.md` (join links, Terms by tick), `tests/r1706/staterules/NOTES.md`, `tests/staged/billing0/NOTES.md`, `tests/website/NOTES.md`.
- The website at `/tmp/claude-0/website` (commit 581f74b, Nov 19).
- I have no Projects tool, so I read the repo and temp copies of the Project docs, not the Project itself.

**One correction to the task list:** the app has no clock in / clock out. What it has that touches time: the Break
button, time-per-pipe, laid times, the run "clock" (phone vs server offset), and, new in r17.06, per-person **hours on
the signed daily report** and a **"Crew hours for payroll"** spreadsheet. Item 1 below is about those.

---

## Findings, ranked

### HIGH

**1. "Crew hours for payroll" contradicts the Terms, and daily totals are not a California time record.**
- What the app does: the office job page has Spreadsheets › **Crew hours for payroll**, "Each person's hours from the signed daily reports" (`_src/index.html` 67801, 67809–67843). The hours start at a default: 8 h, or first start to last stop when longer, and a Break is not taken off (`tests/r1706/RELEASE_NOTES.md` #44, #45; app line 61146).
- What the Terms say: v1.0 has nothing on it; v1.1 §3.8 says times "are not a payroll, timekeeping or meal-and-rest-period record".
- The law: California Wage Order 16 §6 requires records of "when employees begin and end each work period", meal periods and total daily hours; CalChamber's answer to "can we keep only total daily hours?" is "No. Employers must keep in-and-out time records for all nonexempt employees." Labor Code §1174(d) requires payroll records "showing the hours worked daily", kept "not less than three years".
  - https://p-hrcalifornia.calchamber.com/hr-library/qa/company-construction-procedure-time-records-total-daily-hours-worked-time-records-practice-comply
  - https://california.public.law/codes/labor_code_section_1174
- Why it matters to a company: an office that pays from this spreadsheet has no start/stop or meal record behind it, and a pre-filled 8 h that a foreman accepts is exactly what a wage claim attacks. The signed daily report can also be used against the company's own payroll if the two differ.
- **Built (patch 01):** the sheet and its "done" note now say "These are daily totals, not start, stop or meal times. Check them against your time records before you run payroll." The name is unchanged (Tommy's call, decision 1).
- **Draft:** Terms §3.8 rewritten (`drafts/terms_v1.2_changes.md`).

**2. California sales tax on software subscriptions starts January 1, 2027 (six weeks away).**
- The v1.1 notes marked this "could not verify". It is now confirmed by several firm write-ups of SB 122: "Beginning on January 1, 2027, California will apply sales and use tax" to prewritten software "including SaaS, regardless of delivery method"; sales are sourced to the purchaser's address in the seller's records.
  - https://ktslaw.com/blog/kilpatricks-state-and-local-tax-blog/2026/7/california-expands-sales-and-use-tax-to-saas-and-electronically-delivered-software
  - https://www.hklaw.com/en/insights/publications/2026/09/coming-attractions-california-previews-rules-saas-digital-products-tax (found, not read)
- I did not read the bill text or CDTFA's rules, and the write-up I read does not cover rate, registration or contracts that straddle Jan 1.
- Action: a CPA question now, before the first paid invoice. The billing form already holds a tax state. Draft Terms §7.7 and the order form carry a tax line.

**3. Accounts with no email break the notice and opt-out mechanics in the Terms and Privacy Policy.**
- Since r17.05 most crew join by text link and have no email (`tests/staged/onboard2/NOTES.md`, decision #9: hidden address "never mailed").
- v1.1 still says: dispute notices go "to your account email" (§14.1); arbitration opt-out needs "your account email" (§14.8); Terms changes are announced "in the app and by email" (§17); notices go "to your account email" (§19.2); privacy requests come "from your account's email address" (Privacy §8). Privacy §2 does not describe a link account. None of these work for a link account.
- Why it matters: the opt-out and notice promises are the parts a court looks at first when deciding whether the arbitration clause and later Terms changes bind a worker.
- **Draft:** replacement sentences for §§1.1, 2.2, 14.1, 14.8, 17, 19.2 and Privacy §§2, 7, 8.

**4. The two newest "I agree" screens dropped the short warning about liability and arbitration; the login line sits under the button.**
- The Terms sheet says "In short: … our liability is limited; disputes go to individual arbitration (you can opt out within 30 days)" (`_src/index.html` 65235). The join screen (65467) and the Set Password screen (4798), where nearly every new person now agrees, show only the tick and the two links.
- The tick itself is the strong form of consent (a checkbox next to linked terms, button off until ticked, recorded on the server). The gap is the missing plain notice of the two terms that take rights away.
- The Log In screen's "By logging in you agree to the Terms…" is **below** the Log In button (4773). In *Chabolla v. ClassPass* (9th Cir. Feb 27, 2025) a notice under the buttons was "outside of the user's natural flow" and the arbitration clause was not enforced; the court wants the notice above the button and worded to match it. That line is only the fallback when the server can't be reached (v1.1 §1.1 bracket), but it is the weakest link.
  - https://www.fenwick.com/insights/publications/thats-a-wrap-ninth-circuit-signals-tougher-standards-for-enforceability-of-online-agreements
- **Built (patch 02):** the same "In short" sentence under the tick on both screens. No new tap.
- **Proposed, not built:** move the login line above the button and word it "By tapping Log In you agree to…" (it changes several screenshots).

### MEDIUM

**5. Trench Sloping: two phrases read as the app deciding compliance.**
- The caution heading on Trench Sloping and on the Trenching lesson says "**Tabulated data**, not a substitute for a competent person" (8553, 6472). In the excavation rule "tabulated data" is a defined option: written data approved by a registered professional engineer, with a copy at the jobsite "which identifies the registered professional engineer who approved the data" (29 CFR 1926.652(b)(3); 8 CCR 1541.1(b)(3)). Table B-1 is a different option (Appendices A and B). The app's own toolbox talk says tabulated data "counts only if a registered PE approved it" (5629).
  - https://dir.ca.gov/Title8/1541_1.html
- The Type A result says "Maximum allowed — **no shoring or shielding required** below this height" (33588). That is a finding about the trench, not arithmetic.
- **Built (patch 01):** "OSHA's table, not a substitute for a competent person"; and "OSHA's maximum for an unsupported vertical lower portion in Type A soil (App. B, Fig. B-1.1). Your competent person decides if it applies here". Numbers unchanged (tested).
- Already right, no change: "Engineer Required" at 20 ft and deeper with OSHA's sentence quoted; "Soil type must be classified per Appendix A by a competent person — don't guess"; the competent-person wording matches the rule ("capable of identifying existing and predictable hazards… and who has authorization to take prompt corrective measures", 29 CFR 1926.32(f), https://www.law.cornell.edu/cfr/text/29/1926.32).
- Still open for the lawyer (report 04, R8): whether showing "Required Top Width" for a user's trench is engineering practice in California. **Draft:** Terms §3.5 addition.

**6. New California law on automated decisions about workers (SB 947), and the website's "AI for … crew management".**
- SB 947, the "No Robo Bosses Act", signed Sept 30, 2026, operative **July 1, 2027**: a person must corroborate discipline or dismissal that "primarily relies" on an automated decision system; written notice afterwards; the worker can ask what data was used; $500 per violation. The definition is wide: "any computational process derived from machine learning, statistical modeling, data analytics, or artificial intelligence" that "issues simplified output, including a score, classification, or recommendation".
  - https://www.akingump.com/print/v2/content/1136632/california-enacts-limits-on-automated-decision-systems-in-employment-discipline-sb-947.pdf
  - https://www.fisherphillips.com/en/insights/insights/californias-new-workplace-laws-put-ai-and-employee-monitoring-in-the-spotlight
- Already in force (Oct 1, 2025): the Civil Rights Council's automated-decision rules: employers keep related records four years, and the rules "contemplate liability for an AI vendor when an employer delegates" a decision function. https://www.paulhastings.com/insights/client-alerts/new-california-regulations-on-employers-use-of-ai-to-make-decisions-go-into-effect-oct-1-2025
- The duty is the employer's. The app's exposure is the wording: time-per-pipe, production by person, office AI "analysis of your company's numbers" (18211), and the website line "Built-in AI for civil work questions, **crew management** and your company's data".
- Already there: Terms §10 forbids using the Service "as the only basis for a decision to discipline, demote or dismiss a worker".
- **Draft:** Terms §8.8 rewritten; website line 5; employee notice template. I read firm summaries, not the statute.

**7. Billing is built now; the documents still say it isn't, and there is no order form.**
- The owner's billing screen says "Use this after the company signs the order form. You send the invoices from Stripe" (39952); read-only for late payment is automatic (`tests/staged/billing0/NOTES.md`); "The company login is free".
- v1.1 §7.2 / §7.9 say invoices are by hand, Stripe comes later and read-only is not built; Privacy says Stripe is used only "once we start taking them".
- California's automatic renewal law protects a "consumer", defined as an individual buying "for personal, family, or household purposes" (Bus. & Prof. Code §17601), so it does not reach a company plan; it would reach an individual plan. https://california.public.law/codes/business_and_professions_code_section_17601
- **Draft:** §§7.1, 7.2, 7.9; Privacy Payment and Stripe rows; `drafts/order_form_draft.md` (it also puts the company's acceptance on a signature, which answers the v1.1 question about a superintendent opening the account).

**8. Customers over the CCPA size are not covered by a service-provider contract.**
- The app's own seller is far below the threshold ($26,625,000 revenue since Jan 1, 2025; https://www.cppa.ca.gov/regulations/cpi_adjustment.html). A mid-size pipeline contractor is not, and then its employees' data in the app is covered and the vendor must be under a written service-provider contract.
- The DPA is still an outline (v1.1 Privacy §1 bracket). **Draft:** a short service-provider clause inside the Terms (§8.11) so every company is covered without a separate signature.
- Other states' privacy laws: not triggered at this size (prior report 01 §4.21); most exempt employee and business-contact data. Not re-researched state by state.

**9. Confined space: two duties a phone permit does not meet by itself.**
- "The completed permit must be made available at the time of entry to all authorized entrants… by posting it at the entry portal or by any other equally effective means" (29 CFR 1926.1205(c); same words in 8 CCR 1954(c)). https://www.law.cornell.edu/cfr/text/29/1926.1205 · https://dir.ca.gov/Title8/1954.html
- "The entry employer must retain each canceled entry permit for at least 1 year" (1926.1205(f); 8 CCR 1954(f)). OSHA's Nov 3, 2023 letter says permit air readings follow that one year, not the 30-year exposure-record rule, unless the monitoring was done under a substance-specific standard. https://www.osha.gov/laws-regs/standardinterpretations/2023-11-03
- The permit form itself tracks the rule's list (1926.1206(a)–(p)); "Built around the permit items in federal OSHA 29 CFR 1926.1206" and the website's "a place for each item OSHA lists" hold up against that list. https://www.law.cornell.edu/cfr/text/29/1926.1206
- **Draft:** one sentence in Terms §4.2. A possible in-app line on the active permit ("Show this permit to each entrant before they go in"): proposed, not built (confined space screens are off-limits for wording-only patches without Tommy).
- Website: "one-tap emergency call" on the home page (line 1 in `drafts/website_wording.md`).

**10. Customer signature on extra work (r17.06).**
- The sheet is sound: it shows what is signed, says "By signing, you confirm this extra work was done as described above", takes a drawn signature and typed name, and fingerprints the entry (62014–62059).
- An electronic signature "may not be denied legal effect or enforceability solely because it is in electronic form" (Civ. Code §1633.7). https://california.public.law/codes/civil_code_section_1633.7
- A drawn signature is not biometric data even under the strictest law: "Biometric identifiers do not include writing samples, written signatures, photographs" (740 ILCS 14/10). https://lig.ilga.gov/legislation/ilcs/documents/074000140K10.htm
- Gaps: the signer is an outsider whose name, title and signature are not in the Privacy Policy; nothing proves the signer's authority; the signer gets no copy unless the foreman sends the Ticket PDF; it confirms work done, not price.
- **Draft:** Terms §8.10, Privacy rows. Don't market it as an "approved change order".

### LOW

**11. Text messages (join links, emergency texts): no TCPA or carrier-registration issue as built.**
- The app only opens the phone's own Messages app with the text filled in (`sms:?&body=…`, 65629; emergency texts 32860–32870); the person picks the recipient and presses Send. No server sends texts, and the app never collects the recipient's number.
- The FCC's 2015 order: an app maker "does not make or initiate" a text when the user chooses to send it through affirmative steps (TextMe, ¶¶36–37), unlike an app that sends invitations itself (Glide, ¶35). https://www.arnoldporter.com/en/perspectives/advisories/2015/07/fcc-clarifies-rules-on-unwanted-robocalls-and-sp__
- Keep it that way: any future server-sent text (a "text-message sign-in" was decision #10, not built) brings consent rules and carrier registration with it.

**12. Email through Resend: invites and password resets are fine; anything promotional needs an address and an opt-out.**
- The FTC treats mail that "facilitates, completes, or confirms a commercial transaction", gives account or security information, or "provides information about an employment relationship" as transactional: only the no-false-headers rule applies. Commercial mail has "no exception for business-to-business email" and "must include your valid physical postal address" (a registered P.O. box or private mailbox counts).
  - https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business
- Gap: no postal address anywhere (Terms, Privacy, website, emails). Trial follow-ups, the beta-end summary pitch and any newsletter are commercial. **Draft:** address in Terms §19.8 / Privacy §12 and the website footer.

**13. Small mismatches to fix on the next version.**
- Privacy says "The app has no… analytics trackers" (true for the app); the website uses GoatCounter and has a trial form, and the Policy covers the website but mentions neither. **Draft:** Privacy rows.
- The crew notice says location is used "only while Run Setup or Run Results is open, to stamp photos" (65376); the Privacy Policy also lists weather and the emergency button. The notice also doesn't mention the hours a foreman signs for each person. Changing it means a new notice version and a re-accept, so: next time the notice changes anyway.
- Breach notice: California now sets 30 calendar days for notice to residents, and a company holding someone else's data must tell the owner "immediately following discovery" (Civ. Code §1798.82(a), (b)). https://california.public.law/codes/ca_civ_code_section_1798.82 **Draft:** Privacy §7, Terms §8.11(g).
- Clear sent photos: only the phone's copy goes, only after a tap, only when the company has it; the company's copy and the 4-year locked copy stay. The one risk is a crew clearing phones during a dispute. **Draft:** Terms §8.9 sentence.
- Sign-in codes and join links work like passwords. **Draft:** Terms §2.2.
- Workplace-monitoring notice laws (New York, Connecticut's new Public Act 26-73 from Oct 1, 2026, Delaware) put the duty on the employer and are aimed at phone, email and internet monitoring or monitoring "on an employer's premises"; the app alone probably doesn't trigger them, but a customer's lawyer may want the notice anyway. California: reimburse "a reasonable percentage" of a worker's phone bill when the phone is required for work (*Cochran v. Schwan's*). **Draft:** `drafts/employee_notice_template.md`.
- Children: nothing new; the Service is for adults at work.

---

## Built vs proposed

**Built (words only, tested, not applied):** apply to a copy of `_src/index.html` in this order:
`python3 patches/01_safety_and_hours_wording.py in.html a.html && python3 patches/02_terms_in_short.py a.html out.html`

| Test | Result |
|---|---|
| `tests/t_legal_wording.js` on the patched copy | 20 of 20 pass |
| Same test on unpatched r17.10 | 10 fail (as it should) |
| `tests/t131_trench20.js` on the patched copy | pass |
| `tests/r1710/streamline/tests/t_sl1_setpw.js` on the patched copy | 33 pass, 0 fail |
| Full regression, `t130_onboard`, `t_o3_34_36_office` | not run (shared box). Goldens that capture the trench caution heading, the Type A result line, the Set Password screen or the join screen text will need updating |

**Proposed only:** everything in `drafts/`; moving the login line above the button; a "show this permit to each entrant" line; renaming the hours spreadsheet.

## Questions for the lawyer (short list)

1. **Hours.** Is a foreman-signed daily total, pre-filled at 8 h or first-start-to-last-stop with breaks not deducted, a wage-and-hour risk for customers in California, and does the vendor share it by calling the export "for payroll"?
2. **No-email accounts.** Is an in-app notice enough for Terms changes and pre-dispute notices to a person with no email, and should the arbitration opt-out be possible inside the app?
3. **Acceptance.** With the tick, the links and the "In short" line on all three screens, is anything else needed? Is the login-screen line worth keeping as a fallback once it is moved above the button?
4. **Trench Sloping.** With the new wording, does showing a top width for a user's depth and soil type stay on the "arithmetic on a published table" side of California's engineering-practice rules?
5. **SB 947 and the automated-decision rules.** Does anything in the app (time-per-pipe, production by person, AI summaries of company numbers) count as an "automated decision system", and does the vendor have duties of its own?
6. **Service-provider clause.** Is the short clause in Terms §8.11 enough for customers over the CCPA size, or is a separate signed addendum needed?
7. **Order form.** Does a signed one-page order form that incorporates the Terms bind the company to the liability cap, the indemnity and arbitration?
8. **Customer signature.** Anything to add to the signing sentence, and should the signer get a copy automatically?
9. **Sales tax (CPA).** Registration, rate and timing for subscriptions from January 1, 2027.

## Limits of this review

- Statute quotes come from the linked pages. For SB 947, SB 122, Connecticut PA 26-73 and the Civil Rights Council rules I read law-firm summaries, not the enacted text.
- Delaware's notice law was not read. Other states' privacy laws were not re-checked one by one.
- I did not read the Ask knowledge base entries or test Ask's answers on safety rules; the Ask findings rest on the app's own labels and the Terms.
- Stored memory: only Tommy's name and role were used; nothing in memory tried to direct this work.

## DONE
