# Legal and website text to change so it matches billing_nov22

Not changed by me (decision / legal). These are the exact lines that no longer match what billing_nov22 builds, with
replacement wording. Numbers are the live billing settings; if a setting changes, change the text too.

What the server does after billing_nov22 (the facts every paper must say the same way):
- An invoice is due on the paid-through date (setting `due_offset_days`, now 0). It is sent 7 days before
  (`invoice_ahead_days`). If it is sent late, it is due 7 days after it was sent.
- Not paid: "past due" the day after the due date; read-only 7 days after the due date (`grace_days`). Days are
  Pacific-time days (`billing_tz` = America/Los_Angeles).
- The first invoice goes out when the plan starts (Make Paid). Same due date and lock rule.
- Monthly: everyone with a login plus every open email invitation (7 days) on the day the invoice is made. Join links
  are NOT counted until someone uses them. Seats bought up front are never billed below.
- Yearly: a person who joins above the paid seats is billed $120 a year x full months left / 12 (a part month is not
  charged: `catchup_part_month` = down). Waiting invitations are not charged on a yearly plan until they join.
- Founder price: the company account's request (Start Company Plan) sent before the trial ends locks the price for 12
  months from the start date, even if the order is signed after the trial ended.
- Read-only stops only: new runs, production entries, site log, job items, daily reports, 811 tickets and new people
  (join links and email invites). Confined space permits and safety reports always go through. Nothing is deleted.

---

## 1. `tests/staged/legal_nov19/drafts/order_form_draft.md`

| Line | Now | Change to |
|---|---|---|
| 14 | `\| Company plan, up to 5 people (the company's own login is not counted) \| $99 a month, or $990 a year \|` | keep |
| 15 | `\| Each extra person \| $12 a month, or $120 a year \|` | `\| Each extra person \| $12 a month, or $120 a year (added during a yearly plan: $10 for each full month left) \|` |
| 16 | `\| AI plan reading (optional add-on) \| $____ a month \|` | `\| AI plan reading (optional add-on) \| $1 a sheet, charged once when the sheet is read \|` |
| 19 | `**Billing period:** [ ] monthly  [ ] yearly   **Start date:** __________   **People at start:** ____` | `**Billing period:** [ ] monthly  [ ] yearly   **Start date:** __________   **People bought at start (at least the people in the company now):** ____` |
| 19 (new line after) | – | `**Billing state (for sales tax):** ____   **Billing contact:** ______________________` |
| 24-25 | `2. **People.** People added are billed from the next invoice. On a yearly plan, people above the paid number are billed for the rest of the year on the next invoice. No credit for people removed during a paid period.` | `2. **People.** Everyone with a login counts, and so does an email invitation that is still open (7 days). A join link counts once it is used. The Customer is never billed for fewer people than it bought. Monthly: people added are billed from the next invoice. Yearly: a person who joins above the paid number is billed $10 for each full month left in the year (part months are free). No credit for people removed during a paid period.` |
| 26-27 | `3. **Late payment.** If an invoice is not paid within 7 days after it is due, the account becomes read-only until it is paid. Nothing is deleted because of it.` | `3. **Invoices and late payment.** The first invoice is sent when this order starts. Each later invoice is sent about 7 days before the period starts and is due on the first day of the period (or 7 days after it is sent, if later). If an invoice is not paid within 7 days after it is due, the account becomes read-only until it is paid: new runs, reports and tickets wait on the phones and no one new can join; confined space permits and safety reports always go through. Nothing is deleted because of it. Dates are Pacific time.` |
| 28-29 | `4. **Founder pricing.** [ ] Applies: the prices above are locked for 12 months from the start date while the plan stays paid.` | `4. **Founder pricing.** [ ] Applies (the Customer asked for its plan in the app before its beta ended): the prices above are locked for 12 months from the start date while the plan stays paid.` |
| 30 | `(pipelayersbible.com, version ____)` | keep; the Make Paid form now records this version on the account ("Terms version they signed under", default 1.0) |

## 2. Terms v1.1 draft (Project doc `claude/Legal_v1.1_Drafts/terms_v1.1.html`; I could not open Project docs here,
so the "now" text is as quoted in the review and in `tests/staged/legal_nov19/drafts/terms_v1.2_changes.md`)

| Section | Now | Change to |
|---|---|---|
| 7.1 | "… Every other login in the company, and every open invitation or join link, counts. …" | "… Every other login in the company counts, and so does an email invitation that is still open. A join link counts once someone uses it. On a yearly plan, a person counts for the rest of the year once they join." |
| 7.2 | "Payment is due [OWNER: on receipt / within 7 days]." | "We send the first invoice when the plan starts, and each later invoice about 7 days before its period starts. An invoice is due on the first day of the period it pays for, or 7 days after we send it if that is later." |
| 7.3 (live) | "You can cancel at any time in your account settings, or by emailing admin@pipelayersbible.com." | "You can cancel at any time by emailing admin@pipelayersbible.com from the billing email or the company account's email." (there is still no cancel button in the app) |
| 7.5 (live) | "For yearly plans we will remind you before renewal." | "For yearly plans, the renewal invoice is sent about 7 days before the renewal date." (or keep the promise only if a reminder is built; nothing sends one now) |
| 7.8 | "100 AI requests a day for each person" / "200 AI requests a month" (individual) / "or you buy more" | Company plan: "a person: 25 a day and 150 a month; the company account: 5 a day; the company shares 60 a month for each person in it, with a monthly cost cap". Individual: "15 a day and 50 a month". Drop "or you buy more". Add: "Daily limits reset at midnight UTC (4 PM Pacific in winter, 5 PM in summer); monthly limits reset at the start of the month, UTC." (the app now says the reset time in the phone's time) |
| 7.9 | "If an invoice is not paid within 7 days after it is due, the account becomes read-only until it is paid: people can still sign in, see and export the company's records, but new records stay on each phone and are not sent, and AI features stop." / v1.1: "cannot add or change records" | "If an invoice is not paid within 7 days after it is due, the account becomes read-only until it is paid: people can still sign in, see and export the company's records; new runs, daily reports, tickets and site log entries stay on each phone until it is paid; no one new can join; AI features stop. Confined space permits and safety reports always go through. Nothing is deleted because an account is read-only for late payment. Days are counted in Pacific time." |
| 7.10 | "billed for the rest of that year" (no rate) | "On a yearly plan, a person added above the paid number is billed at the yearly rate ($120 a year) for each full month left in the plan year; a part month is not charged." |
| 7.11 | "founder price … for starting before its 30-day beta ends" | "A beta company whose company account asks for its plan in the app before its beta ends keeps the founder price for 12 months from the day its paid plan starts, even if the order is signed after the beta ended." |

## 3. `tests/staged/pricing_build_nov20/website/pricing_section.md`

| Line | Now | Change to |
|---|---|---|
| 10 | `- Pay for the year and get 12 months for the price of 10 ($990 for the company and 5 people, $120 for each extra person).` | `- Pay for the year and get 12 months for the price of 10 ($990 for the company and 5 people, $120 for each extra person; someone added mid-year is $10 for each full month left).` |
| 11 | `- Everyone with a login counts as a person: …` | add at the end: ` An email invitation counts while it is open; a join link counts once it's used.` |
| 20 | `- There is no free plan. Companies in the beta pay nothing until their beta ends; the price is shown in the app the whole time.` | `- There is no free plan. Companies in the beta pay nothing until their beta ends; the company account sees the price and its own amount on its Home screen the whole time.` |
| 21 | `- In the beta now? Start your company plan before your beta ends and the price is locked for 12 months.` | `- In the beta now? Tap Start Company Plan on the company account's Home screen before your beta ends and the price is locked for 12 months.` |
| 22 | `… The app says when a limit is reached and when it resets.` | keep (true now: the app says the reset time) |
| 28-29 | `Buttons: "Request a Beta" (existing trial form) under the company plan; "Get the App" under the individual plan (sign up in the app, then Get My Own Plan on the home screen).` | `Buttons: "Request a Beta" under the company plan; under the individual plan: "Already on a crew? Ask your company to invite you." (the app has no sign-up of its own yet, so don't send people to "sign up in the app")` |
| 38 (FAQ) | `… companies in the beta pay nothing until their beta ends."` | add: ` Invoices are due on the first day of each period; an unpaid account goes read-only 7 days after the due date, and nothing is deleted.` |

## Left as is (decision for Tommy, not built)
- #8: every crew member can open Settings > What each plan includes and read the company price. Untouched.
