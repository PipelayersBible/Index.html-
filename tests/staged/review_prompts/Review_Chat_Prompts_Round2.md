# Review chat prompts — round 2 (Nov 22)

Start each chat inside the Project and paste one file. Billing first: the price goes to the beta owners by Dec 4.


============================================================
## 09 Billing and Trial End
============================================================

You're reviewing The Pipelayer's Bible, a field app for underground pipe crews built by Thomas, an underground foreman.
- Live app: https://app.pipelayersbible.com (it has a sign-in, so you may only see the outside)
- Website: https://pipelayersbible.com
- Current code: GitHub repo PipelayersBible/Index.html-, branch main. The app source is _src/index.html, and release notes are in tests/patches/r17xx/RELEASE_NOTES.md. If you can attach the repo, use it; tests/rig can run the app with fake test accounts.
- Background: the Project docs, especially the newest release notes (r17.15) and the Status/Handoff doc. Don't repeat findings already in the other "Review – …" docs in the Project.

Rules:
- Review only. Don't change the app, the server, the repo or any accounts.
- Check every finding before you report it. Drop false alarms.
- Rank findings worst first and say how to reproduce each one.
- Plain words, short. Thomas is a foreman, not a programmer.

When you're done, save the full report to the Project as a doc named "Review – Billing and Trial End – [today's date]". If you're asked to dig deeper later, add the new findings to the end of that same doc under "Part 2 – Deeper pass".

Your focus:
The first beta trial ends in mid-December and the price goes out by Dec 4. Walk through the money side as the owner, the office and a crew member: trial countdown, what happens the day it ends, starting the company plan, adding and removing people (seats), the yearly option, invoices and past-due, a removed member, and what each person sees. Find anything that would charge the wrong amount, lock out a paying company, confuse the owner, or leak a price to the crew. Check the app against the Pricing Plan and Terms docs.


============================================================
## 10 Office and PM Day
============================================================

You're reviewing The Pipelayer's Bible, a field app for underground pipe crews built by Thomas, an underground foreman.
- Live app: https://app.pipelayersbible.com (it has a sign-in, so you may only see the outside)
- Website: https://pipelayersbible.com
- Current code: GitHub repo PipelayersBible/Index.html-, branch main. The app source is _src/index.html, and release notes are in tests/patches/r17xx/RELEASE_NOTES.md. If you can attach the repo, use it; tests/rig can run the app with fake test accounts.
- Background: the Project docs, especially the newest release notes (r17.15) and the Status/Handoff doc. Don't repeat findings already in the other "Review – …" docs in the Project.

Rules:
- Review only. Don't change the app, the server, the repo or any accounts.
- Check every finding before you report it. Drop false alarms.
- Rank findings worst first and say how to reproduce each one.
- Plain words, short. Thomas is a foreman, not a programmer.

When you're done, save the full report to the Project as a doc named "Review – Office and PM Day – [today's date]". If you're asked to dig deeper later, add the new findings to the end of that same doc under "Part 2 – Deeper pass".

Your focus:
Be the office manager and a PM at a 2-crew company for a full week. Daily reports coming in, approving and fixing them, run reports and photos, permits, 811 tickets across jobs, exports for billing and payroll, the Owner Dashboard, adding a job and a crew member. Where does the office waste time, miss something important, or have to call the foreman? What would make the office insist on keeping the app?


============================================================
## 11 Spanish for the Crew
============================================================

You're reviewing The Pipelayer's Bible, a field app for underground pipe crews built by Thomas, an underground foreman.
- Live app: https://app.pipelayersbible.com (it has a sign-in, so you may only see the outside)
- Website: https://pipelayersbible.com
- Current code: GitHub repo PipelayersBible/Index.html-, branch main. The app source is _src/index.html, and release notes are in tests/patches/r17xx/RELEASE_NOTES.md. If you can attach the repo, use it; tests/rig can run the app with fake test accounts.
- Background: the Project docs, especially the newest release notes (r17.15) and the Status/Handoff doc. Don't repeat findings already in the other "Review – …" docs in the Project.

Rules:
- Review only. Don't change the app, the server, the repo or any accounts.
- Check every finding before you report it. Drop false alarms.
- Rank findings worst first and say how to reproduce each one.
- Plain words, short. Thomas is a foreman, not a programmer.

When you're done, save the full report to the Project as a doc named "Review – Spanish for the Crew – [today's date]". If you're asked to dig deeper later, add the new findings to the end of that same doc under "Part 2 – Deeper pass".

Your focus:
Spanish is built into the app but switched off. Read every Spanish string in the source (the Spanish text table and the Spanish emergency answers) as a Spanish-speaking pipelayer from Mexico or Central America would. Flag wrong or unclear safety wording first (confined space, trench, 811, emergency), then words a crew wouldn't use (use the words pipe crews actually say), then English left on screens added in r17.12–r17.15. List exact replacements. Say what still needs a native speaker on a real crew to confirm.


============================================================
## 12 Ask Everyday Answers
============================================================

You're reviewing The Pipelayer's Bible, a field app for underground pipe crews built by Thomas, an underground foreman.
- Live app: https://app.pipelayersbible.com (it has a sign-in, so you may only see the outside)
- Website: https://pipelayersbible.com
- Current code: GitHub repo PipelayersBible/Index.html-, branch main. The app source is _src/index.html, and release notes are in tests/patches/r17xx/RELEASE_NOTES.md. If you can attach the repo, use it; tests/rig can run the app with fake test accounts.
- Background: the Project docs, especially the newest release notes (r17.15) and the Status/Handoff doc. Don't repeat findings already in the other "Review – …" docs in the Project.

Rules:
- Review only. Don't change the app, the server, the repo or any accounts.
- Check every finding before you report it. Drop false alarms.
- Rank findings worst first and say how to reproduce each one.
- Plain words, short. Thomas is a foreman, not a programmer.

When you're done, save the full report to the Project as a doc named "Review – Ask Everyday Answers – [today's date]". If you're asked to dig deeper later, add the new findings to the end of that same doc under "Part 2 – Deeper pass".

Your focus:
The earlier Ask review only tried to get dangerous safety answers. This one checks everyday quality. Ask it 40 real questions a pipelayer, foreman and PM would ask: grade and rod math, reading cut sheets and stakes, pipe materials and fittings, testing (air, mandrel, hydro, bac-T), backfill and compaction, specs by state, paperwork. Grade each answer: right, useful, short enough to read in the field, answer in the first sentence. Flag wrong numbers, made-up specs, answers that dodge, and anything that compares states. Suggest the 10 library entries that would help most.
