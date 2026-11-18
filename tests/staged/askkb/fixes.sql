-- fixes.sql: proposed Ask KB edits from the 2026-11-18 safety audit.
-- NOT APPLIED. Review /tmp/claude-0/audit/askkb/REVIEW.md first.
-- Each UPDATE edits pb_ai.kb_chunks.chunk->'text' for the active version only, and only if the old
-- phrase is still present (guarded by strpos), so re-running is harmless and a changed chunk is skipped.
-- Run inside one transaction; check each UPDATE reports 1 row.
-- A future KB rebuild from source (kb_add/*.py, seal_kb.py) must carry these edits too, as with the Nov 17 ones.

begin;

-- F01 [HIGH] chunk 272 (ca-cal-osha-trench-and-confined-3): Stale app-default sentence (CO 35) contradicts chunks 64/234/309/315/1511 (app uses CO 25).
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$The app's permit defaults (O2 19.5-23.5, LEL 10, H2S 10, CO 35) meet federal limits; a California company may set CO to 25 on the permit to match Cal/OSHA and should treat 15 ppm H2S as a 15-minute limit, not a working level.$old$, $new$The app's permit defaults (O2 19.5-23.5, LEL 10, H2S 10, CO 25) already use the Cal/OSHA CO limit everywhere; a company program may set stricter limits, and 15 ppm H2S is a 15-minute limit, not a working level.$new$)))
 where version = 'b3e91f6c47d2' and ord = 272
   and strpos(chunk->>'text', $old$The app's permit defaults (O2 19.5-23.5, LEL 10, H2S 10, CO 35) meet federal limits; a California company may set CO to 25 on the permit to match Cal/OSHA and should treat 15 ppm H2S as a 15-minute limit, not a working level.$old$) > 0;

-- F02 [HIGH] chunk 2443 (st-wa): No Washington trench rules anywhere in the KB: WA requires cave-in protection at 4 ft (WAC 296-155-657(1)(a)), and since June 1, 2026 a competent person on site during trench work plus a written trench work plan (WAC 296-155-655(13), WSR 26-09-113). The app already uses WA 4 ft.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$Excavation safety: Washington DOSH state plan (Department of Labor and Industries).$old$, $new$Excavation safety: Washington DOSH state plan (Department of Labor and Industries), chapter 296-155 WAC Part N. Washington is stricter than federal OSHA: a protective system is required at 4 ft deep, not 5 ft, unless the cut is entirely in stable rock or is under 4 ft and the competent person finds no sign of a potential cave-in (WAC 296-155-657(1)(a)). Since June 1, 2026 (WAC 296-155-655(13)), a competent person must stay on the job site whenever trench excavation work is going on, a written trench excavation work plan by the competent person must be on site for any trench a worker may enter that needs a protective system, and workers must be trained before entering such a trench. Ladders within 25 ft of travel at 4 ft deep, same as federal. Your competent person and company program decide how this applies on your job.$new$)))
 where version = 'b3e91f6c47d2' and ord = 2443
   and strpos(chunk->>'text', $old$Excavation safety: Washington DOSH state plan (Department of Labor and Industries).$old$) > 0;

-- F03 [HIGH] chunk 1912 (quick-reference-4): Quick reference states 5 ft as universal; wrong for Washington (4 ft). Add state note.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$Protective system required at 5 ft deep or more (unless stable rock), and in shallower trenches if a cave-in is possible.$old$, $new$Protective system required at 5 ft deep or more (unless stable rock), and in shallower trenches if a cave-in is possible; Washington requires it at 4 ft (WAC 296-155-657), and California also needs a Cal/OSHA permit at 5 ft (8 CCR 341).$new$)))
 where version = 'b3e91f6c47d2' and ord = 1912
   and strpos(chunk->>'text', $old$Protective system required at 5 ft deep or more (unless stable rock), and in shallower trenches if a cave-in is possible.$old$) > 0;

-- F04 [HIGH] chunk 1992 (trench-safety-1): Plain-language protective-system rule gives 5 ft with no state caveat; Washington is 4 ft.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$Never enter an unprotected trench 5 ft or deeper, and don't assume shallow trenches are safe.$old$, $new$Never enter an unprotected trench 5 ft or deeper (4 ft or deeper in Washington, WAC 296-155-657), and don't assume shallow trenches are safe. Some state plans are stricter than federal OSHA; your competent person and company program decide.$new$)))
 where version = 'b3e91f6c47d2' and ord = 1992
   and strpos(chunk->>'text', $old$Never enter an unprotected trench 5 ft or deeper, and don't assume shallow trenches are safe.$old$) > 0;

-- F05 [MEDIUM] chunk 381 (emp-ca-safety-6): Outdated definition: the over-24-hour hospitalization threshold was removed (AB 1805); now any inpatient hospitalization other than observation/diagnostic testing. Contradicts chunk 274.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$"Serious" is defined in 8 CCR 330(h): generally inpatient hospital care over 24 hours (not just observation), loss of a body part, or serious permanent disfigurement.$old$, $new$"Serious" is defined in Labor Code 6302(h) and 8 CCR 330(h): inpatient hospitalization of any length for other than medical observation or diagnostic testing, amputation, loss of an eye, or serious permanent disfigurement (the old over-24-hours test no longer applies).$new$)))
 where version = 'b3e91f6c47d2' and ord = 381
   and strpos(chunk->>'text', $old$"Serious" is defined in 8 CCR 330(h): generally inpatient hospital care over 24 hours (not just observation), loss of a body part, or serious permanent disfigurement.$old$) > 0;

-- F06 [MEDIUM] chunk 2002 (trench-safety-11): Reads as permission to dig after 24 h without locates, and misstates 1926.651(l) (walkways are required for any crossing; guardrails when the walkway is 6 ft or more above the lower level).
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$walkways with guardrails are needed where people cross excavations 6 ft or more deep (l); underground installations must be located before digging, and if the utility can't respond within 24 hours (or longer if state law says so), the employer may proceed with caution using detection equipment (b)(2);$old$, $new$walkways are required wherever people or equipment cross an excavation, with guardrails when the walkway is 6 ft or more above the lower level (l); underground installations must be located before digging (b)(2). OSHA's 24-hour clause in (b)(2) does not override your state one-call law: nearly every state requires a valid ticket, the full notice period and a response from every operator before machine digging, so the state law and your company program decide, not the OSHA clause;$new$)))
 where version = 'b3e91f6c47d2' and ord = 2002
   and strpos(chunk->>'text', $old$walkways with guardrails are needed where people cross excavations 6 ft or more deep (l); underground installations must be located before digging, and if the utility can't respond within 24 hours (or longer if state law says so), the employer may proceed with caution using detection equipment (b)(2);$old$) > 0;

-- F07 [MEDIUM] chunk 271 (ca-cal-osha-trench-and-confined-2): Ambiguous phrasing could be read as a competent person waiving protection at 5 ft or deeper.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$protective system at 5 ft unless stable rock or a competent person finds no cave-in potential below 5 ft;$old$, $new$protective system at 5 ft or deeper unless the cut is entirely in stable rock (a competent person can waive it only for a trench under 5 ft that shows no indication of a potential cave-in);$new$)))
 where version = 'b3e91f6c47d2' and ord = 271
   and strpos(chunk->>'text', $old$protective system at 5 ft unless stable rock or a competent person finds no cave-in potential below 5 ft;$old$) > 0;

-- F08 [MEDIUM] chunk 2370 (gb-2): Greenbook ladder extension of 2 ft conflicts with the OSHA/Cal/OSHA ladder rule (side rails at least 3 ft above the landing) stated in chunk 1998.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$Ladders (306-3.6): in trenches over 4 ft deep, every 50 ft, extending 2 ft above the trench, with no more than 25 ft of travel to a ladder.$old$, $new$Ladders (306-3.6): in trenches over 4 ft deep, every 50 ft, with no more than 25 ft of travel to a ladder. Check the extension height in your edition: the ladder safety rules (29 CFR 1926.1053(b)(1); Cal/OSHA 8 CCR 1675) require the side rails to extend at least 3 ft above the landing, so use 3 ft whatever the spec says.$new$)))
 where version = 'b3e91f6c47d2' and ord = 2370
   and strpos(chunk->>'text', $old$Ladders (306-3.6): in trenches over 4 ft deep, every 50 ft, extending 2 ft above the trench, with no more than 25 ft of travel to a ladder.$old$) > 0;

-- F09 [LOW] chunk 668 (equipment-rigging-3): Wire-rope removal criteria attributed to OSHA are ASME B30.9 criteria; OSHA 1926.251(c)(4)(iv) uses 10 percent of wires in 8 diameters.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$(OSHA's removal criteria include ten randomly distributed broken wires in one rope lay, or five broken wires in one strand in one lay)$old$, $new$(OSHA 1926.251(c)(4)(iv): out of service if broken wires exceed 10 percent of the total wires in any length of eight diameters; ASME B30.9 for slings: ten randomly distributed broken wires in one rope lay, or five in one strand in one lay)$new$)))
 where version = 'b3e91f6c47d2' and ord = 668
   and strpos(chunk->>'text', $old$(OSHA's removal criteria include ten randomly distributed broken wires in one rope lay, or five broken wires in one strand in one lay)$old$) > 0;

-- F10 [LOW] chunk 1912 (quick-reference-4): 20 ft engineer threshold worded differently across chunks (316/224 say deeper than 20 ft). Align wording.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$20 ft or deeper: system designed by a registered professional engineer.$old$, $new$Over 20 ft the rule requires a system designed by a registered professional engineer, and OSHA's guidance treats 20 ft and deeper the same way, so plan on an engineer at 20 ft.$new$)))
 where version = 'b3e91f6c47d2' and ord = 1912
   and strpos(chunk->>'text', $old$20 ft or deeper: system designed by a registered professional engineer.$old$) > 0;

-- F11 [LOW] chunk 316 (osha-appendix-b-c-d-in-words-1): Stale note: Table B-1 is now in the OSHA library (chunk 2655).
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$The table itself is not in the app's OSHA text (it is an image in the source); these values are a plain-language copy of the official table.$old$, $new$The OSHA library chunk for Appendix B (c) carries Table B-1 as text; this chunk is a plain-language copy of the official table, and the competent person picks the system.$new$)))
 where version = 'b3e91f6c47d2' and ord = 316
   and strpos(chunk->>'text', $old$The table itself is not in the app's OSHA text (it is an image in the source); these values are a plain-language copy of the official table.$old$) > 0;

-- F12 [LOW] chunk 322 (osha-appendix-b-c-d-in-words-7): Contradicts Appendix A and chunk 1994: angular gravel, silt, silt loam and sandy loam are Type B, not Type C.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$Granular soils (sand, gravel, silt that won't hold a thread) are Type C;$old$, $new$Granular soils such as gravel, sand and loamy sand are Type C (angular gravel, silt, silt loam and sandy loam can be Type B, so the competent person classifies them and treats doubtful soil as Type C);$new$)))
 where version = 'b3e91f6c47d2' and ord = 322
   and strpos(chunk->>'text', $old$Granular soils (sand, gravel, silt that won't hold a thread) are Type C;$old$) > 0;

-- F13 [LOW] chunk 972 (asphalt-paving-33): 85 dBA is the NIOSH REL / general-industry action level; the OSHA construction limit is 90 dBA (1926.52), as chunks 1442 and 1515 say.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$hearing protection is typically required near them (above 85 dBA).$old$, $new$hearing protection is needed near them (OSHA's construction limit is 90 dBA for 8 hours, 1926.52; NIOSH recommends 85 dBA).$new$)))
 where version = 'b3e91f6c47d2' and ord = 972
   and strpos(chunk->>'text', $old$hearing protection is typically required near them (above 85 dBA).$old$) > 0;

-- F14 [LOW] chunk 1500 (tools-power-support-9): Superlative "the strictest in the US" is not verifiable; say what is known.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$Cal/OSHA PEL 25 ppm, the strictest in the US$old$, $new$Cal/OSHA PEL 25 ppm, lower than federal OSHA and NIOSH$new$)))
 where version = 'b3e91f6c47d2' and ord = 1500
   and strpos(chunk->>'text', $old$Cal/OSHA PEL 25 ppm, the strictest in the US$old$) > 0;

-- F15 [LOW] chunk 309 (confined-space-field-numbers-1): Same unverifiable superlative.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$Cal/OSHA PEL 25 ppm, the strictest, which the app uses$old$, $new$Cal/OSHA PEL 25 ppm, lower than federal OSHA and NIOSH, which the app uses$new$)))
 where version = 'b3e91f6c47d2' and ord = 309
   and strpos(chunk->>'text', $old$Cal/OSHA PEL 25 ppm, the strictest, which the app uses$old$) > 0;

-- F16 [LOW] chunk 64 (app-howto-confined-space-2): Same unverifiable superlative (Nov 17 edit).
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$(the Cal/OSHA limit, the strictest in the US;$old$, $new$(the Cal/OSHA limit, lower than federal OSHA and NIOSH;$new$)))
 where version = 'b3e91f6c47d2' and ord = 64
   and strpos(chunk->>'text', $old$(the Cal/OSHA limit, the strictest in the US;$old$) > 0;

-- F17 [LOW] chunk 234 (app-data-other-reference-values-1): Same unverifiable superlative (Nov 17 edit).
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$(the Cal/OSHA limit, the strictest in the US;$old$, $new$(the Cal/OSHA limit, lower than federal OSHA and NIOSH;$new$)))
 where version = 'b3e91f6c47d2' and ord = 234
   and strpos(chunk->>'text', $old$(the Cal/OSHA limit, the strictest in the US;$old$) > 0;

-- F18 [LOW] chunk 721 (first_aid-28): 50 ft here vs 35 ft in chunk 301 for standing back from an energized machine; give one consistent answer.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$High-voltage: Mayo Clinic says stay at least 50 feet away, farther if wires are jumping or sparking;$old$, $new$High-voltage: stay well back: utility guidance says at least 35 ft and Mayo Clinic says at least 50 ft, so use 50 ft or more where you can, farther if wires are jumping or sparking;$new$)))
 where version = 'b3e91f6c47d2' and ord = 721
   and strpos(chunk->>'text', $old$High-voltage: Mayo Clinic says stay at least 50 feet away, farther if wires are jumping or sparking;$old$) > 0;

-- F19 [LOW] chunk 753 (first_aid-60): Federal-only reporting times; add the California 8-hour rule (8 CCR 342) because crews there will ask.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$States with their own OSHA plans may have extra rules.$old$, $new$States with their own OSHA plans may have extra rules: California requires any serious injury, illness or death to be reported to Cal/OSHA within 8 hours (8 CCR 342).$new$)))
 where version = 'b3e91f6c47d2' and ord = 753
   and strpos(chunk->>'text', $old$States with their own OSHA plans may have extra rules.$old$) > 0;

-- F20 [LOW] chunk 2383 (cal-1): 8 CCR 341 allows an annual or a project permit (chunk 270), not only annual.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$It's an annual permit, and the contractor also notifies the DOSH district office before starting each such job.$old$, $new$It is an annual permit or a one-job project permit; an annual permit holder also notifies the DOSH district office before starting each such job.$new$)))
 where version = 'b3e91f6c47d2' and ord = 2383
   and strpos(chunk->>'text', $old$It's an annual permit, and the contractor also notifies the DOSH district office before starting each such job.$old$) > 0;

-- F21 [LOW] chunk 718 (first_aid-25): IDLH values are NIOSH values, not OSHA.
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$OSHA lists 100 ppm as immediately dangerous to life and health.$old$, $new$NIOSH lists 100 ppm as immediately dangerous to life and health (IDLH).$new$)))
 where version = 'b3e91f6c47d2' and ord = 718
   and strpos(chunk->>'text', $old$OSHA lists 100 ppm as immediately dangerous to life and health.$old$) > 0;

-- F22 [LOW] chunk 2349 (loc-7): California tolerance zone is measured from the field marking (single mark = centerline), not always from an outside edge (Gov Code 4216(u)).
update pb_ai.kb_chunks
   set chunk = jsonb_set(chunk, '{text}', to_jsonb(replace(chunk->>'text', $old$the tolerance zone is 24 in on each side of the outside edge of the marked line, measured horizontally,$old$, $new$the tolerance zone is 24 in on each side of the field marking (from a single mark, treated as the centerline; from each outside edge mark when the width is shown), measured horizontally,$new$)))
 where version = 'b3e91f6c47d2' and ord = 2349
   and strpos(chunk->>'text', $old$the tolerance zone is 24 in on each side of the outside edge of the marked line, measured horizontally,$old$) > 0;

-- Invalidate the cached search-index blob so workers rebuild from rows, the same way the Nov 17 edits did:
-- pb_ai_kb_boot() only returns the blob when count(kb_index_parts) = kb_index.parts, so setting parts to 32
-- (more than the stored part rows) makes boot skip the blob. As of 2026-11-18 it is already 32 vs 2 stored rows,
-- but a worker may have re-saved a fresh blob before you run this, so set it again.
update pb_ai.kb_index set parts = 32 where version = 'b3e91f6c47d2';
-- Check: expect blob_used = false.
select i.parts, (select count(*) from pb_ai.kb_index_parts p where p.version = i.version) as stored_parts,
       (select count(*) from pb_ai.kb_index_parts p where p.version = i.version) = i.parts as blob_used
  from pb_ai.kb_index i where i.version = 'b3e91f6c47d2';

commit;
-- Note: warm Ask workers keep the index they already built in memory; edits reach answers as workers cold-start.
