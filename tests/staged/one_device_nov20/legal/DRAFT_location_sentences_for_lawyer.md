# Drafts for the lawyer: device and location notes for "one device in use per login" (Nov 20, version 3)

Not in the app or on the website. For review with the next Terms / Privacy version.

What the app does (matches `sql/01_one_device.sql` and `patches/01_one_device.py`):

- Every signed-in device checks in about every 90 seconds while the app is on screen. It sends a random device id made
  on the device, the kind of device (phone, tablet, computer) and the app version.
- Only if the photo stamp already has a GPS fix under an hour old, it also sends that fix. The app never asks for
  location for this. The server keeps the latest fix per device, rounded to 0.01 degree (about 0.7 mile).
- The fix is used for one thing: when one login is used on two devices whose fixes are 10 miles or more apart and too
  far to have been driven in the time between them (over 90 mph, fixes within 3 hours of each other), a row is written
  to an event log. Refused sign-ins and "signed one device out to take its place" are logged too.
- **Only the app owner (us) can see that log**, on the app-owner admin screen: who, which company, when, which kinds of
  device, and for the far-apart case the distance and minutes between the fixes, never the position. Users, crew
  members and company accounts see nothing about it. The earlier draft (company account sees a note) is withdrawn.
- Device and session rows older than 120 days are removed when the login next signs in. The event log itself has no
  automatic removal yet (the admin screen reads the last 90 days); see question 3.

## Privacy Policy (one sentence, in the section on location / security)

> To keep each login to one person, the app records which devices a login is used on and, only when the app already has
> your location for a photo stamp, an approximate location of each device; if one login is used on two devices far apart
> at about the same time, we can see that it happened, how far apart and when, but not where.

## Crew notice, "What your company sees"

No change. The company does not see any of this, so no crew-notice sentence is needed and the notice version stays.

Questions for the lawyer:
1. Is "approximate location of the device, kept per device, used only to detect a shared login" covered by the current
   location wording, or does it need the sentence above?
2. Is a security/anti-sharing purpose enough on its own, or should Terms say that a login is for one person and may be
   limited to one device in use at a time (Terms 1.1 may already say one person per login: please check)?
3. How long may we keep the event log? Suggest 12 months, then remove (needs one line of SQL; not built).
