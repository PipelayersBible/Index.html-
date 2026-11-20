# Website (pipelayersbible.com): what visitors want, audit, changes — Nov 20 2026

Nothing was pushed or deployed. The live site is unchanged (checked Nov 20: it still shows "one-tap emergency call"
and "AI for ... crew management").

- Clone: `/tmp/claude-0/website_work`, branch `website-nov20`, one commit `1071945` on top of `581f74b`.
- Patch for the lead: `website-nov20.patch` in this folder (`git am website-nov20.patch` on a clone at 581f74b).
  Same commit as a bundle: `website-nov20.bundle` (survives a restart of /tmp).
- The edits are also scripted, to re-run on a fresh clone: `tools/edit_site.py <clone>` then `tools/add_pages.py <clone>`
  (then the three small follow-ups listed under "Changes" 9-11, which are only in the patch).
- Tests: `tools/check_site.py <clone>` (static) and `tools/test_pages.js <port>` (browser). Both pass.

## 1. Who comes and what they want to know

How I researched: web search plus reading the pages that rank for the searches Tommy named. Reddit threads did not come
back from search in this session (site:reddit.com queries returned only trade and vendor pages), so there are **no
Reddit quotes here**; the questions below come from ranking pages, their FAQ blocks, and OSHA's own pages.

| Visitor | Top questions | Where it comes from |
|---|---|---|
| Pipelayer / new hand (searches "how to read a grade stake", "rod reading to invert", "pipe grade calculator") | What do C/F, station, offset (O/S), INV mean? How do I get from the stake to the invert? What do I do when a stake is unclear or knocked? Percent slope vs inches per foot vs total fall? | https://dozr.com/blog/how-to-read-grade-stakes (cut, fill, station, offset, slope stakes; feet in tenths vs twelfths) · https://buildrefs.pages.dev/methods/read-grade-stakes (C/F, offsets, "pipe invert stakes", "what if a stake is unclear, missing or disturbed") · slope calculators that rank: https://www.housecallpro.com/plumbing/templates-calculators/plumbing-pipe-drain-slope-calculator/ , https://opentextbc.ca/mathfortrades3/chapter/the-three-ways-grade-is-defined/ (percent, inches per foot, total fall) |
| Foreman | Will it work with no signal? Is it faster than writing the daily at night? Does it fill in for me? Can my guys use it without a hassle? | https://www.fieldwire.com/blog/construction-forms-daily-reports/ (reports "written between 5 and 8 PM, from memory"; apps fail below grade; double entry; crews want capture in the moment and offline) (vendor article) |
| Superintendent / PM / small owner | What does it cost, per user or flat? Free trial? Offline? PDF out? Who is behind it? How fast is set-up? | https://librecam.pages.dev/compare/best-daily-report-apps (vendor comparison; criteria: per-seat price, cost at crew size, free-plan limits, offline, PDF, photos; names Raken $23-59/user/mo, BusyBusy $9.99-14.99, Fieldwire $64) |
| Safety manager (searches "trench sloping chart", "confined space permit template") | At what depth is cave-in protection required? Shoring vs shielding? Who is the competent person? How often are trenches inspected? Can you slope instead of shore? What goes on a permit, who signs, how long is it kept? Does the app replace our program? Is it OSHA approved? | https://projul.com/blog/construction-excavation-trenching-safety-guide/ (its 5 FAQ questions are exactly the first five) · OSHA 1926.651 / 1926.652 / Subpart P App B · permit templates that rank: https://www.labor.nc.gov/osh/osh-example-programs/confined-space-entry-permit-construction-short-version , https://www.ehs.harvard.edu/resource/construction-confined-space-entry-permit-form |

What competitor/ranking pages answer that this site did not (before today): **price** (every comparison page leads with
it), **"at what depth..." trench rules** (the site had the slope calculator but not the 4 / 5 / 20 ft answer),
**percent vs inches per foot**, **how to get it on a phone**, **who is behind it** on the first screen.

## 2. Audit, page by page (15 pages read; phone 390 px and desktop 1280 px screenshots in `shots/before/`)

Already good (not changed): every page has a unique title, description, canonical, Open Graph, one h1, structured data
(Organization, SoftwareApplication, FAQPage, Article, WebApplication, BreadcrumbList); sitemap and robots are right; no
page scrolls sideways at 390 px; home page is about 258 KB with everything; no broken internal links or anchors.

Findings, most important first:

1. **Risky claims still live** (legal review lines 1-9), on the home page and repeated on three feature pages:
   "one-tap emergency call" (home; confined space page meta description x4), "AI for ... crew management" (home),
   "run progress live" (home, daily reports page, confined space caption), "Search and export every record" (home, daily
   page), "any later change would show" and "time-stamped at every point" (home, grade page), 811 warning with no state
   limit (home, daily page), "sets up your company the same day" (home). **Fixed.**
2. **No price answer anywhere.** The word "cost" or "price" did not appear on the site. **Fixed** with Tommy's line
   (pricing is being set before the beta ends), in the strip under the hero, the trial section and a new FAQ question.
3. **First screen did not say what the app does.** The hero said "a phone app built for underground pipe crews" and
   "works with no signal", but grade, permits and daily reports only appeared two screens down. Who built it was a full
   screen down. **Fixed** (hero line + a 5-item quick-answers strip directly under the hero).
4. **"How do I get it on my phone" was half answered** ("What phones does it work on?" said browser + home screen, not
   that it comes by invite, or the iPhone/Android steps). Nothing said the crew can join by text link without email
   (live since r17.05). **Fixed** with two FAQ questions.
5. **Missing page for the most-asked trench question** ("how deep before shoring"). **Built**: a new guide.
6. **No percent / inches-per-foot table** on the grade calculator, which is what the ranking slope calculators lead
   with. **Built.**
7. Small: two meta descriptions over 165 characters (grade calculator 179; confined space 166 before my change).
   **Fixed.** Home footer listed 2 of the 4 tools. **Fixed** (added rod reading and the new guide).
8. Not fixed, needs Tommy: **no postal address** on the site (legal review line 10), and the **Privacy Policy does not
   mention the trial form or GoatCounter** (that is in the legal agent's Privacy v1.2 draft, not this repo).

Tool and guide accuracy (every number rechecked):

| Page | Checked against | Result |
|---|---|---|
| Trench sloping | OSHA 1926 Subpart P App B, fetched Nov 20: Table B-1 "STABLE ROCK: VERTICAL (90º)", "TYPE A: 3/4:1 (53º)", "TYPE B: 1:1 (45º)", "TYPE C: 1 ½:1 (34º)"; note 2 short-term Type A 1/2H:1V (63º), 12 ft or less, open 24 hours or less; note 3 "greater than 20 feet deep shall be designed by a registered professional engineer"; distress "at least ½ horizontal to one vertical less steep". 1926.652(a)(1)(i)-(ii) (stable rock; less than 5 ft with no indication of cave-in). WAC 296-155-657 ("less than 4 feet"). Cal. Title 8 §341(d)(5)(A) ("5 feet or deeper into which any person is required to descend"). Browser test: 8 ft, Type B, 3 ft bottom = 19.00 ft; A = 15.00; C = 27.00; 19.9 ft gives a slope; 20 ft gives the engineer message and no slope. | Correct |
| Pipe sizes (rod reading, volume) | SDR 35 ODs 4.215 / 6.275 / 8.400 / 10.500 / 12.500 / 15.300 in (ASTM D3034), wall = OD/35; C900 DR18 ODs 4.80 / 6.90 / 9.05 / 11.10 / 13.20 in, wall = OD/18. These I checked from my own knowledge of the standards, not from a fetched copy (the standards are paywalled). | Match |
| Rod reading tool + guide | Worked by hand: HI 105.20 + 4.36 = 109.56; top of 8" SDR 35 is 8.16 in = 0.68 ft above invert; readings 13.53 / 12.85 / 13.55. | Correct |
| Grade calculator | 250 ft at 0.40% from 100.00 = 99.00 (browser test); 0.40% = 0.048 in/ft. | Correct |
| Volume | 100 ft of 8 in ID = 34.91 ft³ = 261 gal; 3x6x100 trench = 66.67 yd³; pipe zone 23.02; backfill 42.22. | Correct |
| Grade stake guide | 6.45 ft = 6'-5 3/8"; table rows. | Correct |
| Confined space guide | 16 items of 1926.1206(a)-(p); 1910.146(b) quotes; keep 1 year. Read against the legal review's own check of 1926.1206; I did not re-fetch the CFR text today. | Consistent |

Could not do: status-check the external links with curl (the sandbox proxy blocks it). I opened the OSHA 1926.651,
1926.652, App A, App B, osha.gov/competent-person, WAC and Title 8 §341 links by hand through web fetch; all load. The
app.pipelayersbible.com, ecfr.gov, law.cornell.edu and dir.ca.gov 1954/1955 links were not re-opened today.

## 3. Changes made (branch `website-nov20`)

Before / after screenshots: `shots/before/` and `shots/after/` (`home_phone_fold.png`, `home_desk_fold.png`,
`home_phone_full.png`; after only: `home_phone_quick.png`, `home_desk_quick.png`, `home_phone_faq_cost.png`,
`guides_trench-depth-rules_phone_full.png`, `trench_guide_phone_table.png`, `tools_pipe-grade-calculator_phone_full.png`).

1. **Legal review lines 1-9, home page** (wording taken from `legal_nov19/drafts/website_wording.md`):

   | Before | After |
   |---|---|
   | Calculates pipe grades from survey stake photos or manually entered survey data | Works out pipe grades from survey stake photos (read by AI, then checked by you) or from numbers you enter |
   | Confined space permits and entry log, with a one-tap emergency call | ...with an emergency button that opens the phone's dialer |
   | Sees his crew's run progress live | Sees his crew's run progress as their phones send it |
   | Warnings when an 811 ticket is nearly expired | ...nearly expired, in states where the ticket life is set by law |
   | A PDF of every run, time-stamped at every point | A PDF of every run, with the phone's time at every point |
   | A sealed original of each run PDF, so any later change would show | ...so a later change to that file would show |
   | Search and export every record | Search your records and export runs, daily reports and permits |
   | Built-in AI for civil work questions, crew management and your company's data | Built-in AI for civil work questions and for questions about your company's own numbers |
   | Thomas sets up your company the same day | Thomas sets up your company, usually the same day |

2. **Same claims on the feature pages**: confined space page (meta description x4, "A one-tap button" -> "A button",
   caption "show live" -> "as the phones send them"); grade page (PDF time and sealed-original sentence); daily reports
   page (export sentence, "shows live" -> "as their phones send it... A phone with no signal shows what it last sent",
   811 sentence now says it works where the ticket life is set by law and otherwise shows no date).
3. **Hero** now names what the app does: "...built for underground pipe crews: grade sheets, delay logs, confined space
   permits and daily reports. It works with no signal and..." (rest of Tommy's sentence kept). Note under the buttons
   adds "Built by an underground foreman." On phones the logo is smaller so the buttons and the note stay on the first
   screen.
4. **Quick answers strip** right under the hero: Who it's for · What it costs · Getting it · No signal · Who built it,
   each one or two lines, with links that open the matching question.
5. **Story**: "Thomas Fontaine is an underground foreman with 12 years in underground construction." ("contractor"
   appears nowhere on the site; the test bans "pipe contractor".)
6. **Trial section**: added "The app is in beta. Pricing is being set before the beta ends, and you'll know the price
   before anyone asks you to pay."
7. **FAQ 6 -> 11 questions**: new "What does it cost?", "How do I get it on my phone?" (replaces "What phones does it
   work on?"; invite, password, iPhone Share > Add to Home Screen, Android Install App: from r17.10), "Does my crew need
   email addresses?" (text join link, once, 24 hours: from onboard2 / r17.05), "Who is it for?", "Who's behind it?",
   "Is it OSHA approved?" (No; OSHA doesn't approve apps; built around 1926.1206 and Table B-1; state may be stricter;
   competent person decides). FAQ structured data is now rebuilt from the page's questions (a test checks they match).
   Organization data adds founder and contact point.
8. **New guide `/guides/trench-depth-rules/`** "Trench depth rules: 4, 5 and 20 feet": short answer, a depth table
   (inspections, 2 ft spoil, ladder at 4 ft within 25 ft, air test over 4 ft, under-5 exception, 5 ft protective
   system, 20 ft engineer) with the section for each row, "Does a trench under 5 feet need shoring?", what counts as a
   protective system, who the competent person is (OSHA's words), utilities/water/distress, state plans, quick checks.
   Sources fetched Nov 20: osha.gov 1926.651, 1926.652, Subpart P App A and App B, osha.gov/competent-person, WAC
   296-155-657, Cal. Title 8 §341. Opens with the same "your competent person decides" box as the tool page.
9. **Grade calculator**: new section "Slope in percent, inches per foot and fall per 100 feet" (0.20% to 2.08%, with
   1/8" and 1/4" per foot), computed, not typed. Meta description shortened.
10. Guides hub card, trench tool link to the new guide, home footer links, sitemap (new page; lastmod on changed pages).
11. Home: a link to `#q-cost` etc. opens that question (10 lines of script).

Tests run on the branch (one browser, port 9600): `check_site.py` OK on 15 pages (links, anchors, titles, descriptions,
canonicals, one h1, JSON-LD parses, sitemap = pages, banned words: one-tap emergency call, crew management, pipe
contractor, tamper-proof, OSHA-compliant, guarantee, em-dash). `test_pages.js` ALL PASS (trench and grade numbers, no
sideways scroll on 8 pages at 390 px, hero text and buttons above the fold, quick links open questions, FAQ data matches
the page, trial form still posts — to a fake endpoint; nothing was sent to the real server).

Not done: I did not write a separate pricing page (nothing to put on it yet), a Spanish page (Spanish is staged, not
live) or a confined space permit template download (see decision 4).

## 4. Needs Tommy (5)

1. **Publish this branch?** Recommend yes. It removes the two lines the legal review flagged hardest and answers price,
   phone and "who built it" on the first screen.
2. **The hero sentence was yours; I added eight words to it** ("grade sheets, delay logs, confined space permits and
   daily reports"). Recommend keeping the longer line: a visitor from a search has never heard the cold call.
3. **Price wording.** The site now says "Pricing is being set before the beta ends, and you'll know the price before
   anyone asks you to pay." Recommend swapping in the real number ($99 a month with 5 people is what billing is built
   on) the day it's decided: every competitor page leads with price.
4. **A free printable confined space permit (PDF)?** "Confined space permit template" is one of the strongest searches
   and the site only has a guide. Recommend yes, but only after the lawyer's review, since a template is the kind of
   thing a company will use as-is. Not built.
5. **Postal address in the footer** (legal review line 10; marketing emails need one). Recommend a registered mailbox,
   not a home address. I can't add it without the address.

## Not verified / limits
- No Reddit or forum threads were reachable through search here; visitor questions come from ranking pages and vendor
  articles (marked as vendor where they are).
- Pipe OD and wall tables checked from memory of ASTM D3034 / AWWA C900, not from a fetched copy.
- External links were checked by opening the OSHA and state pages I cite in new text; the older external links were not
  all re-opened.
- GoatCounter visit data was not available to me, so "who comes" is from search research, not from the site's own counts.

## DONE
