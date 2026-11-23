// messaging_nov22: company messages in the app (rig: fake server answers, see msgsrv.js; permissions are tested in SQL).
// Run: PB_URL=http://127.0.0.1:PORT/cur.html node t_msg.js   (page served from work/build_hooks). PASS/FAIL; exit 1 on any FAIL.
const R = '/home/claude/index.html-/tests/rig/';
const { chromium } = require('playwright'); const fs = require('fs');
const co = require(R + 'co'), mgr = require(R + 'mgr'), copl = require(R + 'co_pl'), F = require(R + 'flow'), SRV = require('./msgsrv');
const URL0 = process.env.PB_URL || 'http://127.0.0.1:18731/cur.html';
const OUT = process.env.PB_OUT || '/home/claude/index.html-/tests/staged/messaging_nov22/results/shots';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
const ME = '00000000-0000-4000-8000-000000000001', J1 = 'aaaaaaaa-0000-4000-8000-000000000001', D1 = 'aaaaaaaa-0000-4000-8000-000000000002';
const yellowish = (bg) => { const m = /rgba?\((\d+), (\d+), (\d+)/.exec(bg || ''); if (!m) return false; const [r, g, b] = [+m[1], +m[2], +m[3]]; return r > 200 && g > 150 && g < 215 && b < 90; };
const calls = (p, n) => p.evaluate((n) => window.__msgSrv.calls.filter((c) => c[0] === n).map((c) => c[1]), n);
async function boot(role, o = {}) {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: o.w || 360, height: o.h || 740 }, serviceWorkers: 'block', hasTouch: !!o.touch });
  let fsb = fs.readFileSync(R + 'fakesb.js', 'utf8');
  const A = "return res(typeof o==='function'?o(a):o===undefined?null:o);}";
  if (!fsb.includes(A)) throw new Error('fakesb changed');
  fsb = fsb.replace(A, "{const v=typeof o==='function'?o(a):o===undefined?null:o;if(v&&v.__error)return Promise.resolve({data:null,error:{message:v.__error}});return res(v);}}");
  await ctx.route(/supabase-js/, r => r.fulfill({ contentType: 'application/javascript', body: fsb }));
  await ctx.route(/supabase\.co/, r => r.fulfill({ status: 200, contentType: 'application/json', body: 'null' }));
  await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await require(R + 'env').applyClock(ctx);
  await ctx.addInitScript(role === 'pipelayer' ? copl : co);
  if (role === 'office') await ctx.addInitScript(mgr);
  if (role === 'removed') await ctx.addInitScript(`window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_prod_access:()=>({member:false,company_id:null,manager:false,role:null,server_at:new Date().toISOString()})});`);
  await ctx.addInitScript(SRV(role === 'removed' ? 'removed' : role));
  if (o.init) await ctx.addInitScript(o.init);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL0, { waitUntil: 'load' }); await p.waitForTimeout(o.wait || 10000);
  return { b, ctx, p, H: F(p) };
}
const size = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e || !e.offsetParent) return null; const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }, sel);
const shot = async (p, n) => { try { fs.mkdirSync(OUT, { recursive: true }); await p.screenshot({ path: OUT + '/' + n + '.png' }); } catch (e) {} };

(async () => {
  // ================= A: a foreman =================
  { const { b, ctx, p, H } = await boot('foreman');
    const card = await p.evaluate(() => { const c = document.getElementById('homeMsgCard'); const t = document.getElementById('homeMsgTile'); const n = document.getElementById('homeMsgCount');
      return { shown: !!c && !c.hidden && !!t && !!t.offsetParent, txt: t ? t.innerText.replace(/\s+/g, ' ') : '', n: n ? n.textContent : null, bg: n ? getComputedStyle(n).backgroundColor : '', h: t ? Math.round(t.getBoundingClientRect().height) : 0 }; });
    ok(card.shown && card.n === '2' && /Messages/.test(card.txt) && /Job 24-017/.test(card.txt), 'A1 Home: Messages card with the unread count 2 and the latest chat (' + JSON.stringify(card) + ')');
    ok(!yellowish(card.bg) && card.h >= 44, 'A2 the unread chip is not yellow; the card is 44 px or taller (' + card.bg + ', ' + card.h + ')');
    await shot(p, 'a_home');
    const tabs = await p.evaluate(() => document.querySelectorAll('#pbTabBar .pb-tab').length);
    await p.evaluate(() => pbMsgOpenList()); await p.waitForTimeout(1500);
    const list = await p.evaluate(() => ({ scr: [...document.querySelectorAll('.pb-screen.active')].map(x => x.id).join(), rows: [...document.querySelectorAll('#pbmList .pbm-row')].map(r => r.innerText.replace(/\s+/g, ' ')), tab: window.pbScreenTab('messages'), lit: (document.querySelector('#pbTabBar .pb-tab.active, #pbTabBar .pb-tab[aria-current="page"]') || {}).id || '' }));
    ok(list.scr === 'screen-messages' && list.rows.length === 2 && /Job 24-017/.test(list.rows[0]) && /Brandon Jones/.test(list.rows[1]), 'A3 Messages screen: job chat first (unread), then the direct message (' + JSON.stringify(list.rows) + ')');
    ok(tabs === 5 && list.tab === 'home', 'A4 no 6th tab: still 5 tabs, Messages sits under Home (' + tabs + ', ' + list.tab + ', lit ' + list.lit + ')');
    const rowH = await size(p, '#pbmList .pbm-row'); const newH = await size(p, '#pbmNewBtn');
    ok(rowH && rowH[1] >= 44 && newH && newH[1] >= 44 && newH[0] >= 44, 'A5 rows and New message are 44 px or more (' + JSON.stringify([rowH, newH]) + ')');
    await shot(p, 'a_list');
    await p.evaluate((id) => pbMsgOpenChat(id), J1); await p.waitForTimeout(1500);
    const chat = await p.evaluate(() => ({ title: document.getElementById('pbmChatTitle').textContent, ms: [...document.querySelectorAll('#pbmMsgs .pbm-m')].map(m => m.innerText.replace(/\s+/g, ' ')), send: (() => { const s = document.getElementById('pbmSend'); return { dis: s.disabled, bg: getComputedStyle(s).backgroundColor }; })() }));
    ok(chat.title === 'Job 24-017' && chat.ms.length === 3 && /Pipe truck at 7/.test(chat.ms[0]) && /Edited/.test(chat.ms[1]) && /Message deleted/.test(chat.ms[2]), 'A6 the chat: messages, "Edited", "Message deleted" (' + JSON.stringify(chat.ms) + ')');
    ok(chat.send.dis && !yellowish(chat.send.bg), 'A7 Send with nothing typed: disabled and NOT yellow (' + chat.send.bg + ')');
    const rd = await calls(p, 'pb_msg_read');
    ok(rd.length >= 1 && rd[0].p_chat === J1 && rd[0].p_seq === 3, 'A8 opening the chat marks it read up to the last message (' + JSON.stringify(rd) + ')');
    await p.fill('#pbmText', 'Grade at MH4 checks out'); await p.dispatchEvent('#pbmText', 'input'); await p.waitForTimeout(200);
    const s2 = await p.evaluate(() => { const s = document.getElementById('pbmSend'); return { dis: s.disabled, bg: getComputedStyle(s).backgroundColor }; });
    ok(!s2.dis && yellowish(s2.bg), 'A9 something typed: Send is the next step, solid yellow (' + s2.bg + ')');
    const sizes = { send: await size(p, '#pbmSend'), photo: await size(p, '#pbmPhotoBtn'), info: await size(p, '#pbmInfoBtn'), text: await size(p, '#pbmText') };
    ok(Object.values(sizes).every(v => v && v[0] >= 44 && v[1] >= 44) && sizes.text[0] >= 150, 'A10 gloves: Send, Photo, Info and the message box are 44 px or more; the box gets the room (' + JSON.stringify(sizes) + ')');
    const comp = await p.evaluate(() => { const c = document.getElementById('pbmCompose').getBoundingClientRect(), t = document.getElementById('pbTabBar').getBoundingClientRect(); return { cb: Math.round(c.bottom), tt: Math.round(t.top), vis: c.top < innerHeight }; });
    ok(comp.vis && comp.cb <= comp.tt + 1, 'A11 the message box sits above the tab bar, on screen (' + JSON.stringify(comp) + ')');
    await shot(p, 'a_chat');
    await p.click('#pbmSend'); await p.waitForTimeout(1500);
    const sent = await calls(p, 'pb_msg_send');
    const after = await p.evaluate(() => ({ out: window.__pbMsg().out.length, last: [...document.querySelectorAll('#pbmMsgs .pbm-m')].slice(-1)[0].innerText, box: document.getElementById('pbmText').value }));
    ok(sent.length === 1 && sent[0].p_body === 'Grade at MH4 checks out' && /^m[0-9a-f]{24}$/.test(sent[0].p_client_id) && sent[0].p_expect_uid === ME && after.out === 0 && /Grade at MH4/.test(after.last) && after.box === '',
      'A12 Send with signal: sent once with the phone\'s id, shown, box cleared (' + JSON.stringify(sent[0]) + ')');
    // ---- no signal: queued, shown, sent later with the time it was typed ----
    await ctx.setOffline(true); await p.waitForTimeout(500);
    await p.fill('#pbmText', 'Rock at 3+50, need the breaker'); await p.dispatchEvent('#pbmText', 'input'); await p.click('#pbmSend'); await p.waitForTimeout(1200);
    const off = await p.evaluate(() => ({ out: window.__pbMsg().out.map(o => ({ s: o.state, b: o.body })), wait: [...document.querySelectorAll('#pbmMsgs .pbm-m.wait')].map(m => m.innerText.replace(/\s+/g, ' ')), line: document.getElementById('pbmChatLine').textContent }));
    ok(off.out.length === 1 && off.out[0].s === 'waiting' && /Waiting for signal/.test(off.wait.join()) && /No signal/.test(off.line), 'A13 no signal: the message waits on the phone, shown "Waiting for signal" (' + JSON.stringify(off) + ')');
    const n0 = (await calls(p, 'pb_msg_send')).length;
    await p.evaluate(() => pbGoto('home')); await p.waitForTimeout(800);
    const hsub = await p.evaluate(() => (document.getElementById('homeMsgSub') || {}).textContent || '');
    ok(/1 message waiting for signal/.test(hsub) && n0 === 1, 'A14 Home says "1 message waiting for signal"; nothing was sent offline (' + hsub + ')');
    const stored = await p.evaluate(async () => { const r = await new Promise((res) => { const q = indexedDB.open('pbBig'); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); const ls = Object.keys(localStorage).filter(k => /pbMsgOut/.test(k)); return { ls, idb: !!r }; });
    ok(stored.ls.length >= 1, 'A15 the outbox is saved on the phone (records storage: ' + JSON.stringify(stored) + ')');
    await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(5000);
    const late = await calls(p, 'pb_msg_send');
    const q = await p.evaluate(() => window.__pbMsg().out.length);
    ok(late.length === 2 && late[1].p_body === 'Rock at 3+50, need the breaker' && Date.parse(late[1].p_phone_at) < Date.now() - 3000 && q === 0, 'A16 signal back: sent by itself, with the time it was typed (' + (late[1] && late[1].p_phone_at) + '), outbox empty');
    // ---- the phone closed with a message waiting: still there after a restart, sent once ----
    await p.evaluate(() => { window.__msgSrv.fail.pb_msg_send = 'TypeError: Failed to fetch'; });
    await p.evaluate((id) => pbMsgOpenChat(id), J1); await p.waitForTimeout(800);
    await p.fill('#pbmText', 'Inspector at 2'); await p.dispatchEvent('#pbmText', 'input'); await p.click('#pbmSend'); await p.waitForTimeout(1500);
    const cid = await p.evaluate(() => (window.__pbMsg().out[0] || {}).cid);
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(13000);
    const rs = await calls(p, 'pb_msg_send');
    ok(!!cid && rs.length >= 1 && rs[rs.length - 1].p_client_id === cid && rs[rs.length - 1].p_body === 'Inspector at 2', 'A17 a message waiting when the app was closed is still there after a restart and is sent with the same id (' + cid + ')');
    // ---- a photo: resized like run photos, uploaded to the chat folder first, then named in the message ----
    await p.evaluate((id) => pbMsgOpenChat(id), J1); await p.waitForTimeout(1000);
    await p.setInputFiles('#pbmPhotoIn', [H.img('p12')]); await p.waitForTimeout(1500);
    const th = await p.evaluate(() => document.querySelectorAll('#pbmThumbs img').length);
    const sendBg = await p.evaluate(() => getComputedStyle(document.getElementById('pbmSend')).backgroundColor);
    await p.click('#pbmSend'); await p.waitForTimeout(2500);
    const ps = (await calls(p, 'pb_msg_send')).slice(-1)[0] || {};
    const up = await p.evaluate(async () => { const k = Object.keys(window.__uploads || {}).filter(x => /^msg-photos\//.test(x)); if (!k.length) return null; const bl = window.__uploads[k[0]]; const bm = await createImageBitmap(bl); return { k: k[0], bytes: bl.size, w: bm.width, h: bm.height, type: bl.type }; });
    ok(th === 1 && yellowish(sendBg), 'A18 a photo picked: thumbnail shown, Send ready (yellow)');
    ok(!!up && /^msg-photos\/11111111-1111-4111-8111-111111111111\/aaaaaaaa-0000-4000-8000-000000000001\/00000000-0000-4000-8000-000000000001\/m[0-9a-f]{24}-1\.jpg$/.test(up.k) && Math.max(up.w, up.h) <= 900 && up.type === 'image/jpeg' && up.bytes < 400000,
      'A19 uploaded to <company>/<chat>/<me>/<id>-1.jpg, longest side <= 900 px JPEG (' + JSON.stringify(up) + ')');
    ok(ps.p_photos && ps.p_photos.length === 1 && 'msg-photos/' + ps.p_photos[0].path === (up && up.k) && ps.p_body === null, 'A20 the message names that photo (' + JSON.stringify(ps.p_photos) + ')');
    // ---- foreman's Info: read-only pipelayer line, no switch, no archive; Mute is his ----
    await p.evaluate(() => pbMsgOpenInfo()); await p.waitForTimeout(1500);
    const inf = await p.evaluate(() => ({ sw: !!document.getElementById('pbmIncl'), txt: document.getElementById('pbmInfoBody').innerText.replace(/\s+/g, ' '), mute: !!document.getElementById('pbmMute'), arch: /Save archive now/.test(document.getElementById('pbmInfoBody').innerText) }));
    ok(!inf.sw && /Pipelayers are not in this chat/.test(inf.txt) && inf.mute && !inf.arch && /Everyone assigned to this job is in, with the company account and managers/.test(inf.txt), 'A21 a foreman\'s Info: who is in (assigned), the pipelayer setting (no switch), Mute, no archive tools');
    await p.click('#pbmMute'); await p.waitForTimeout(1200);
    const mu = await calls(p, 'pb_msg_mute');
    ok(mu.length === 1 && mu[0].p_muted === true && mu[0].p_chat === J1, 'A22 Mute this chat goes to the server for this person (' + JSON.stringify(mu) + ')');
    await shot(p, 'a_info_foreman');
    // ---- an alert opens its chat ----
    await p.evaluate(() => pbGoto('home')); await p.waitForTimeout(500);
    await p.evaluate((id) => window.pbPushOpen('#/messages/' + id), D1); await p.waitForTimeout(2500);
    const po = await p.evaluate(() => ({ scr: [...document.querySelectorAll('.pb-screen.active')].map(x => x.id).join(), t: document.getElementById('pbmChatTitle').textContent }));
    ok(po.scr === 'screen-msgChat' && po.t === 'Brandon Jones', 'A23 tapping a message alert (#/messages/<chat>) opens that chat (' + JSON.stringify(po) + ')');
    const dmn = await p.evaluate(() => { const n = document.getElementById('pbmDmNote'); return n && !n.hidden && n.offsetParent ? n.textContent : ''; });
    ok(dmn === 'Direct messages are company records.', 'A23b a direct message thread says at the top: "Direct messages are company records." (' + dmn + ')');
    // ---- edit own message (24 h) ----
    await p.evaluate((id) => pbMsgOpenChat(id), J1); await p.waitForTimeout(1500);
    const mine = await p.evaluate(() => { const b = [...document.querySelectorAll('#pbmMsgs .pbm-m.mine .more')]; return b.length ? +b[0].dataset.seq : null; });
    await p.evaluate((s) => pbMsgMore(s), mine); await p.waitForTimeout(400);
    const moreSz = await size(p, '#pbmMsgs .pbm-m.mine .more');
    ok(moreSz && moreSz[0] >= 44 && moreSz[1] >= 44, 'A10b message options (on your own message) are 44 x 44 or more (' + JSON.stringify(moreSz) + ')');
    const mb = await H.modalBtns(); await H.modalClick('Edit'); await p.waitForTimeout(300);
    const ed = await p.evaluate(() => ({ v: document.getElementById('pbmText').value, l: document.getElementById('pbmSend').textContent, e: !document.getElementById('pbmEditing').hidden }));
    await p.fill('#pbmText', 'Grade at MH4 checks out (0.02 high)'); await p.dispatchEvent('#pbmText', 'input'); await p.click('#pbmSend'); await p.waitForTimeout(1500);
    const ec = await calls(p, 'pb_msg_edit'); const edited = await p.evaluate(() => [...document.querySelectorAll('#pbmMsgs .pbm-m.mine')].map(m => m.innerText.replace(/\s+/g, ' ')).join(' | '));
    ok(mb.includes('Edit') && mb.includes('Delete') && ed.e && ed.l === 'Save' && ec.length === 1 && /0\.02 high/.test(edited) && /Edited/.test(edited), 'A24 edit own message: Edit/Delete offered, saved with signal, shows Edited (' + JSON.stringify(mb) + ')');
    // ---- Spanish: every new string the screens show has Spanish ----
    const es = await p.evaluate(() => { const d = JSON.parse(document.getElementById('pbI18nDict').textContent).t; const miss = [];
      const want = new Set(); ['screen-messages', 'screen-msgChat', 'screen-msgInfo', 'screen-msgSettings'].forEach(id => { const w = document.createTreeWalker(document.getElementById(id), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (n.parentElement.closest('[data-noi18n],script,style')) continue; const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t && /[A-Za-z]/.test(t)) want.add(t); } });
      const P = JSON.parse(document.getElementById('pbI18nDict').textContent).p.map(x => { try { return new RegExp(x[0]); } catch (e) { return null; } }).filter(Boolean);
      want.forEach(t => { if (!(t in d) && !P.some(re => re.test(t))) miss.push(t); }); return { n: want.size, miss: miss.slice(0, 12) }; });
    ok(es.miss.length === 0 && es.n > 20, 'A25 Spanish: every text on the 4 message screens is in the dictionary (' + es.n + ' texts; missing ' + JSON.stringify(es.miss) + ')');
    ok(p.errs.length === 0, 'A26 no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
    await b.close(); }

  // ================= B: the office (company account) =================
  { const { b, p, H } = await boot('office');
    const card = await p.evaluate(() => { const t = document.getElementById('homeMsgTile'); return !!t && !!t.offsetParent; });
    ok(card, 'B1 the company Home shows the Messages card too');
    await p.evaluate(() => pbMsgOpenList()); await p.waitForTimeout(1200);
    await p.evaluate((id) => pbMsgOpenChat(id), J1); await p.waitForTimeout(1200);
    const line = await p.evaluate(() => document.getElementById('pbmChatLine').textContent);
    ok(/Pipelayers are not in this chat/.test(line), 'B2 the office is told pipelayers are not in the chat (' + line + ')');
    await p.evaluate(() => pbMsgOpenInfo()); await p.waitForTimeout(1500);
    const i0 = await p.evaluate(() => ({ sw: (() => { const s = document.getElementById('pbmIncl'); return s ? { on: s.checked } : null; })(), hist: /Pipelayers see/.test(document.getElementById('pbmInfoBody').innerText), arch: [...document.querySelectorAll('#pbmInfoBody button')].map(x => x.textContent.trim()) }));
    ok((await p.evaluate(() => { const n = document.getElementById('pbmDmNote'); return !n || n.hidden; })), 'B2b no "company records" line on a job chat');
    ok(i0.sw && i0.sw.on === false && !i0.hist, 'B3 the office sees "Include pipelayers" OFF (default), no history choice yet (' + JSON.stringify(i0.sw) + ')');
    ok(i0.arch.includes('Download') && i0.arch.includes('Save archive now') && i0.arch.includes('Close chat') && i0.arch.includes('Add a person') && i0.arch.includes('Take off'), 'B4 office tools: Download, Save archive now, Close chat, Add a person, Take off (' + JSON.stringify(i0.arch) + ')');
    const swH = await size(p, 'label[for="pbmIncl"]');
    ok(swH && swH[1] >= 44, 'B5 the switch row is 44 px or taller (' + JSON.stringify(swH) + ')');
    await shot(p, 'b_info_off');
    await p.click('label[for="pbmIncl"]'); await p.waitForTimeout(1800);
    const st = await calls(p, 'pb_msg_set');
    const i1 = await p.evaluate(() => ({ on: document.getElementById('pbmIncl').checked, hist: [...document.querySelectorAll('#pbmInfoBody .pb-toggle button')].map(x => x.textContent.trim() + ':' + x.getAttribute('aria-pressed')), log: document.querySelector('.pbm-log') ? document.querySelector('.pbm-log').innerText : '' }));
    ok(st.length === 1 && st[0].p_include_pipelayers === true && st[0].p_pipelayer_history === 'from_added' && i1.on, 'B6 turning it on goes to the server (history stays "from when added") (' + JSON.stringify(st[0]) + ')');
    ok(i1.hist.join() === 'From when added:true,Whole chat:false', 'B7 then "Pipelayers see: From when added / Whole chat" shows, From when added chosen (' + i1.hist.join() + ')');
    ok(/Tommy Fontaine turned Include pipelayers on/.test(i1.log), 'B8 the change shows in the log with who and when (' + i1.log.slice(0, 80) + ')');
    await p.evaluate(() => pbMsgSetHist('all')); await p.waitForTimeout(1500);
    const st2 = (await calls(p, 'pb_msg_set')).slice(-1)[0];
    const log2 = await p.evaluate(() => document.querySelector('.pbm-log').innerText);
    ok(st2.p_pipelayer_history === 'all' && st2.p_include_pipelayers === true && /set Pipelayers see: Whole chat/.test(log2), 'B9 Whole chat chosen, logged (' + JSON.stringify(st2) + ')');
    await shot(p, 'b_info_on');
    await p.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
    await p.evaluate(() => { const b = [...document.querySelectorAll('#pbmInfoBody button')].find(x => x.textContent.trim() === 'Download'); b.click(); }); await p.waitForTimeout(1200);
    const dl = await calls(p, 'pb_msg_archive_download');
    ok(dl.length === 1 && dl[0].p_archive === 'ar1' && /x-Job-24-017-chat\.zip$/.test(dl[0].p_path), 'B9b Download asks the server first (logged), with the archive and file (' + JSON.stringify(dl) + ')');
    await p.evaluate(() => { window.__msgSrv.rule = { pms: 'all', foremen: 'worked' }; }); await p.evaluate(() => pbMsgOpenInfo()); await p.waitForTimeout(1500);
    const who = await p.evaluate(() => (document.getElementById('pbmWho') || {}).textContent || '');
    ok(/Nobody is assigned to this job, so the foremen who worked it in the last 120 days are in\./.test(who) && /No PM or super is assigned to this job, so every PM and super is in\./.test(who), 'B9c nobody assigned: Chat info says the fallback (' + who + ')');
    await p.evaluate(() => { window.__msgSrv.rule = { pms: 'assigned', foremen: 'linked' }; }); await p.evaluate(() => pbMsgOpenInfo()); await p.waitForTimeout(1500);
    const who2 = await p.evaluate(() => (document.getElementById('pbmWho') || {}).textContent || '');
    ok(/No foremen are listed on the job page, so foremen with open inspections, crew runs or dailies on this job are in\./.test(who2) && /The PMs and supers assigned to this job are in\./.test(who2), 'B9d no Foremen list on the job page: Chat info says the older signs let foremen in (foremen_job_nov23) (' + who2 + ')');
    await p.evaluate(() => { window.__msgSrv.rule = { pms: 'assigned', foremen: 'assigned' }; }); await p.evaluate(() => pbMsgOpenInfo()); await p.waitForTimeout(1500);
    const who3 = await p.evaluate(() => (document.getElementById('pbmWho') || {}).textContent || '');
    ok(/^Everyone assigned to this job is in, with the company account and managers\.$/.test(who3), 'B9e foremen and PMs both assigned: one line (' + who3 + ')');
    // the yellow rule on Info: no solid yellow anywhere (nothing waiting for a decision)
    const yel = await p.evaluate(() => [...document.querySelectorAll('#screen-msgInfo *')].filter(e => e.offsetParent && /rgb\((24[0-9]|25[0-5]), (1[7-9][0-9]|20[0-9]), ([0-8]?[0-9])\)/.test(getComputedStyle(e).backgroundColor)).map(e => e.tagName + '.' + e.className + ':' + e.textContent.trim().slice(0, 20)));
    ok(yel.filter(x => !/pb-fb-pill/.test(x)).length === 0, 'B10 the yellow rule: nothing decorative in yellow on Info (' + JSON.stringify(yel.slice(0, 4)) + ')');
    // Close chat asks first
    await p.evaluate(() => pbMsgClose(true)); await p.waitForTimeout(400);
    const cm = await H.modal(); await H.modalClick('Keep Open'); await p.waitForTimeout(300);
    ok(/Close this chat\?/.test(cm || '') && (await calls(p, 'pb_msg_close')).length === 0, 'B11 Close chat asks first; Keep Open does nothing');
    await p.evaluate(() => pbMsgOpenList()); await p.waitForTimeout(1200);
    const drb = await p.evaluate(() => { const b = document.getElementById('pbmDmRecBtn'); return !!b && !b.hidden && !!b.offsetParent; });
    await p.evaluate(() => pbMsgDmRecords()); await p.waitForTimeout(1200);
    const drt = await p.evaluate(() => document.getElementById('pbmDmRec').innerText.replace(/\s+/g, ' '));
    ok(drb && /Mike Ruiz · Luis Ortega/.test(drt) && /Download/.test(drt) && /Save archive/.test(drt) && /cannot read it here/.test(drt), 'B10b the company account: "Direct messages (company records)" lists threads by names and counts with Save archive / Download (' + drt.slice(0, 120) + ')');
    await p.evaluate(() => { const b = [...document.querySelectorAll('#pbmDmRec button')].find(x => x.textContent.trim() === 'Download'); b.click(); }); await p.waitForTimeout(1200);
    const dl2 = (await calls(p, 'pb_msg_archive_download')).slice(-1)[0] || {};
    ok(dl2.p_archive === 'ar9', 'B10c a direct-message download is logged first too (' + JSON.stringify(dl2) + ')');
    // message settings: quiet hours defaults, retention for the company account
    await p.evaluate(() => pbMsgOpenSettings()); await p.waitForTimeout(1500);
    const ms = await p.evaluate(() => ({ f: document.getElementById('pbmQuietFrom').value, t: document.getElementById('pbmQuietTo').value, q: document.getElementById('pbmPrefQuiet').checked, ret: !document.getElementById('pbmRetSection').hidden, sel: (document.querySelector('#pbmRetToggle button.active') || {}).textContent }));
    ok(ms.f === '19:00' && ms.t === '06:00' && ms.q && ms.ret && ms.sel === 'Forever', 'B12 settings: quiet hours on, 7 PM to 6 AM; Keep messages: Forever (company account) (' + JSON.stringify(ms) + ')');
    await p.fill('#pbmQuietFrom', '21:00'); await p.dispatchEvent('#pbmQuietFrom', 'change'); await p.waitForTimeout(1800);
    const pr = (await calls(p, 'pb_msg_prefs_set')).slice(-1)[0];
    ok(pr && pr.p_quiet_from === '21:00' && pr.p_quiet_to === '06:00' && pr.p_quiet_on === true, 'B13 changing quiet hours saves them (' + JSON.stringify(pr) + ')');
    await p.evaluate(() => pbMsgRetention('13m')); await p.waitForTimeout(400);
    const rm = await H.modal(); await H.modalClick('Delete After 13 Months'); await p.waitForTimeout(1500);
    const rc = (await calls(p, 'pb_msg_company_set')).slice(-1)[0];
    ok(/after 13 months\?/.test(rm || '') && rc && rc.p_retention === '13m', 'B14 Delete after 13 months asks first, then saves for the company');
    await shot(p, 'b_settings');
    // Settings has the Messages row
    await p.evaluate(() => pbOpenSettings()); await p.waitForTimeout(800);
    const row = await p.evaluate(() => { const b = document.getElementById('settingsMsgBtn'); return !!b && !b.hidden && !!b.offsetParent; });
    ok(row, 'B15 Settings > Notifications has a Messages row');
    ok(p.errs.length === 0, 'B16 no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
    await b.close(); }

  // ================= C: a pipelayer, and someone removed =================
  { const { b, p, H } = await boot('pipelayer');
    await p.evaluate(() => pbMsgOpenList()); await p.waitForTimeout(1500);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#pbmList .pbm-row')].map(r => r.innerText.replace(/\s+/g, ' ')));
    ok(await p.evaluate(() => { const b = document.getElementById('pbmDmRecBtn'); return !b || b.hidden; }), 'C0 only the company account sees "Direct messages (company records)"');
    ok(rows.length === 1 && /Brandon Jones/.test(rows[0]), 'C1 a pipelayer (job chat not including pipelayers) sees only the direct message (' + JSON.stringify(rows) + ')');
    await p.evaluate(() => pbMsgNewToggle(true)); await p.waitForTimeout(1500);
    await p.evaluate(() => pbMsgOpenJob('24-020')); await p.waitForTimeout(1500);
    const m = await H.modal();
    ok(/Only the office or a foreman assigned to this job can start its chat/.test(m || ''), 'C2 a pipelayer cannot start a job chat: told plainly (' + (m || '').slice(0, 80) + ')');
    if (m) await H.modalClick('OK');
    await p.evaluate(() => pbMsgOpenDm('u9', 'Luis Ortega')); await p.waitForTimeout(1500);
    const t = await p.evaluate(() => document.getElementById('pbmChatTitle').textContent);
    ok(t === 'Luis Ortega', 'C3 a pipelayer can message anyone in the company directly (' + t + ')');
    ok(p.errs.length === 0, 'C4 no page errors (' + p.errs.slice(0, 2).join(' | ') + ')');
    await b.close(); }
  { const { b, p } = await boot('removed');
    const card = await p.evaluate(() => { const c = document.getElementById('homeMsgCard'); return !!c && !c.hidden; });
    const row = await p.evaluate(() => { const b = document.getElementById('settingsMsgBtn'); return !!b && !b.hidden; });
    ok(!card && !row, 'C5 not in a company (or removed): no Messages card, no Settings row');
    await b.close(); }

  console.log(fails ? 'RESULT: FAIL ' + fails : 'RESULT: all pass');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log('FAIL crashed: ' + (e && e.stack || e)); process.exit(1); });
