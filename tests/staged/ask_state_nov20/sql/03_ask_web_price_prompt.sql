-- 03_ask_web_price_prompt.sql (ask_state_nov20, 2026-11-20). STAGED, NOT ON LIVE.
-- Why: since Nov 17 Ask answers "what is the current price of ..." with "call your supplier" and no web search (eval web1,
-- fails on the live build b4ad91749f6f too). The Ask prompt, the web tool and the excerpts are the same as on Nov 15 when it
-- searched, so the model's own choice moved; the prompt never named prices. This adds one paragraph that does.
-- How: appended to the prompt override row, the same way as the Nov 16 COL rule. Try it on the test function first
-- (name 'teacher_v2@next'), run the full eval, then run the same statement with name = 'teacher_v2' to put it live.
-- Guarded: does nothing if the paragraph is already there. Undo: the statement at the bottom.
update pb_ai.prompt_overrides
   set text = 'EDITS' || ((substr(text, 6))::jsonb || jsonb_build_array(jsonb_build_object('append', E'\n\nPRICES AND AVAILABILITY: the libraries and the app hold no prices. When they ask what something costs now (pipe, fittings, rock, a rental, a price per foot or per stick) or whether it is in stock, search the web before answering. Give the range you found in dollars, each with its source and how old the listing is, say it is not a quote, and tell them to get a quote from their supplier. Say you have no price only when the search finds none.')))::text,
       note = note || ' | Nov 20: prices and availability go to web search (eval web1)', updated_at = now()
 where name = 'teacher_v2@next' and text like 'EDITS[%' and text not like '%PRICES AND AVAILABILITY%';

-- Undo (takes the last appended paragraph off again):
-- update pb_ai.prompt_overrides set text = 'EDITS' || (((substr(text, 6))::jsonb) - -1)::text, updated_at = now()
--  where name = 'teacher_v2@next' and text like '%PRICES AND AVAILABILITY%';
