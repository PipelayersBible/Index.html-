# emergency_nov22: instant emergency check (phone + server), Spanish emergency wording, Ask search fixes (Nov 22 2026)

Nothing installed, published, committed or pushed. Server: read-only SELECTs only (`pb_ai.code`: live = `1b8514750e72`, next = `9c38a478964d`, fallback = `fe5092306953`).

**Where the reviews came from.** This session has no Projects tool, so I couldn't open the two Project docs. Instead I read the full reports in the reviewers' own chats: "Spanish review for pipelayer app", Part 1 and Part 2, and "Ask app everyday answers review", Part 1 and Part 2. Those chats contain the exact text the reviewers saved to the docs, including every phrase list, the replacement Spanish and the Spanish table rows. If either doc was edited after its chat, those edits are not covered here.

**Base, checked.** The live Ask build `1b8514750e72` is exactly `ask_quality_nov22/work/src_q`: building it with esbuild 0.28.2 and PB_BUILD "1122-0504" gives sha256 1b8514750e72…, the same as the decrypted live file. The phone copy of the check in the r17.16 candidate A (`r1716_candidate/work/A/index.src.html`, md5 3703f40c…) is the same as live `_src`. It is byte-for-byte the server's emergency.ts with `export` dropped and the lines indented. The patch refuses any other base.

## What was wrong (each one reproduced on the live code first)
- **#12 (English and Spanish):** "the boom touched the line", "excavator touched the line", "dump bed touched the lines", "the bucket hit the line" and "la retro tocó la línea de alta" all got the general medical/CPR steps. "the boom touched the overhead" got nothing. Cause: the script choice needed a word like power, electric or wire.
- **#1 / #13:** the review lists are all in `tests/cases.txt`. 47 of the 69 phrases got no instant answer and some got English. Cause: word stems such as `electrocut\b`, `desmay\b`, `derrumb\b` and `enterrad\b` only matched with a word boundary right after the stem, so "electrocutó", "desmayó", "derrumbó" and "enterrado" never matched. Language was guessed from a short keyword list.
- **Everyday P1 #2:** a sewer-gas or rotten-egg smell at a manhole, wet well or cleanout got the gas-line-strike steps.
- **Everyday P2 C:** all 20 false alarms reproduced. One more finding: **the server had a second, older emergency list** (`safety.ts` PB_AI_EMERGENCY_RX). It fired whenever the new check said no, so on the server "caved in overnight, no one in it", "4 gas meter keeps beeping low battery" and "gas alarm set at…" still got a generic emergency text.
- **Search A / B / D / G:** all reproduced with the live search code on the live library (`tests/search_probe.mjs`). Before the fix, 12 of 48 probe checks passed.

## What I built
### 1. The emergency check: `src_patch/emergency.ts`, one file pasted unchanged into the app (`patches/p1_emergency_block.py`)
- **Machine part on a line → power steps.** Machine parts: boom, stick, bucket, excavator, hoe, crane, dump bed, pluma, brazo, bote, cucharón, retro, excavadora, grúa. Added power words: alta (tensión), alambres, cables de alta, overhead. A high part (boom, crane, dump bed, pluma, grúa) that *hit* a line also gets the power steps.
- **New script "line"** for a bucket that hit a line with nothing to say what kind, or a message with both power and gas words. It shows one lead line, then the full power steps, then the full gas steps. Never the medical steps.
- A water, sewer, fiber, phone or irrigation line hit is not an emergency, as before. "No contact" / "didn't touch" switches off the contact patterns.
- **Spanish:** every phrase from both review lists (gas, power, gas monitor alarm, cave-in, medical, bad air/H2S, crush, struck-by). Word-end matching (`electrocut\w*` etc.). hoyo, manhole, trench and excavación count as hole words. derrumbe, enterrado and tierra encima get the cave-in steps. Spanish what-if words ("cómo se evita", "qué hago si", "señales de") quiet only the weak triggers, as in English.
- **Language:** Spanish when ordinary Spanish small words (el, la, se, lo, le, está, un, en…) plus Spanish emergency words outnumber the English ones.
- **Sewer smell:** a smell of gas, rotten eggs or drenaje together with sewer, manhole, wet well, lift station, cleanout, vault, pozo or registro gets the confined-space steps. "smell gas in the trench" stays gas. "the gas meter on the house" is natural gas; only a gas *monitor* (alarm, detector, 4-gas, a "meter going off") counts as the monitor case.
- **False alarms (C):**
  - "ran over" / "backed over" need a person.
  - "hit by a truck" (weak trigger) needs a person.
  - "down" is not an emergency when followed by at/to/sick/with (but not "with heat stroke"), or by "in the trench/hole" plus shooting/setting/laying/grade/rod.
  - nobody hurt / no one was in it / overnight / last night / nadie salió herido / anoche mark it as after the fact, unless something is still happening (trapped, buried, not breathing, bleeding, alarm going off, gas blowing).
  - "collapsed on the pipe" with no person named is about the pipe.
  - "low battery", "bump test" and calibration skip the alarm patterns, unless someone is inside.
  - "not responding" no longer counts for texts, calls, emails or "about the ticket", unless there is a danger word (manhole, hole, inside, hurt…). Radio still counts.
  - When in doubt it fires: "operator is not responding on the radio" still gets a script.
  - "How long to report" and "hospitalized" added to the after-the-fact words.
- **Spanish text (#4):** the review's replacement text for all four answers, with accents, the upwind wording, "el dueño de la línea" and "2 a 3 pulgadas (5 a 8 cm)". `PB_EMG_FOCUS` now matches `Ca[ií]da`, and the fall line still moves up (tested).
- **#19:** the interpreter line closes the Spanish space and open answers: "Si no habla bien inglés: diga primero la dirección y luego «Spanish». El 911 conecta a un intérprete; puede tardar un minuto, no cuelgue."
- **Space script, one new line (EN + ES), decision 1:** "Gas alarm, or a rotten-egg or sewer smell: everyone out now. Nobody goes back in until the air is tested and ventilated and the entry supervisor says so."
- **One new English trigger:** "broke his leg/arm/back…" now gets the open script, so it matches the Spanish "se quebró la pierna" from the review list.

### 2. Server (staged Ask build `cdddf51b34db`)
- **Build:** `build/b-cdddf51b34db.txt`, sealed with the slot key.
  - sha256 of the plain bundle: **`cdddf51b34db5f48e5e4046b3475a0a5f0f7f45dd97a396dadf7f195d279ee0d`** (`build/SHA256`).
  - Reproducible: `sh build/build.sh` gives the same sha256 twice.
  - Overlay: empty, same as the live build.
- **Source:** `sh src_patch/make_src.sh <dir>` = live `src_q` + `src_patch/emergency_nov22.diff` (ask.ts, emergency.ts, index.ts, safety.ts, state.ts). The full source stays in the git-ignored `work/server_src` so server code isn't published, the same as before.
- `safety.ts`: the old generic emergency list no longer fires. `localAnswer(q, { notEmergency })` skips the script but keeps the go/no-go check.
- `ask.ts` / `index.ts`: `body.not_emergency === true` (sent by "Not an emergency? Send to Ask") skips the emergency check on v2 and v1.
- **A:** "ticket" counts as 811 only next to 811 words (811/locate/dig/USA ticket, ticket number/life/expires/renew…). It never counts for T&M, time and materials, field, delivery, concrete, batch, dump, haul, load, extra work, scale or truck tickets.
- **B:** a state card goes first, and brings the long state instructions, only when it is on topic:
  - a card of a known kind on its own topic (811 → dig-*, trench → sp-xx-trench, confined, report, heat, fall, traffic tc-xx, training, who-enforces), or
  - its title shares the question's subject (`about()`) and it scores ≥ 0.45 of the best hit (`OWN_FIRST_MIN`), or
  - it scores ≥ 0.55 (`OWN_SURE_MIN`), or
  - the question names the state.
  - Off-topic state cards are still handed to the model, after the general cards. Raising OWN_MIN itself dropped cards (650 → 643 of 700 at 0.4), so OWN_MIN stays at 0.28 as the bar for being handed at all, and the raised bar applies only to first place.
- **D:** "trench" or "excavation" forces the trench-safety cards, and counts as a safety rule (the "name the state plan" line), only with a safety word: box, shore, slope, bench, protect, cave, ladder, competent person, inspect, water in the trench, air/atmosphere, edge, rain… "Excavation depth" still counts, so the existing test still holds.
- **G:** `esSearchWords()` is a small Spanish → English word list (pendiente, estaca, relleno, compactado, zanja, tubo, prueba…). It is added to the search only when the question reads as Spanish.

### 3. App patches (on r17.16 candidate A; `sh patches/build_app.sh` → `work/app/`)
Order: `p1_emergency_block.py` → `p2_not_emergency_link.py` → `p3_spanish_rows.py` → `p4_dispatcher_interpreter.py`. Each uses an exact-once replace; the full diff is in `patches/app_emergency_nov22.diff`.
- p2 adds a small "Not an emergency? Send to Ask" link under the newest instant script.
  - One tap sends the same question the normal way, with `not_emergency: true`, and Retry keeps the flag.
  - The link goes once Ask answers.
  - The red EMERGENCY button and the script stay on screen.
  - A server without the flag just returns the script again, which is the safe outcome.
- p3 adds the review's #2 Spanish rows to the app's Spanish table (Spanish is switched off; these are strings only):
  - emergency heading, button hint, status line and "Nothing was sent to AI"
  - all 12 "can't answer" messages, with their English read from PB_AI_MSG
  - fill-ins: "EMERGENCY · Call {n}" → "EMERGENCIA · Llamar al {n}", and any "… Emergency? Call 911." → "… ¿Emergencia? Llame al 911."
  - plus "Answered by the app · no AI used" and the new link
- p4 adds the interpreter line under "Lea esto al operador del 911". It shows only in Spanish.
- md5: index.src.html `6b583ebd975a9042966705a94e722b68`, build/index.html `ebf3ade729025652d657268b12db67fa`, build_hooks `aad0842d9d4f5129bf13f1ada2e535de`. The build is not stamped, so it stays r17.16; it is meant to stack on the next release.

## Tests (results in `results/`)
| Test | Result |
|---|---|
| `tests/cases.txt` via `tests/run_cases.mjs`: every phrase of both reviews, the old pos/neg lists and added must-fires and look-alikes, run on BOTH copies with script, language and full text compared | **191 must-fire all right (script + language), 126 must-not all quiet, 5 either; phone = server on every phrase** (`run_cases.txt`) |
| All 880 eval questions (ask_quality + ask_everyday case files), old vs new instant check | 4 changed, all intended: 2 sewer smells → space, "down in the trench shooting grade" and "ran over the lath" → Ask (`eval_hits.txt`) |
| Existing Ask Deno tests (tq: quality, consol, state, lib7/8, v24/25…) | base 83 pass / 1 fail; new 83 + my 4 = 87 pass / 1 fail. The 1 is `kb_next_test` (stale library count, fails on live too) |
| `ask_quality_nov22/app_patch/t_emergency_app.js` (the app's emergency test) on the patched page | all ok, 22 inline scripts parse |
| `tests/t_emergency_ui.js` (browser, built app): 8 instant scripts through the Ask box with nothing sent; "ran over the lath" goes to Ask; the link sends `not_emergency: true`; offline Spanish script; Spanish on: EMERGENCIA button, Spanish heading, status, link and offline message; dispatcher line shown only in Spanish; no page errors | **25/25 ok** |
| Free retrieval check (live library, build's own search): 700 core / 204 trench-811 / 113 cs / 7 / 127 text / 47 q / 51 reporting | **identical** to live: 650, 682 / 204 / 113 / 7 / 117 / 46, 47 / 51. Everyday review sets (live and staged library) identical |
| Review search probes (`search_probe_*.txt`: A ticket ×9, B off-topic state card ×12, D trench ×4, G Spanish ×3; raw and with keywords) | **base 12 / 48 → new 48 / 48** |
| Rank of the wanted card per eval case (`retrieval_rank_cmp.txt`) | 11 better, 2 worse (lib-or-spec-2 "grade rings", lib-ut-spec-2: the state spec card drops from first to 6th but is still handed); 13 cases go from the long state line to the short one, all federal/general questions with an off-topic state card |
| Full app regression on build_hooks | see "Regression" below |

## Apply order (lead)
1. **Server first, slot `next`.** Copy `build/b-cdddf51b34db.txt` → `data/ask/` and commit/push. Then `select net.http_get('<raw URL>')` and `select pb_ai.code_install('next', <req id>, 'cdddf51b34db5f48e5e4046b3475a0a5f0f7f45dd97a396dadf7f195d279ee0d', '<URL>')`.
   - Eval on next: the 148 core and the q3 check, plus these 10 by hand: "the boom touched the line", "the bucket hit the line", "smells like rotten eggs in the wet well", "le pegamos al gas", "se electrocutó", "Excavator ran over the lath, who resets it?", "What goes on a time and materials ticket?" (FL), "How much cover over the water line?" (OR), "How deep do we dig the trench for an 8 inch water main?" (OR), "¿Cómo leo una estaca de corte?".
   - Then install the same sha on `live`. Rollback: reinstall `1b8514750e72` (URL in ask_quality_nov22/promotion/PROMOTION.md).
   - This build has the empty overlay, so on `next` it reads the live library. The other helper's library load (ask_everyday_nov22) is independent and works with either build (checked: same scores).
2. **App, in the next release.** Stack p1–p4 after that release's patches (base anchor: the current emergency block = ask_quality emergency.ts). Then re-run `node tests/run_cases.mjs src_patch/emergency.ts <new index.src.html>` and `t_emergency_ui.js`.
   - Server first is better: an old server answers the "Send to Ask" tap with the script again (safe, just not useful).
   - The new app works with either server.

## Decisions for Tommy (recommendations)
1. **New line in the trench/confined-space emergency answer:** "Gas alarm, or a rotten-egg or sewer smell: everyone out now. Nobody goes back in until the air is tested and ventilated and the entry supervisor says so." This is the "stay out, test, ventilate" step for sewer gas, which the review asked for. **Recommend: yes.**
2. **A hit line nobody can identify** ("the bucket hit the line") gets one lead line, "treat it as a live power line until you know, and as a gas line if you smell or hear gas", then the power steps and the gas steps. It is long. **Recommend: yes.** It is safer than guessing, and it is never the CPR steps.
3. **"Not an emergency? Send to Ask"** under every instant emergency answer. **Recommend: yes.** A false alarm then costs one tap, so crews don't learn to ignore the emergency answer.
4. **The Spanish 911 interpreter line** (Spanish answers and under "Lea esto al operador del 911"). **Recommend: yes.** Have a Spanish-speaking crew member read it out loud, and ask your local 911 center how they handle Spanish callers.

## Not done / left open
- The "Mensaje al 911 (el mensaje va en inglés)" label (#19 extra) was not changed. The gas and power Spanish answers don't carry the interpreter line; the review asked for it on space and open only.
- The other English-only screens from the Spanish review (#3, #7, #14–16) are out of scope here.
- `glossary.ts` stake formula wording (everyday H) was not touched.
- The 811 `DEPENDS` list in state.ts still has "ticket (life|good|expire|valid)". It only matters with no job state and is harmless for T&M wording.

## Regression
(filled in below when the run finished)
