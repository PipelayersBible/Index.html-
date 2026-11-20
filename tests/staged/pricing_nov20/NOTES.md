# Pricing plan — notes (Nov 20 2026)

Research and a proposal only. Nothing was built, applied, deployed or changed. Server: read-only selects.
All prices below were seen on **Nov 20, 2026** at the link given. "Third-party" means the vendor does not publish the
price and the number comes from a listing site; treat those as rough.

## 1. Where we stand today (verified)

- **The deal already built into the billing server** (`pb_billing.settings`, read Nov 20): `base_cents 9900`,
  `base_seats 5`, `seat_cents 1200`, `yearly_months 10`, `founder_months 12`, `grace_days 7`,
  `plan_reading_cents null`, `seller_legal_name null`. In words: **$99 a month includes the company account plus 5
  people, $12 for each extra person, pay yearly and get 12 months for the price of 10, founder price locked 12 months,
  plan reading add-on has no price yet.** (Details: `tests/staged/billing0/NOTES.md`.)
- **Nobody is paying yet.** 0 rows in `pb_billing.accounts`. Companies: 1 paid (Tommy's own, no billing record), 2 in
  beta. **The two betas end Dec 18 and Dec 19, 2026.** Beta limit: company account + 6 people (`trial_limits.seats = 7`).
- **The customer never sees a price.** No "$99" anywhere in `_src/index.html` (0 matches). When a beta ends the owner
  gets "Start Company Plan" then "Request sent. You'll be contacted to set it up." (`_src/index.html` 39787–39789).
  Same finding in `tests/staged/critic_nov19/NOTES.md` item C.
- **Two plan levels exist in the app, neither is free and the individual one has no price.** Screens are gated by
  `PB_INDIVIDUAL_SCREENS` (New Run, Quick Run, calculators, Stats, Reference, Jobs, Tools) and `PB_CONTRACTOR_SCREENS`
  (Confined Space, Records, reports) at `_src/index.html` 14537–14539. With no plan, only Home/Login/Settings open.
  "My Own Plan" is a request Tommy answers by hand (39762–39767). Settings › "What each plan includes" (5034) is out of
  date (leaves out daily reports, company board, tickets, plans, Ask).
- Terms §7.1 already says prices "are shown when you sign up and in your account, or in your signed order", and §7.7
  "Prices do not include taxes" (`terms.html` lines 59, 65). Showing the price in the app is what the Terms promise.

## 2. What the others charge

### Field / daily-report / project apps

| App | How they charge | Price | Minimum / free | Source |
|---|---|---|---|---|
| **Raken** | per user | Vendor shows no price now ("Request Pricing"). Third-party: Basic $23, Performance $59 per user/month, **3-user minimum** (article Jun 9 2026); another lists $29 / $49 (Mar 2026) | 3 users; no free plan | [rakenapp.com/request-pricing](https://www.rakenapp.com/request-pricing), [Capterra](https://www.capterra.com/p/153591/RAKEN/pricing/), [projectmanager.com](https://www.projectmanager.com/blog/what-is-raken), [third-party](https://contractors-and-builders.pages.dev/pricing/raken/) |
| **Fieldwire** | per user | Pro $54/user/month, or $468/user/year (≈$39/mo). Business $79, or $768/year. Business Plus $104, or $1,068/year | **Free: 5 users, 3 projects, 100 sheets** | [Fieldwire help: Pricing and Overages](https://help.fieldwire.com/hc/en-us/articles/202634054) |
| **Procore** | per company, unlimited users, yearly contract | No price shown ("custom quote"). "We'll never charge you for adding more users." Third-party: Procore safety product listed from about $10,000 a year | none | [procore.com/pricing](https://www.procore.com/pricing), [projul.com](https://projul.com/blog/best-construction-safety-software/) |
| **HCSS HeavyJob** | by module and company size | Quote only ("Pricing available upon request"); setup and training fees extra | none | [Software Advice](https://www.softwareadvice.com/job-costing/heavyjob-profile/), [OneCrew, Jan 7 2026](https://www.getonecrew.com/post/hcss-heavyjob-alternatives) |
| **HCSS Safety** | — | Capterra lists "from $25.00, flat rate, per month". Not confirmed by HCSS; treat as unreliable | no free plan | [Capterra](https://www.capterra.com/p/163368/HCSS-Safety/) |
| **B2W (Trimble)** | by module | Quote only. Third-party estimate "starts at $2,500/month" | none | [OneCrew, Jan 7 2026](https://www.getonecrew.com/post/hcss-heavyjob-alternatives) |
| **Assignar** | custom | Quote only (article Aug 4 2026) | none | [OneCrew](https://www.getonecrew.com/post/assignar-pricing) |
| **Trimble Connect** | per user | Third-party: Pro $44/user/month or $349/user/year; Innovate $62 or $499/year (checked Oct 31 2026) | 30-day trial | [CostBench](https://www.costbench.com/software/construction-management/trimble-connect/) |
| **CompanyCam** | per company with included users | Core $63 (1 user), Crew $129 (3 users), Scale $199 (3 users), **+$29 each extra user**; yearly saves 20% | — | [companycam.com/pricing](https://cdn.companycam.com/pricing) |
| **Contractor Foreman** | per company, tiers by user count | "$49 to $332 per month when billed annually", five tiers | — | [contractorforeman.com, May 20 2026](https://contractorforeman.com/are-you-overpaying-for-construction-software-a-quick-way-to-tell/) |

### Time clock apps (what a small contractor already pays per head)

| App | How they charge | Price | Free | Source |
|---|---|---|---|---|
| **busybusy** | per user | Pro $11.99/user/month, or $9.99 billed yearly ("2 free months"). Premium $17.99, or $14.99 yearly | **Free plan, unlimited users** | [busybusy.com/price](https://busybusy.com/price/) |
| **Workyard** | company fee + per user | **$50/month per company** + $8/user (time) or $16/user (workforce); yearly $6 / $13 (20% off) | — | [Workyard help](https://help.workyard.com/en/articles/4800717-how-much-is-workyard-going-to-cost) |
| **ClockShark** | company fee + per user | Vendor page shows no dollar figures and says "Contract term of three (3) years applies". Third-party: Standard $42/month + $9.50/user; Pro $63 + $11.50/user (checked Oct 27 2026) | 14-day trial | [clockshark.com/pricing](https://www.clockshark.com/pricing/), [CostBench](https://www.costbench.com/software/construction-management/clockshark/) |

### Safety / permit apps

| App | Price | Free | Source |
|---|---|---|---|
| **SafetyCulture** (its site now forwards to mitti.com, which I could not open) | Third-party: Premium about $24–$29 per user/month | Free up to 10 users | [G2, updated Apr 30 2026](https://www.g2.com/products/safetyculturehq/pricing), [projul.com](https://projul.com/blog/best-construction-safety-software/) |
| **SiteDocs** | Third-party: from about $15/user/month | — | [projul.com](https://projul.com/blog/best-construction-safety-software/) |
| **Safesite** | Third-party: Pro from about $16/user/month | Free basic plan | same |
| **GoCanvas** (forms, used for permits) | Third-party: from about $30/user/month | none | same |
| Dedicated confined-space / permit-to-work systems | Quote only on every listing I opened; built for plants and refineries, not a pipe crew | — | [Capterra: Permit To Work](https://www.capterra.com/p/268137/Permit-To-Work/) |

### Grade / pipe calculator apps (what a pipelayer pays out of his own pocket)

| App | Price | Source |
|---|---|---|
| Construction Master Pro Calc | Free download; **$4.99 a month or $39.99 a year** | [App Store](https://apps.apple.com/us/app/id370406446) |
| Pipe Calc Elite | $19.99 once | [App Store](https://apps.apple.com/us/app/pipe-calc-elite/id595640000?l=en) |
| Pipe Slope Calculator | $2.99 once | [App Store](https://apps.apple.com/us/app/id6760373343) |
| Trade calculator round-up | $7.99–$24.99 once is the norm | [FieldLab, Mar 26 2026](https://builtbyfieldlab-site.pages.dev/compare/best-trade-calculator-apps/) |

### What the research says

1. **Per user is the norm; $10–$17 a head for a time clock, $23–$59 a head for daily reports and plans.** $99 for 5
   people is about $20 a head, and $12 for each extra is at time-clock level. A 6-person company pays $111 with us;
   Raken's cheapest listed plan would be $138–$174, Fieldwire Pro $324.
2. **The apps a small contractor actually buys show the price.** The quote-only ones (HCSS, B2W, Procore, Assignar,
   now Raken) sell to bigger companies with a salesman. A one-man company can't run a sales call for every customer.
3. **"Company fee + included people + a price per extra person" is a known shape** (CompanyCam, Workyard, ClockShark).
   An owner has seen it before.
4. **Yearly discounts run from 2 free months (busybusy) to 20% (Workyard, CompanyCam) to about 28% (Fieldwire).** Our
   "12 months for the price of 10" (16.7%) sits in the middle.
5. **Free tiers are common and limited by people, not by time:** Fieldwire 5 users, SafetyCulture 10 users, busybusy
   unlimited users with fewer features.
6. **A pipelayer will not pay more than about $5 a month or $40 a year for calculators.** That is the ceiling the
   calculator apps set.
7. **No one sells a pipe-crew confined space permit at a public price.** There is nothing to undercut, and nothing to
   anchor against either.

## 3. What a company costs us (so the price covers it)

Measured on the live server where I could; the rest is from the vendors' price pages.

| Cost | What I found | Per company, per month |
|---|---|---|
| **Ask / AI reads (Anthropic)** | Live log: 3 Ask questions cost $0.155 = **$0.052 each** (`pb_billing.ai_cost`, Nov 17). Test runs: 1,183 at an average **$0.032**, highest $0.29 (`pb_ai.eval_results`). I use $0.04. Real use so far: 125 requests over 39 person-days (Oct 18–Nov 19), mostly Ask and stake reads | **Normal use ≈ $10** (6 people × 2 a workday). See the risk below |
| **Plan reading (AI)** | 54 sheets read cost **$15.07 = $0.28 a sheet**, highest $0.57 (`pb_plans.sheets`). Small sample | A 100-sheet set ≈ **$28**, once per set. Not in the $99 today (add-on, no price set) |
| **Supabase** | Pro $25/month includes 8 GB database, 100 GB files, 250 GB transfer, 100,000 users; then $0.125/GB database, $0.0213/GB files ([supabase.com/pricing](https://supabase.com/pricing)). Today: database 111 MB, files 0.8 GB total | Fixed $25 for everyone. Each company adds cents (photos and plan sets, about $0.02 per GB) |
| **Resend (email)** | Free 3,000 a month, 100 a day; Pro $20 for 50,000 ([resend.com/pricing](https://resend.com/pricing.md)). Logged in the last week: 12 emails | Under $1. The 100-a-day free limit is the thing to watch at about 10–20 companies; then $20 a month in all |
| **Backblaze B2 (offsite backup)** | $6.95 per TB a month, first 10 GB free ([backblaze.com](https://www.backblaze.com/cloud-storage/pricing)). Backups today: 501 MB | About $0 |
| **Card fees (when Stripe comes)** | 2.9% + 30¢ card; bank debit 0.8% capped at $5; Billing 0.7%; Tax 0.5% ([stripe.com/pricing](https://stripe.com/pricing)) | Card: about $3.90 on $99. Bank debit: about $2. Hand-sent invoices paid by check: $0 |

**Bottom line:** a normal 6-person company costs about **$12–$17 a month** against $99–$111. Fixed costs are about
$50–$70 a month in all. The price covers it with room, **except for two holes:**

- **Hole 1: the paid AI limit is 100 requests a person a day with no company-wide cap.** (`public.ai_daily_limit`
  returns 100 for a paid company member; `ai_try_consume` only applies the 200-a-day company cap to betas.) One person
  using it all day costs $4–$5 a day, more than his $12 seat in three days. Six people at the limit is about $720 a
  month against $111. Unlikely, but nothing stops it. The beta is tighter than paid (30 a person, 200 a company).
- **Hole 2: plan reading costs real money per sheet** ($0.28) and has no price. A company that uploads three 100-sheet
  sets in a month costs $84. It must stay an add-on with a sheet allowance, not be folded into the $99.

## 4. Three ways to charge

Three example companies used below (people = logins, not counting the free company account):
**Small** 5 people (1 foreman, 3 pipelayers, 1 office). **Medium** 12 (2 foremen, 1 superintendent, 1 office,
8 pipelayers). **Large** 25 (4 foremen, 2 PM/superintendents, 2 office, 17 pipelayers).

### Model A — Company plan with 5 people included (what is built)
- **$99 a month: the company account + 5 people. $12 a month for each extra person. Pay yearly: 12 months for 10.**
- Everyone with a login counts the same: pipelayer, foreman, office. Waiting invites count. The company account is free.
- Small $99 · Medium $183 · Large $339.
- For: one sentence; already built and tested (Make Paid, Billing due, seats, catch-up); cheaper per head than every
  listed competitor. Against: an owner may leave pipelayers out to save $12, and the crew features (permit sign-on,
  crew view, join links) want every pipelayer in.

### Model B — Per crew
- **$99 a month per crew: one foreman and all his pipelayers. Office and PMs free.**
- Small $99 · Medium $198 · Large $396.
- For: it is how a contractor counts ("I run three crews"); pipelayers never cost extra. Against: "what is a crew" gets
  argued (a superintendent who runs a job, two foremen on one crew, a foreman off for a month); the server counts
  logins, not crews, so billing would need rebuilding; it is the most expensive for the small company's next step
  (second crew doubles the bill).

### Model C — Pipelayers free, pay for the people who run the work
- **$99 a month: the company account + 3 foremen or office people. $29 for each extra one. Pipelayers free, no limit.**
- Small $99 · Medium $128 · Large $244.
- For: no reason to leave a pipelayer out; price follows the people who get the value. Against: least money from
  bigger companies; a company can call a working foreman a "pipelayer" to dodge the $29 unless the app's roles stop it
  (foreman-only actions: start a run for the crew, sign a permit as supervisor, sign the daily report); needs a change
  to how the server counts seats.

### In all three: a free tier for the individual, and what "company" means
- **Free (any pipelayer, no card, no company):** Quick Run, the calculators, Education & Reference. Works offline, costs
  us nothing to serve (the app is one file; no AI, nothing stored on the server). This is the funnel: a pipelayer uses it,
  shows the foreman, the foreman shows the owner.
- **Company plan:** everything, for everyone in the company: runs with photos and sealed records, confined space
  permits, trench/shoring, daily reports, tickets, the company board and office screens, crew invites, Ask.
- **Plan reading:** add-on (see decision 4).
- A person removed from a company drops to Free by himself. No request, no "you'll be contacted".

### Revenue (list price, monthly billing, before costs and tax)
Mix assumed: 60% Small, 30% Medium, 10% Large. Average per company: A $148, B $158, C $122.

| Companies | Model A / month | A / year | Model B / month | B / year | Model C / month | C / year | If every one is Small ($99) / year |
|---|---|---|---|---|---|---|---|
| 5 | $741 | $8,892 | $792 | $9,504 | $611 | $7,332 | $5,940 |
| 20 | $2,964 | $35,568 | $3,168 | $38,016 | $2,444 | $29,328 | $23,760 |
| 50 | $7,410 | $88,920 | $7,920 | $95,040 | $6,110 | $73,320 | $59,400 |

A company that pays yearly brings in 16.7% less for the year (10 months), all up front. Costs to take off: about $15 a
company a month plus about $60 a month fixed. At 5 companies on Model A that leaves about $600 a month; at 20, about $2,600.

## 5. Recommendation: Model A as built, plus the free tier

**"$99 a month for your company and 5 people. $12 for each extra person. Pay for the year and get 2 months free."**

Why:
1. **It is built.** The server, the Make Paid form, Billing due, seat counting and the yearly catch-up all use these
   numbers and passed their tests. The betas end in four weeks. B and C both need the seat counting rebuilt first.
2. **It is one sentence**, which is Tommy's standing rule, and it lets the app and the website say the price straight.
3. **It is under every competitor per head**, so price is not the objection; nobody is paying yet, so there is no
   evidence that $99 is too high or too low. The server copies the price onto each account when it signs, so the list
   price can go up later for new customers without touching anyone who already pays.
4. **The one real weakness (owners leaving pipelayers out) is cheap to watch.** If paid companies sit at exactly 5
   people while their crews are bigger, switch the extra-seat rule to Model C's "pipelayers free". That is a change to
   one counting function, and it only ever lowers a customer's bill.

Rules to state plainly:
- **Who counts:** every person with a login. The company account doesn't. A waiting invite holds a seat until used or
  cancelled. Remove someone and the seat is free for the next person.
- **Yearly:** $990 for the base (10 × $99); extra people $120 a year each.
- **Beta to paid:** a beta company that signs before its beta ends keeps today's price for 12 months (the founder lock,
  already built). Nothing is deleted if it doesn't sign; records wait, as built. Tell both beta owners the price and the
  date at least 14 days before Dec 18.
- **Later price rises:** existing customers keep their price until told; Terms §7.4 already requires 7–30 days' notice.

### What to show
- **In the app, now, during the beta** (Home beta line and Settings): "Beta · 28 days left. After that: $99 a month for
  your company and 5 people, $12 for each extra person." On the invite sheet where seats are shown: "6 people. $111 a
  month after the beta." At beta end: the same price next to **Start Company Plan**, not "you'll be contacted".
- **Settings › What each plan includes:** rewrite to Free / Company with the real lists.
- **On the website:** one price block. "Free for pipelayers: grade calculators, Quick Run, reference. Company: $99 a
  month, 5 people included, $12 each extra, 2 months free when you pay yearly. Prices plus tax." No "contact us".

## 6. California sales tax — a question for the CPA

`tests/staged/legal_nov19/NOTES.md` item 2: California applies sales tax to software subscriptions from **January 1,
2027**. I re-read the source today: "Beginning on January 1, 2027, California will apply sales and use tax to digital
prewritten software"; the sale counts as made at the customer's address in the seller's records
([Kilpatrick, July 2026](https://ktslaw.com/blog/kilpatricks-state-and-local-tax-blog/2026/7/california-expands-sales-and-use-tax-to-saas-and-electronically-delivered-software)).
The article gives no rate and no small-seller exemption. Ask the CPA: (1) is this subscription covered; (2) seller's
permit and when to register; (3) the rate by customer address; (4) a yearly plan paid in December 2026 that runs into
2027; (5) tax on the $12 seats and the add-on. For pricing it means: **quote every price "plus tax"** (Terms §7.7
already does) and keep a line for tax on the invoice. Do not fold tax into the $99.

## 7. Decisions for Tommy (5)

1. **The price.** Keep **$99 a month with 5 people, $12 each extra, yearly = 10 months**, everyone with a login counts?
   *Recommend: yes.* It is built and it is under every competitor. If you don't decide: it stays as built and unseen.
2. **A free tier for pipelayers** (Quick Run, calculators, Reference; no AI, nothing saved to the server), with "My Own
   Plan" requests retired? *Recommend: yes.* It is the funnel, it costs nothing to serve, and it ends the hand-handled
   requests. A paid individual plan (around $5 a month or $40 a year, the calculator-app ceiling) can come later.
   If you don't decide: a person with no company can open nothing.
3. **Say the price now**, in the app during the beta and on the website? *Recommend: yes to both, as soon as decision 1
   is made, and no later than Dec 4* (14 days before the first beta ends). Founder lock stays: sign before the beta ends,
   keep the price 12 months.
4. **Close the two cost holes.** (a) Paid AI limit: 30 a person a day and 300 a company a day, instead of 100 a person
   with no company cap. (b) Plan reading add-on: **$49 a month, up to 100 new sheets a month** (worst case costs us
   about $28). *Recommend: yes to both;* re-check the sheet cost after 500 sheets, the sample is 54.
   If you don't decide: one heavy user can cost more than his company pays, and plan reading stays off.
5. **Tax and the seller.** Take the CPA questions in section 6 before the first invoice, together with the LLC name and
   seller's permit that billing already waits on. *Recommend: book it this month;* Jan 1 is six weeks out.

## 8. Not done / limits
- Vendor pages I could not open: SafetyCulture/Mitti pricing, Raken's old price page (gone; now quote-only). Those rows
  use third-party numbers and say so.
- HCSS, B2W, Assignar, Procore publish no prices; nothing here is a quote.
- AI costs come from small samples (3 live questions, 54 plan sheets, 1,183 test runs). Stake-read and cut-sheet costs
  are not logged separately yet.
- I did not read the Ask server code (it is stored encrypted); limits come from the database functions.
- Nothing built. Showing the price in the app, the free tier and the AI caps are proposals.

## DONE
