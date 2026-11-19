# SEO work on pipelayersbible.com (Nov 19, 2026)

Committed to `/tmp/claude-0/website` (branch main). **Not pushed.**

## What was added

**Home page (index.html).** Visible copy unchanged (test_site.js still checks it word for word: 56/56 pass).
- Title: `Pipe Grade, Cut Sheet & Daily Report App | The Pipelayer's Bible` (og/twitter titles match).
- Description: `App for underground pipe crews: grade from stakes and cut sheets, daily reports, confined space permits. Works with no signal. Free 30-day trial.`
- JSON-LD (one `@graph`): Organization (name, url, logo, telephone, email, no legal entity), WebSite, SoftwareApplication (BusinessApplication, "iOS, Android (web app)", Offer price 0 = free 30-day trial, no ongoing price), FAQPage generated from the visible FAQ text (the test checks they match word for word).
- Header nav (Home, Free tools, Guides, Start a free trial). On a phone it's a second row under the logo and Call button; on desktop it sits between them. No JS. Hero untouched.
- Footer: links to the tools, guides and use-case pages.

**New pages** (all have their own title, description, canonical with a trailing slash, Open Graph and Twitter tags with the share image, breadcrumbs, JSON-LD, GoatCounter, the CTA to `/#start`, related links):
- `/tools/` index, plus 4 tools (WebApplication + BreadcrumbList):
  - `/tools/pipe-grade-calculator/`: elevations along a straight grade every N ft (slope % or total drop, falls or rises, optional start station), and slope from two inverts. Uses the app's own `fmt` (half away from zero, 2 decimals), `toArch` (ft-in to 1/16"), station text (`pbCutsheetStaText`) and the app's interval-station logic.
  - `/tools/rod-reading-to-invert/`: HI = BM + BS, elevation = HI - FS, invert with the rod on the invert, on top of the pipe or under it (BOP), and the reading to lay to. Pipe ODs from the app's `PB_OD_SDR35` (SDR 35 4" to 15") and `PB_OD_DI` (C900 DR18 4" to 12"), walls from the app's `PB_PIPE_INDEX`, top = OD - wall like the app's `pbInvToTopFt`. 3 decimals, like the app's Rod Reading converter.
  - `/tools/trench-sloping/`: Table B-1 slopes, lay-back per side and top width for all four soil types; 20 ft or deeper shows only the engineer message.
  - `/tools/pipe-volume-weight/`: gallons/ft3 in a pipe (ID), and trench, pipe-zone and backfill cubic yards less the pipe (OD). Formulas shown. (The URL says "weight" as asked; the page covers volume, not pipe weight.)
- `/guides/` index plus 3 guides (Article JSON-LD, author Thomas Fontaine, publisher The Pipelayer's Bible): how to read a grade stake (about 760 words), rod reading to invert step by step (about 720), what goes on a confined space permit (about 820). No first-person stories.
- Use-case pages (WebPage + BreadcrumbList, 300 to 600 words, screenshots from /img): `/grade-and-cut-sheet-app/`, `/daily-reports-for-underground-crews/`, `/confined-space-permit-app/` (says it records what the crew enters and doesn't replace the safety program, air monitor, training or competent person). Every feature named was checked against the app source or the approved role-column wording.
- `404.html`: same header nav and footer, plus links to tools and guides; still noindex, still "Off grade".
- `sitemap.xml`: all 13 indexable URLs, lastmod 2026-11-19. `robots.txt`: Allow all + Sitemap line.
- `css/site.css`: shared styles for every page except the home page, which keeps its inline CSS so it still loads in one request.

**How the pages are made.** `/tmp/claude-0/site/tools/seo/build.py` (with `common.py`, `tools_pages.py`, `content_pages.py`) writes the plain HTML into the repo. The site still has no build step. To change a shared header/footer, edit the generator and run `python3 /tmp/claude-0/site/tools/seo/build.py`; it is safe to re-run (the index.html edits replace themselves). The generator is not in the website repo.

## Sources for every regulatory number

| Number on the site | Source |
|---|---|
| Stable rock vertical (90 deg), Type A 3/4:1 (53 deg), Type B 1:1 (45 deg), Type C 1 1/2:1 (34 deg), "for excavations less than 20 feet deep", angles rounded | 29 CFR 1926 Subpart P, App. B, Table B-1 and notes 1 and 3: https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926SubpartPAppB |
| "Sloping or benching for excavations greater than 20 feet deep shall be designed by a registered professional engineer" | Same, Table B-1 note 3 |
| Type A short-term 1/2:1 (63 deg) only for simple slope excavations 12 ft or less deep, open 24 hours or less; deeper than 12 ft stays 3/4:1 | Same, note 2 and B-1.1 exception |
| Cut back at least 1/2H:1V flatter on signs of distress; competent person decides for surcharge loads | Same, (c)(3)(ii) and (iii) |
| No protective system needed in stable rock, or under 5 ft when a competent person finds no indication of a potential cave-in | 29 CFR 1926.652(a)(1): https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.652 |
| Washington: 4 ft | WAC 296-155-657(1)(a)(ii): https://lawfilesext.leg.wa.gov/Law/WAC/WAC%20296%20%20TITLE/WAC%20296%20-155%20%20CHAPTER/WAC%20296%20-155%20-657.htm |
| California: Cal/OSHA permit when a worker must enter an excavation 5 ft deep or more | Title 8 section 341; Cal/OSHA fact sheet https://dir.ca.gov/dosh/dosh_publications/Construction-Activity-Permits-Employers.pdf |
| 16 permit items (construction) | 29 CFR 1926.1206 (a) to (p): https://www.osha.gov/laws-regs/regulations/standardnumber/1926/1926.1206 |
| 15 permit items (general industry), same list minus ventilation-failure detection | 29 CFR 1910.146(f): https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146 |
| Supervisor signs before entry; permit available at entry; duration; cancel; note problems; keep canceled permits at least 1 year | 1926.1205(b) to (f): https://www.law.cornell.edu/cfr/text/29/1926.1205 ; 1910.146(e)(3) to (e)(6) |
| O2 below 19.5% or above 23.5%; flammable over 10% of LFL | 1910.146(b), definition of hazardous atmosphere |
| Test oxygen, then combustibles, then toxics | 1910.146 Appendix B (from knowledge, not re-fetched today) |
| Cal/OSHA Confined Spaces in Construction, Article 37 sections 1950 to 1962; entry permit section 1955; permitting process and 1-year retention section 1954 | https://dir.ca.gov/Title8/1955.html , https://dir.ca.gov/Title8/1954.html , Cal/OSHA fact sheet https://www.dir.ca.gov/dosh/dosh_publications/Confined-Spaces-Construction-for-Employers-fs.pdf |
| 7.48052 gal per ft3 (231 in3 per US gallon) | Arithmetic (1728 / 231); same constant as the app |
| SDR 35 and C900 ODs and walls | The app's tables (ASTM D3034 for SDR 35, AWWA C151 ductile iron ODs for C900, per the app's comments); wall = OD / DR |

Links to eCFR Subpart AA (https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926/subpart-AA) follow eCFR's standard pattern but were not fetched.

## Test results

- `node /tmp/claude-0/site/tools/test_tools_math.js`: **26 passed, 0 failed**. Hand-worked cases for every tool, plus cross-checks against the app's own functions pulled from the app source: `fmt`, `toArch` and station text match on 20,000 values; ODs match `pbPipeOdIn`, walls match `PB_PIPE_INDEX`, slopes match `TRENCH_SLOPES`, 7.48052 matches.
- `NODE_PATH=/opt/npm-tools/node_modules node /tmp/claude-0/site/tools/test_seo_pages.js` (serve `/tmp/claude-0/website` on port 8863): **630 passed, 0 failed**. All 14 pages at 390 px and 1280 px: nothing off the side, no console errors or failed requests, unique titles and descriptions, one h1, JSON-LD parses with the right types, FAQ JSON-LD matches the visible FAQ, CTA to /#start, GoatCounter, canonical/OG, nav (4 links, 44 px tall, on screen), labels and alt text, no em-dash, none of the banned claims, no "contractor", no pricing in visible text, word counts, the tools give the expected answers for sample inputs, every internal link answers 200, sitemap/robots, every page linked from another page. Screenshots in `/tmp/claude-0/site/shots/seo/`.
- `node /tmp/claude-0/site/tools/test_site.js` (home page): **56 passed, 0 failed** (live edge-function part skipped, mock database not running, same as before).

## What Thomas has to do

1. Review, then push (`git push` in the website repo). GitHub Pages publishes it.
2. **Google Search Console**: add the domain property `pipelayersbible.com` (DNS TXT record at Porkbun), submit `https://pipelayersbible.com/sitemap.xml`, then use URL Inspection on the home page and the 3 use-case pages to ask for indexing. Check the Enhancements tab for FAQ and Breadcrumb results a week later.
3. **Bing Webmaster Tools**: sign in and import the site from Search Console (one click), so Bing and DuckDuckGo get the sitemap too.
4. **Google Business Profile**: only if you want to show up on maps for your area. It needs an address or a service area; skip it if you don't want an address public.
5. **Listings worth doing** (free, real links): Capterra / GetApp / Software Advice (one Gartner listing), G2, and SaaSHub or AlternativeTo. Use the same name, phone and email as the site. Don't post reviews yourself; ask beta companies once they've used it.
6. Test the rich results once it's live: https://search.google.com/test/rich-results on the home page and one guide.

## Decisions (with my recommendation)

1. **Trench page at exactly 20 ft.** The brief said 20 ft or deeper gets only the engineer message, so the site gives no slope at 20 ft. The app (your earlier decision) still gives a slope at exactly 20 ft with a warning. Table B-1 covers "less than 20 feet" and note 3 says "greater than 20 feet", so exactly 20 is a gap in OSHA's wording. **Recommend:** keep the site as is (no slope at 20) and consider matching the app to it, since your rule is "as safe as possible".
2. **Short-term Type A 1/2:1** is described in words on the trench page but isn't a choice in the calculator (the app has it as a choice). **Recommend:** leave it out of the site calculator; it's easy to misuse without the 12 ft / 24 hour limits in front of you.
3. **Permit page screenshot.** There's no screenshot of the permit form in /img, so the permit page uses the Company Home screen that shows "1 active permit". **Recommend:** make a permit form screenshot with demo data next time screenshots are made and swap it in.
4. **Rod tool shows 3 decimals** (like the app's Rod Reading converter), while the grade calculator shows 2 (like the grade sheet). **Recommend:** keep it; 0.68 vs 0.712 ft pipe offsets need the third decimal.
5. **The Projects doc `claude/Legal_Review_Drafts/03_marketing_claims.md` could not be read** from this session (no Projects tool here). The wording follows the rules in the brief and the same banned-word checks as test_site.js, now run on every page. **Recommend:** a quick read of the 3 use-case pages against that doc before pushing.

## DONE
