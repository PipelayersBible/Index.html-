# Drafts for the lawyer: location in the "one login, two places" note (Nov 20)

Not in the app or on the website. For review with the next Terms / Privacy version.

What the app does: when a signed-in device checks in, and only if the photo stamp already has a GPS fix under an hour
old, it sends that fix. The server keeps the latest one per device, rounded to 0.01 degree (about 0.7 mile). It is used
for one thing: if the same login signs in on a second device and the two fixes are within the same hour and 10 miles or
more apart, the company account and the app owner see a note such as "Ray's login was used on two phones 35 miles apart
at 9:10 AM on Nov 20." The company never sees the position itself, only the distance and the time. Rows older than 120
days are removed when the login next signs in.

## Privacy Policy (one sentence, in the section on location)

> To keep each login to one person, the app notes which device a login is used on and, when the app already has your
> location for a photo stamp, an approximate location of that device; if one login is used on two devices far apart at
> about the same time, your company account and we can see that it happened, how far apart and when, but not where.

## Crew notice, "What your company sees" (one sentence; this changes the notice, so its version goes up and it is shown again)

> Your company can also see if your login was used on two devices at about the same time, and how far apart they were.

Questions for the lawyer:
1. Is "approximate location of the device, kept per device" covered by the current location wording, or does it need the sentence above?
2. Does the crew notice need the new sentence before the note is shown to companies, or is the Privacy Policy enough?
