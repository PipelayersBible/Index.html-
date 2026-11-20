# Terms of Use v1.2: proposed changes on top of the v1.1 draft

DRAFT for the lawyer. Not legal advice. Nothing here is published. Base text: `claude/Legal_v1.1_Drafts/terms_v1.1.html`
(source `/tmp/claude-0/legal11/src/terms_v1.1.md`). Section numbers are v1.1's; nothing is renumbered.
Each item says why, then gives the text. `[LAWYER]` and `[OWNER]` mark open points.

---

## 1.1 How you agree (replace)

Why: since r17.05 / r17.10 there are three places a person agrees (the Terms sheet, the Set Password screen, the
join-by-link screen), and join-link accounts have no email address.

> 1.1 **How you agree.** You agree to these Terms when you tick the box next to "I have read and agree to the Terms of
> Use and Privacy Policy" and then tap **I Agree**, **Save Password** or **Join Crew** in the app. We keep a record of
> the date, the version, your account, and the app version and browser you used. If you joined with a link from your
> company, your account may have no email address; these Terms apply to you in the same way.

## 1.2 If you use the Service for a company (add at the end)

Why: billing is now by signed order form (r17.02), so the company's acceptance can sit on a signature, not on whoever
opened the beta.

> A paid company plan starts with an order form signed for the company. The order form, these Terms and the Privacy
> Policy together are the company's agreement with us. [LAWYER: confirm the order form binds the company to the Terms,
> including Sections 12 to 14, even if the person who opened the beta account had no authority.]

## 2.2 Accounts (replace)

Why: join links, 6-letter join codes and sign-in codes for the Home Screen app now sign a person in without a password.

> 2.2 **Accounts.** Each person needs their own login. Keep your password private. **Join links, join codes and sign-in
> codes work like a password: whoever has one can get into an account or into your company.** Send a join link only to
> the person it is for, and do not pass on a sign-in code. You are responsible for what is done under your login. If a
> phone is lost, or you think someone else has used your login, tell your company's office and us
> (admin@pipelayersbible.com) right away. An account that was made with a join link has no email or password; if that
> phone is lost, the company's office gives the person a new link and the old account is removed from the company.

## 2.3 Company accounts (add one sentence)

> The company's office, and a foreman if the office allows it, can add people by texting them a join link. The text is
> sent from the sender's own phone and messaging app; we do not send text messages.

## 3.5 Safety decisions (add at the end)

Why: Trench Sloping shows OSHA's Table B-1 arithmetic; the app must not be read as selecting or approving a protective
system (29 CFR 1926.652(b); 8 CCR 1541.1(b)), or as "tabulated data" under Option 3, which needs a registered engineer.

> Trench and excavation screens only do arithmetic on the tables published in OSHA's rules (29 CFR Part 1926, Subpart P,
> Appendix B) for the soil type and depth a person enters. They are not "tabulated data" approved by a registered
> professional engineer, they are not a protective-system design, and they do not take account of water, vibration,
> surcharge loads, nearby structures, previously disturbed soil or signs of distress. Where the rules require a
> registered professional engineer (for example, at 20 feet or deeper), the Service gives no slope. State rules can be
> stricter than the federal tables.

## 3.8 Not a time clock (replace)

Why: r17.06 added the office spreadsheet "Crew hours for payroll" and a default for each person's hours on the daily
report (8 hours, or first start to last stop when that is longer; a Break is not taken off). v1.1's 3.8 says times are
"not a payroll … record", which no longer matches the product. California requires start and stop times and meal
periods, not daily totals (IWC Wage Order 16-2001 §6(A); Labor Code §1174(d)).

> 3.8 **Not a time clock or a payroll system.** The Service is not a timekeeping system. Run times, break times and
> time-per-pipe figures are there to help you look at production. The hours shown for each person on a daily report are
> a daily total that the foreman enters or accepts and signs. The Service suggests a starting figure (8 hours, or the
> time from the crew's first start to its last stop that day when that is longer), and it does not take meal or rest
> breaks off. The "Crew hours" spreadsheet lists those signed daily totals. None of these is a record of when each
> person started and stopped work or took meal periods, and none of them shows whether a break was offered or taken.
> Your company keeps the time and payroll records the law requires in its own system, and checks any hours from the
> Service against those records before using them for pay, certified payroll or billing.
> [LAWYER: is the default (8 h / first start to last stop, breaks not deducted) a rounding or auto-fill risk for
> customers under California law, and should the spreadsheet be renamed so it does not say "payroll"?]

## 4.2 The permit feature is a form (add at the end)

Why: 29 CFR 1926.1205(c) and 8 CCR 1954(c) require the completed permit to be available to entrants at the time of
entry "by posting it at the entry portal or by any other equally effective means"; 1926.1205(f) / 1954(f) require
cancelled permits to be kept at least 1 year.

> Making the completed permit available to entrants at the space, and keeping cancelled permits for as long as the law
> requires, remain your company's job. A permit on one person's phone may not be enough by itself.

## 5.4 Ask (replace)

Why: Ask now answers questions about safety rules and state rules (trench protection depths, 811 notice, lockout
before entry) from a curated knowledge base, and the office version analyses the company's own numbers.

> 5.4 **Ask.** Answers from Ask about trade practice, specifications, standards, locate marks, 811 rules or safety
> rules are general information from a reference library we maintain, worded by AI. The library can be out of date or
> wrong for your state, your agency or your job, and the AI can misstate it. Check the answer against the current rule
> or specification and your project's documents. Ask does not classify soil, choose a protective system, clear a space
> for entry, or approve any work. It does not replace your competent person, engineer, inspector or safety program.
> When Ask analyses your company's own records, the result is a summary to check, not a finding about any person.

## 7.1, 7.2, 7.9 Paid plans (replace the bracketed parts)

Why: r17.02 built the billing records and the automatic read-only state; invoices are sent from Stripe; the company
login is free.

> 7.1 … The company's own account login does not count toward the 5 people. Every other login in the company, and every
> open invitation or join link, counts. …
>
> 7.2 **Billing and automatic renewal.** **Paid plans are billed in advance, monthly or yearly, and renew automatically
> for the same period at the then-current price until you cancel.** A paid plan starts when the company signs an order
> form. We send invoices to the billing email on the order form through our payment processor, Stripe. Payment is due
> [OWNER: on receipt / within 7 days]. We do not add a fee for paying by card.
>
> 7.9 **Late payment.** If an invoice is not paid within 7 days after it is due, the account becomes read-only until it
> is paid: people can still sign in, see and export the company's records, but new records stay on each phone and are
> not sent, and AI features stop. Nothing is deleted because an account is read-only for late payment. [OWNER: decide
> what happens after long non-payment.]

## 7.7 Taxes (replace the bracket)

Why: California SB 122 (2026 budget) puts sales and use tax on software as a service from January 1, 2027. Verified
from several firm summaries (not from the bill text); see NOTES item 2.

> 7.7 **Taxes.** Prices do not include taxes. Where the law requires us to collect sales or use tax, including
> California tax on software subscriptions for periods starting on or after January 1, 2027, we add it to your invoice
> as a separate line. [CPA: registration with CDTFA, the rate by the customer's address, and whether a period invoiced
> in December 2026 that runs into 2027 is taxed.]

## 8.8 Your people (replace)

Why: new California law signed September 30, 2026 (SB 947, operative July 1, 2027); Connecticut's expanded
electronic-monitoring notice law (Public Act 26-73, effective October 1, 2026); Labor Code §2802 phone reimbursement.

> 8.8 **Your people.** If you are an employer, you are responsible for telling your workers what the Service collects
> about them (including photos, times, breaks, hours on daily reports, how long work took and location stamps), for
> any notice, posting, acknowledgement or consent the law requires for workplace monitoring, and for any reimbursement
> the law requires when workers use their own phones for work. The app shows each crew member a notice of what the
> company can see, and records on the server when they accept it; that notice does not replace any notice the law
> requires from you. Production figures, times and AI summaries in the Service are not built to rate or discipline a
> person. If you use them in a decision to discipline or dismiss someone, a person at your company must review the
> underlying records and make the decision, and you must give any notice the law requires. On request we will help you
> give a worker a copy of the records the Service holds about them. [LAWYER: SB 947 and the Civil Rights Council's
> automated-decision rules: does anything in the Service count as an "automated decision system", and do we have
> duties of our own as the vendor?]

## 8.9 Records you must keep (add)

Why: "Clear sent photos" (r17.08) removes the phone's copy once the company has the photo.

> Clearing sent photos from a phone removes only that phone's copy; the company's copy stays in its account. If your
> company is in a dispute or has been told to preserve records, tell your crews not to clear photos or delete the app
> until you are told you may.

## 8.10 Customer signatures (new)

Why: r17.06 lets a customer's representative sign an Extra work entry on the foreman's phone.

> 8.10 **Customer signatures.** When someone outside your company signs an entry on a phone, the Service stores the
> drawn signature, the name and title typed, the time, and a fingerprint of what was signed. You are responsible for
> who you ask to sign, for whether that person has authority to sign for your customer, and for giving them a copy. A
> signature in the Service confirms only what the screen said when it was signed. It is not a change order, a price
> agreement or an approval under your contract unless your contract says so.

## 12.x Service-provider terms (new 8.11, or a schedule) [LAWYER: placement]

Why: a customer over the CCPA threshold ($26,625,000 revenue since January 1, 2025) is a "business" for its
employees' data; the vendor needs a written service-provider contract (Civ. Code §1798.140(ag)). The DPA is still an
outline, so no customer is covered today.

> 8.11 **We act as your service provider.** For Company Data we: (a) process personal information only to provide the
> Service to you and for the other purposes these Terms and the Privacy Policy allow; (b) do not sell or share it, and
> do not keep, use or disclose it outside our direct business relationship with you; (c) do not combine it with
> personal information we get from other sources, except as the law allows a service provider to do; (d) will tell you
> if we decide we can no longer meet our obligations under the California Consumer Privacy Act; (e) will help you
> answer requests from your people; (f) pass the same duties to our own providers; and (g) will tell the company's
> account owner without undue delay if we learn of a breach of security affecting Company Data.

## 14.1, 14.8, 17, 19.2 Notices when there is no email (replace the affected sentences)

Why: join-link accounts have no email. v1.1 sends dispute notices "to your account email", takes opt-outs "with your
account email", and promises Terms changes "in the app and by email".

> 14.1 … We will send yours to your account email, or, if your account has no email address, by a notice in the app
> and to your company's account owner. …
>
> 14.8 **Your right to opt out.** You may opt out of this Section 14 within 30 days after you first accept these Terms
> by emailing admin@pipelayersbible.com from any email address, with your name, your company's name (if any), your
> account email if you have one, and the words "I opt out of arbitration". …
>
> 17 … For changes that matter, we will tell you in the app, and by email if your account has an email address, at
> least 30 days before they take effect, and we will ask you to agree again. …
>
> 19.2 **Electronic notices.** You agree that we may send you notices and records electronically: in the app, to your
> account email if you have one, or to your company's account owner.
> [LAWYER: is an in-app notice enough for a person with no email, for Terms changes and for a pre-dispute notice? Should
> the opt-out also be possible inside the app?]

## 19.8 Contact (add an address)

Why: commercial email needs "a valid physical postal address" (CAN-SPAM; a registered P.O. box or private mailbox is
allowed), and v1.0 / v1.1 give no address.

> 19.8 **Contact.** [LLC LEGAL NAME], [POSTAL ADDRESS OR REGISTERED MAILBOX], admin@pipelayersbible.com.
