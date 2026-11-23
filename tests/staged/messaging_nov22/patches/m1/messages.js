  // ================= messaging_nov22: company messages (job chats + direct messages) =================
  // Tommy (Nov 22): "internal company messages so people can talk about things directly". Server: pb_msg_* (staged
  // messaging_nov22/sql). Everyone in a company sees the Home card; the server decides who is in which chat.
  // Phone copy: the chat list and the last 200 messages of the 40 latest chats (pbMsgStore), and the message outbox
  // (pbMsgOut, typed with no signal; photos inside). Both are per-account keys kept in IndexedDB like Records.
  const PB_MSG_STORE = 'pbMsgStore', PB_MSG_OUT = 'pbMsgOut';
  const PB_MSG_KEEP_CHATS = 40, PB_MSG_KEEP_MSGS = 200, PB_MSG_KEEP_PHOTOS = 60;
  const PB_MSG_REFUSED = { 'pb:not_in_chat': 'you are not in this chat any more', 'pb:chat_closed': 'the office closed this chat', 'pb:company_inactive': 'the company account is not active',
    'pb:other_left': 'that person is no longer with the company', 'pb:empty': 'it was empty', 'pb:too_long': 'it is too long', 'pb:bad_photo': 'a photo could not be read',
    'pb:not_company_member': 'you are not in a company', 'pb:bad_job': 'that job number could not be read', 'pb:bad_id': 'it could not be read' };
  let pbMsg = { uid: null, list: null, chats: {}, photos: {}, out: [], at: 0, loaded: false, busy: false, flushBusy: false, cur: null, info: null, people: null, jobs: null, draftPhotos: [], editing: null, pendingOpen: null, pollT: null, older: false };
  const pbMsgEsc = (s) => escapeHtml(String(s == null ? '' : s));
  const pbMsgEl = (id) => document.getElementById(id);
  function pbMsgUid() { const u = pbArchiveOwnerUid; return u && u !== 'shared' ? u : null; }
  // shown only once the server has said this account is in a company with Messages (pb_msg_list; the phone keeps the answer,
  // so it shows offline too). Before the server part is applied, or for someone not in a company: nothing shows.
  function pbMsgInCompany(uid) { return !!(uid && pbMsg.uid === uid && pbMsg.list && pbMsg.list.member === true && !pbMsg.list.missing); }
  function pbMsgMayAsk(uid) { const a = uid ? pbProdAccMem.get(uid) : null; return !!((a && (a.member || a.manager)) || pbMsgInCompany(uid)); }
  async function pbMsgCanAsk(uid) { try { return !!uid && pbAuthBackgroundOk() && (await pbDlyCanAsk(uid)); } catch (e) { return false; } }
  function pbMsgCode(r) { const m = String((r && r.error && (r.error.message || r.error.code)) || ''); return (m.match(/pb:\w+/) || [''])[0]; }
  function pbMsgNet(r) { const m = String((r && r.error && r.error.message) || ''); return navigator.onLine === false || /failed to fetch|networkerror|load failed|no client|timeout|no answer/i.test(m); }
  function pbMsgRid() { const a = new Uint8Array(12); try { crypto.getRandomValues(a); } catch (e) { for (let i = 0; i < 12; i++) a[i] = (Math.random() * 256) | 0; } return 'm' + Array.from(a, (b) => b.toString(16).padStart(2, '0')).join(''); }
  function pbMsgTime(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const now = new Date(), same = d.toDateString() === now.toDateString();
    return same ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  // ---- the phone's copy ----
  async function pbMsgLoad(uid) {
    if (pbMsg.uid === uid && pbMsg.loaded) return;
    pbMsg = Object.assign({}, pbMsg, { uid, list: null, chats: {}, photos: {}, out: [], at: 0, loaded: false, cur: null, info: null, people: null, jobs: null, draftPhotos: [], editing: null });
    try { const o = JSON.parse((await pbGetFor(uid, PB_MSG_STORE)) || 'null'); if (o && typeof o === 'object' && pbMsg.uid === uid) { pbMsg.list = o.list || null; pbMsg.chats = o.chats || {}; pbMsg.photos = o.photos || {}; pbMsg.people = o.people || null; pbMsg.jobs = o.jobs || null; } } catch (e) {}
    try { const q = JSON.parse((await pbGetFor(uid, PB_MSG_OUT)) || '[]'); if (Array.isArray(q) && pbMsg.uid === uid) pbMsg.out = q.filter((x) => x && x.cid); } catch (e) {}
    if (pbMsg.uid === uid) pbMsg.loaded = true;
  }
  let pbMsgSaveT = null;
  function pbMsgSave() {
    const uid = pbMsg.uid; if (!uid) return;
    clearTimeout(pbMsgSaveT);
    pbMsgSaveT = setTimeout(() => {
      if (pbMsg.uid !== uid) return;
      const ids = Object.keys(pbMsg.chats).sort((a, b) => String((pbMsg.chats[b].chat || {}).last_at || '').localeCompare(String((pbMsg.chats[a].chat || {}).last_at || ''))).slice(0, PB_MSG_KEEP_CHATS);
      const chats = {}; ids.forEach((id) => { const c = pbMsg.chats[id]; chats[id] = { chat: c.chat, msgs: (c.msgs || []).slice(-PB_MSG_KEEP_MSGS), canPost: c.canPost, whyNot: c.whyNot }; });
      const pk = Object.keys(pbMsg.photos); const photos = {}; pk.slice(-PB_MSG_KEEP_PHOTOS).forEach((k) => { photos[k] = pbMsg.photos[k]; });
      pbMsg.photos = photos;
      pbSetFor(uid, PB_MSG_STORE, JSON.stringify({ v: 1, at: Date.now(), list: pbMsg.list, chats, photos, people: pbMsg.people, jobs: pbMsg.jobs })).catch(() => {});
    }, 400);
  }
  async function pbMsgSaveOut() { const uid = pbMsg.uid; if (!uid) return false; try { return await pbSetFor(uid, PB_MSG_OUT, JSON.stringify(pbMsg.out)); } catch (e) { return false; } }
  // ---- the list ----
  async function pbMsgRefresh(force) {
    const uid = pbMsgUid(); if (!uid) return;
    await pbMsgLoad(uid);
    if (pbMsg.busy || (!force && pbMsg.at && Date.now() - pbMsg.at < 20000)) return;
    if (!pbMsgMayAsk(uid)) { pbMsgPaintAll(); return; } // an individual account: no company, no messages, no call
    if (!(await pbMsgCanAsk(uid))) { pbMsgPaintAll(); return; }
    pbMsg.busy = true; let r = null;
    try { r = await pbPermitRpc('pb_msg_list', { p_expect_uid: uid }, 20000); } catch (e) { r = null; }
    pbMsg.busy = false;
    if (pbMsg.uid !== uid) return;
    if (r && !r.error && r.data && r.data.ok) {
      pbMsg.list = r.data; pbMsg.at = Date.now();
      (r.data.chats || []).forEach((c) => { const x = pbMsg.chats[c.id] || (pbMsg.chats[c.id] = { msgs: [] }); x.chat = c; });
      const keep = new Set((r.data.chats || []).map((c) => c.id)); Object.keys(pbMsg.chats).forEach((id) => { if (!keep.has(id)) delete pbMsg.chats[id]; }); // a chat no longer ours leaves the phone too
      pbMsgSave();
    } else if (r && /PGRST202|42883|Could not find the function/i.test(String((r.error && (r.error.code + ' ' + r.error.message)) || ''))) {
      pbMsg.list = { ok: true, member: false, chats: [], missing: true }; pbMsg.at = Date.now();
    }
    pbMsgPaintAll();
    pbMsgFlush();
  }
  function pbMsgChats() { return pbMsg.list && Array.isArray(pbMsg.list.chats) ? pbMsg.list.chats.map((c) => (pbMsg.chats[c.id] && pbMsg.chats[c.id].chat) || c) : []; }
  function pbMsgUnread() { return pbMsgChats().reduce((n, c) => n + (c.muted ? 0 : Math.max(0, +c.unread || 0)), 0); }
  function pbMsgPaintAll() {
    try { pbMsgPaintHome(); } catch (e) { console.error(e); }
    try { if (pbCurrentScreen === 'messages') pbMsgPaintList(); } catch (e) { console.error(e); }
    try { if (pbCurrentScreen === 'msgChat') pbMsgPaintChat(); } catch (e) { console.error(e); }
    try { const b = pbMsgEl('settingsMsgBtn'); if (b) b.hidden = !pbMsgInCompany(pbMsgUid()); } catch (e) {}
  }
  function pbMsgPreview(c) {
    const l = c && c.last; if (!l) return 'No messages yet';
    const who = l.mine ? 'You' : String(l.author_name || '').split(' ')[0];
    const t = l.deleted ? 'Message deleted' : (l.preview || (l.photos ? (l.photos > 1 ? l.photos + ' photos' : 'Photo') : ''));
    return (c.kind === 'job' || l.mine ? who + ': ' : '') + t;
  }
  function pbMsgPaintHome() {
    const el = pbMsgEl('homeMsgCard'); if (!el) return;
    const uid = pbMsgUid();
    if (!uid || !pbMsgInCompany(uid)) { el.hidden = true; el.innerHTML = ''; return; }
    const n = pbMsgUnread(), waiting = pbMsg.out.filter((x) => x.state !== 'refused').length;
    const top = pbMsgChats().filter((c) => (+c.unread || 0) > 0 && !c.muted)[0];
    const sub = waiting ? waiting + (waiting === 1 ? ' message waiting for signal' : ' messages waiting for signal')
      : top ? top.title + ' · ' + pbMsgPreview(top) : n ? '' : 'Job chats and direct messages';
    el.hidden = false;
    el.innerHTML = '<div class="pb-home-tile" role="button" tabindex="0" data-pb-a11y-btn="1" id="homeMsgTile" onclick="pbMsgOpenList()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();pbMsgOpenList()}">'
      + '<div><div class="name">Messages</div><div class="sub" id="homeMsgSub" data-noi18n>' + pbMsgEsc(sub) + '</div></div>'
      + '<div style="display:flex;align-items:center">' + (n ? '<span class="pbm-chip" id="homeMsgCount" aria-label="' + n + ' unread">' + (n > 99 ? '99+' : n) + '</span>' : '') + '<span aria-hidden="true">&rsaquo;</span></div></div>';
  }
  function pbMsgPaintList() {
    const box = pbMsgEl('pbmList'), line = pbMsgEl('pbmListLine'); if (!box) return;
    const uid = pbMsgUid(), chats = pbMsgChats().slice().sort((a, b) => ((+b.unread > 0) - (+a.unread > 0)) || String(b.last_at || '').localeCompare(String(a.last_at || '')));
    const offline = navigator.onLine === false;
    line.textContent = !uid ? 'Log in to see messages.' : offline ? 'No signal. Showing what this phone has.' : !pbMsg.list ? 'Loading messages…' : '';
    const jobs = chats.filter((c) => c.kind === 'job'), dms = chats.filter((c) => c.kind === 'dm');
    const row = (c) => '<button type="button" class="pbm-row' + ((+c.unread || 0) > 0 ? ' unread' : '') + '" data-chat="' + pbMsgEsc(c.id) + '" onclick="pbMsgOpenChat(this.dataset.chat)">'
      + '<span class="tx"><span class="nm" data-noi18n>' + pbMsgEsc(c.title) + (c.project ? ' · ' + pbMsgEsc(c.project) : '') + '</span><span class="sb" data-noi18n>' + pbMsgEsc((c.closed ? 'Closed · ' : '') + (c.muted ? 'Muted · ' : '') + pbMsgPreview(c)) + '</span></span>'
      + '<span class="tm" data-noi18n>' + pbMsgEsc(c.last_at ? pbMsgTime(c.last_at) : '') + '</span>' + ((+c.unread || 0) > 0 ? '<span class="pbm-chip">' + (+c.unread > 99 ? '99+' : +c.unread) + '</span>' : '') + '</button>';
    const pend = pbMsg.out.filter((x) => !x.chat && x.state !== 'sent');
    box.innerHTML = (jobs.length ? '<p class="pbm-h">Job chats</p>' + jobs.map(row).join('') : '')
      + (dms.length ? '<p class="pbm-h">Direct messages</p>' + dms.map(row).join('') : '')
      + (pend.length ? '<p class="pbm-h">Waiting to start</p>' + pend.map((x) => '<button type="button" class="pbm-row" data-key="' + pbMsgEsc(x.key) + '" onclick="pbMsgOpenKey(this.dataset.key)"><span class="tx"><span class="nm" data-noi18n>' + pbMsgEsc(x.title || 'New chat') + '</span><span class="sb">Waiting for signal</span></span></button>').join('') : '')
      + (!chats.length && !pend.length && pbMsg.list ? '<p class="pbm-line">No messages yet. Tap New message.</p>' : '');
    const dr = pbMsgEl('pbmDmRecBtn'); if (dr) dr.hidden = !(pbMsg.list && pbMsg.list.me && pbMsg.list.me.is_owner);
  }
  // ---- opening ----
  window.pbMsgOpenList = function() {
    const uid = pbMsgUid();
    if (!uid) { pbAlert('Log in to use Messages.', 'Messages'); return; }
    pbGoto('messages');
    pbMsgLoad(uid).then(() => { pbMsgPaintList(); return pbMsgRefresh(true); }).then(() => {
      if (pbMsg.pendingOpen) { const id = pbMsg.pendingOpen; pbMsg.pendingOpen = null; if (pbMsgChats().some((c) => c.id === id)) window.pbMsgOpenChat(id); }
    }).catch(() => {});
  };
  window.pbMsgNewToggle = function(on) {
    const p = pbMsgEl('pbmNew'), b = pbMsgEl('pbmNewBtn'); if (!p) return;
    const open = on == null ? p.hidden : !!on; p.hidden = !open; b.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) pbMsgLoadPicks();
  };
  async function pbMsgLoadPicks() {
    const uid = pbMsgUid(); if (!uid) return;
    const paint = () => {
      const J = pbMsgEl('pbmNewJobs'), P = pbMsgEl('pbmNewPeople'); if (!J || !P) return;
      const jobs = (pbMsg.jobs || []).slice(0, 30);
      J.innerHTML = jobs.length ? jobs.map((j) => '<button type="button" class="pbm-btn" data-job="' + pbMsgEsc(j.job_number) + '" onclick="pbMsgOpenJob(this.dataset.job)" data-noi18n>' + pbMsgEsc('Job ' + j.job_number) + '</button>').join('') : '<span class="pbm-line">' + (navigator.onLine === false ? 'No signal.' : 'Type the job number below.') + '</span>';
      const ppl = pbMsg.people || [];
      P.innerHTML = ppl.length ? ppl.map((x) => '<button type="button" class="pbm-btn" data-uid="' + pbMsgEsc(x.uid) + '" data-name="' + pbMsgEsc(x.name) + '" onclick="pbMsgOpenDm(this.dataset.uid, this.dataset.name)" data-noi18n>' + pbMsgEsc(x.name) + '</button>').join('') : '<span class="pbm-line">' + (navigator.onLine === false ? 'No signal.' : 'Loading…') + '</span>';
    };
    paint();
    if (!(await pbMsgCanAsk(uid))) return;
    const [a, b] = await Promise.all([pbPermitRpc('pb_msg_people', { p_expect_uid: uid }, 15000), pbPermitRpc('pb_prod_member_jobs', {}, 15000)]);
    if (pbMsg.uid !== uid) return;
    if (a && !a.error && a.data && Array.isArray(a.data.people)) pbMsg.people = a.data.people.map((x) => ({ uid: x.uid, name: x.name, role: x.role }));
    if (b && !b.error && b.data && Array.isArray(b.data.jobs)) pbMsg.jobs = b.data.jobs.filter((j) => j && j.job_number).map((j) => ({ job_number: String(j.job_number), project_name: j.project_name || null }));
    pbMsgSave(); paint();
  }
  window.pbMsgOpenJobTyped = function() { const v = String((pbMsgEl('pbmJobNum') || {}).value || '').trim(); if (v) window.pbMsgOpenJob(v); };
  async function pbMsgOpenTarget(target, title) {
    const uid = pbMsgUid(); if (!uid) return;
    const key = target.kind === 'job' ? 'job:' + String(target.job).toLowerCase() : 'dm:' + target.user;
    // the chat is already on the phone
    const have = pbMsgChats().find((c) => (target.kind === 'job' && c.kind === 'job' && String(c.job_key || '').toLowerCase() === String(target.job).trim().toLowerCase()) || (target.kind === 'dm' && c.kind === 'dm' && c.other === target.user));
    if (have) { window.pbMsgOpenChat(have.id); return; }
    if (!(await pbMsgCanAsk(uid))) { pbMsg.cur = { id: null, key, target, title }; pbGoto('msgChat'); pbMsgPaintChat(); return; } // no signal: write it now, it starts the chat when signal is back
    const r = target.kind === 'job' ? await pbPermitRpc('pb_msg_open_job', { p_job_number: target.job, p_expect_uid: uid }, 20000)
                                    : await pbPermitRpc('pb_msg_open_dm', { p_user: target.user, p_expect_uid: uid }, 20000);
    if (r && !r.error && r.data && r.data.ok && r.data.chat) {
      const c = r.data.chat; pbMsg.chats[c.id] = Object.assign(pbMsg.chats[c.id] || { msgs: [] }, { chat: c });
      if (pbMsg.list && Array.isArray(pbMsg.list.chats) && !pbMsg.list.chats.some((x) => x.id === c.id)) pbMsg.list.chats.unshift(c);
      pbMsgSave(); window.pbMsgNewToggle(false); window.pbMsgOpenChat(c.id); return;
    }
    const code = pbMsgCode(r);
    if (pbMsgNet(r)) { pbMsg.cur = { id: null, key, target, title }; pbGoto('msgChat'); pbMsgPaintChat(); return; }
    pbAlert(code === 'pb:not_in_chat' ? (target.kind === 'job' ? 'Only the office or a foreman assigned to this job can start its chat.' : 'That person is not in your company.')
      : code === 'pb:company_inactive' ? 'The company account is not active, so new chats cannot start.' : 'The chat could not be opened. Try again.', 'Messages');
  }
  window.pbMsgOpenJob = function(job) { pbMsgOpenTarget({ kind: 'job', job: String(job || '').trim() }, 'Job ' + String(job || '').trim()); };
  window.pbMsgOpenDm = function(user, name) { pbMsgOpenTarget({ kind: 'dm', user }, name || 'Direct message'); };
  window.pbMsgOpenKey = function(key) { const x = pbMsg.out.find((o) => o.key === key); if (!x) return; pbMsg.cur = { id: null, key, target: x.target, title: x.title }; pbGoto('msgChat'); pbMsgPaintChat(); };
  window.pbMsgOpenChat = function(id) {
    const x = pbMsg.chats[id]; const c = x && x.chat;
    pbMsg.cur = { id, key: null, target: null, title: c ? c.title : 'Messages' }; pbMsg.older = false;
    if (pbCurrentScreen !== 'msgChat') pbGoto('msgChat'); else pbMsgPaintChat();
    pbMsgPaintChat(); pbMsgFetch(true);
  };
  // ---- one chat ----
  async function pbMsgFetch(full, before) {
    const uid = pbMsgUid(), cur = pbMsg.cur; if (!uid || !cur || !cur.id) return;
    if (!(await pbMsgCanAsk(uid))) { pbMsgPaintChat(); return; }
    const x = pbMsg.chats[cur.id] || (pbMsg.chats[cur.id] = { msgs: [] });
    const maxSeq = (x.msgs || []).reduce((m, a) => Math.max(m, +a.seq || 0), 0);
    const args = { p_chat: cur.id, p_after_seq: full || before ? null : maxSeq, p_before_seq: before || null, p_limit: full ? 100 : 200, p_expect_uid: uid };
    const r = await pbPermitRpc('pb_msg_fetch', args, 20000);
    if (pbMsg.uid !== uid || !pbMsg.cur || pbMsg.cur.id !== cur.id) return;
    if (r && !r.error && r.data && r.data.ok) {
      const by = new Map((x.msgs || []).map((m) => [m.seq, m]));
      (r.data.messages || []).forEach((m) => by.set(m.seq, m));
      x.msgs = Array.from(by.values()).sort((a, b) => a.seq - b.seq);
      if (r.data.chat) x.chat = r.data.chat;
      x.canPost = r.data.can_post !== false; x.whyNot = r.data.why_not || null;
      if (before && !(r.data.messages || []).length) pbMsg.older = 'none';
      const last = x.msgs.length ? x.msgs[x.msgs.length - 1].seq : 0;
      if (x.chat && last && (x.chat.read_seq || 0) < last && pbCurrentScreen === 'msgChat' && document.visibilityState !== 'hidden') {
        x.chat.read_seq = last; x.chat.unread = 0;
        const lc = pbMsg.list && (pbMsg.list.chats || []).find((c) => c.id === cur.id); if (lc) { lc.unread = 0; lc.read_seq = last; }
        pbPermitRpc('pb_msg_read', { p_chat: cur.id, p_seq: last, p_expect_uid: uid }, 15000).catch(() => {});
      }
      pbMsgSave();
    } else if (pbMsgCode(r) === 'pb:not_in_chat') {
      delete pbMsg.chats[cur.id]; if (pbMsg.list && pbMsg.list.chats) pbMsg.list.chats = pbMsg.list.chats.filter((c) => c.id !== cur.id);
      pbMsgSave(); pbMsg.cur = Object.assign({}, cur, { gone: true });
    }
    pbMsgPaintChat(); pbMsgPaintHome();
  }
  window.pbMsgOlder = function() { const x = pbMsg.cur && pbMsg.chats[pbMsg.cur.id]; if (!x || !x.msgs.length) return; pbMsgFetch(false, x.msgs[0].seq); };
  function pbMsgCanEdit(m) { return m.mine && !m.deleted && Date.now() - Date.parse(m.at) < 24 * 3600000; }
  function pbMsgPaintChat() {
    const cur = pbMsg.cur, box = pbMsgEl('pbmMsgs'); if (!box || !cur) return;
    const x = cur.id ? pbMsg.chats[cur.id] : null, c = x && x.chat;
    pbMsgEl('pbmChatTitle').textContent = (c && c.title) || cur.title || 'Messages';
    { const eb = pbMsgEl('pbmChatEyebrow'); eb.textContent = c && c.kind === 'dm' ? 'Direct message' : c && c.project ? c.project : 'Job chat'; if (c && c.kind !== 'dm' && c.project) eb.setAttribute('data-noi18n', ''); else eb.removeAttribute('data-noi18n'); }
    pbMsgEl('pbmInfoBtn').hidden = !cur.id;
    const line = pbMsgEl('pbmChatLine');
    const office = !!(c && c.admin); // the company account, managers and the PMs/supers in this chat
    line.textContent = cur.gone ? 'You are no longer in this chat.' : navigator.onLine === false ? 'No signal. Messages you write wait on this phone and send when there is signal.'
      : !cur.id ? 'This chat starts when the first message is sent.' : c && c.kind === 'job' && c.include_pipelayers === false && office ? 'Pipelayers are not in this chat. Change it in Info.' : '';
    // Tommy, Nov 22 (46): every direct message thread says so at the top
    { let dmn = pbMsgEl('pbmDmNote'); const isDm = (c && c.kind === 'dm') || (!cur.id && cur.target && cur.target.kind === 'dm');
      if (isDm && !dmn) { dmn = document.createElement('p'); dmn.id = 'pbmDmNote'; dmn.className = 'pbm-dmnote'; dmn.textContent = 'Direct messages are company records.'; box.parentNode.insertBefore(dmn, box); }
      if (dmn) dmn.hidden = !isDm; }
    const msgs = (x && x.msgs) || [];
    const pend = pbMsg.out.filter((o) => (cur.id && o.chat === cur.id) || (cur.key && o.key === cur.key));
    const older = pbMsgEl('pbmOlder'); older.hidden = !(cur.id && msgs.length >= 50 && pbMsg.older !== 'none' && msgs[0].seq > ((c && c.from_seq) || 0) + 1);
    const photoHtml = (ph) => '<div class="pbm-ph">' + ph.map((p) => { const u = pbMsg.photos[p.path || p.cid]; return '<button type="button" data-path="' + pbMsgEsc(p.path || '') + '" onclick="pbMsgPhotoView(this.dataset.path)" aria-label="Open photo">' + (u ? '<img src="' + pbSafePhotoUrl(u) + '" alt="Photo">' : 'Photo') + '</button>'; }).join('') + '</div>';
    const html = msgs.map((m) => {
      const canMore = (pbMsgCanEdit(m) || (m.mine && !m.deleted) || (office && !m.deleted && !m.mine)) && !cur.gone;
      const body = m.deleted ? (m.mine ? 'You deleted this message' : 'Message deleted') : m.body || '';
      return '<div class="pbm-m' + (m.mine ? ' mine' : '') + (m.deleted ? ' del' : '') + '" data-seq="' + m.seq + '">'
        + (m.mine ? '' : '<div class="who" data-noi18n>' + pbMsgEsc(m.author_name || '') + '</div>')
        + (body ? '<div class="bd"' + (m.deleted ? '' : ' data-noi18n') + '>' + pbMsgEsc(body) + '</div>' : '')
        + (!m.deleted && m.photos && m.photos.length ? photoHtml(m.photos) : '')
        + '<div class="meta"><span data-noi18n>' + pbMsgEsc(pbMsgTime(m.at)) + '</span>' + (m.edited && !m.deleted ? '<span>Edited</span>' : '')
        + (canMore ? '<button type="button" class="more" aria-label="Message options" data-seq="' + m.seq + '" onclick="pbMsgMore(+this.dataset.seq)">&#8943;</button>' : '') + '</div></div>';
    }).join('') + pend.map((o) => '<div class="pbm-m mine wait' + (o.state === 'refused' ? ' refused' : '') + '" data-cid="' + pbMsgEsc(o.cid) + '">'
        + (o.body ? '<div class="bd" data-noi18n>' + pbMsgEsc(o.body) + '</div>' : '')
        + (o.photos && o.photos.length ? '<div class="pbm-ph">' + o.photos.map((p) => '<button type="button" aria-label="Photo"><img src="' + pbSafePhotoUrl(p.url) + '" alt="Photo"></button>').join('') + '</div>' : '')
        + '<div class="meta"><span>' + (o.state === 'refused' ? 'Not sent: ' + pbMsgEsc(o.why || 'refused') : o.state === 'sending' ? 'Sending…' : 'Waiting for signal') + '</span>'
        + (o.state === 'refused' ? '<button type="button" class="pbm-btn" data-cid="' + pbMsgEsc(o.cid) + '" onclick="pbMsgDropUnsent(this.dataset.cid)">Remove</button>' : '') + '</div></div>').join('');
    if (box.dataset.h !== html) { const atEnd = window.innerHeight + window.scrollY >= document.body.scrollHeight - 80; box.innerHTML = html; box.dataset.h = html; if (atEnd || !box.dataset.seen) { box.dataset.seen = '1'; pbMsgEl('pbmCompose').scrollIntoView({ block: 'end' }); } }
    // what can be written here
    const canPost = !cur.gone && (!x || x.canPost !== false) && !(c && c.closed);
    const comp = pbMsgEl('pbmCompose');
    let note = comp.querySelector('.pbm-closed');
    if (!canPost) {
      if (!note) { note = document.createElement('p'); note.className = 'pbm-closed'; comp.insertBefore(note, comp.firstChild); }
      note.textContent = cur.gone ? 'You are no longer in this chat.' : c && c.closed ? 'This chat is closed. The office can reopen it in Info.' : (PB_MSG_REFUSED[x && x.whyNot] ? 'You can read this chat but not write: ' + PB_MSG_REFUSED[x.whyNot] + '.' : 'You can read this chat but not write in it.');
    } else if (note) note.remove();
    comp.querySelector('.pbm-crow').hidden = !canPost; pbMsgEl('pbmThumbs').hidden = !canPost;
    pbMsgPaintThumbs(); pbMsgTyped();
    pbMsgLoadPhotos(msgs);
  }
  // received photos: read with the person's own sign-in (storage rules decide), kept on the phone for the last 60
  let pbMsgPhotoBusy = false;
  async function pbMsgLoadPhotos(msgs) {
    if (pbMsgPhotoBusy || navigator.onLine === false || !sbClient || !sbClient.storage) return;
    const want = []; msgs.slice(-40).forEach((m) => { if (!m.deleted) (m.photos || []).forEach((p) => { if (p.path && !pbMsg.photos[p.path]) want.push(p.path); }); });
    if (!want.length) return;
    pbMsgPhotoBusy = true; let got = 0;
    try {
      for (const path of want.slice(0, 12)) {
        let r = null; try { r = await sbClient.storage.from('msg-photos').download(path); } catch (e) { r = null; }
        if (!r || r.error || !r.data) continue;
        const url = await new Promise((res) => { try { const fr = new FileReader(); fr.onload = () => res(String(fr.result || '')); fr.onerror = () => res(''); fr.readAsDataURL(r.data); } catch (e) { res(''); } });
        if (/^data:image\//.test(url)) { pbMsg.photos[path] = url.replace(/^data:[^;,]*/, 'data:image/jpeg'); got++; }
      }
    } finally { pbMsgPhotoBusy = false; }
    if (got) { pbMsgSave(); if (pbCurrentScreen === 'msgChat') pbMsgPaintChat(); }
  }
  window.pbMsgPhotoView = function(path) {
    const u = path && pbMsg.photos[path]; if (!u) return;
    const d = document.createElement('div'); d.className = 'pbm-full'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Photo');
    d.innerHTML = '<img src="' + pbSafePhotoUrl(u) + '" alt="Photo"><button type="button" class="pbm-btn">Close</button>';
    d.querySelector('button').onclick = () => d.remove(); d.onclick = (e) => { if (e.target === d) d.remove(); };
    (pbMsgEl('pbApp') || document.body).appendChild(d); d.querySelector('button').focus();
  };
  // ---- writing ----
  window.pbMsgTyped = function() {
    const t = pbMsgEl('pbmText'), s = pbMsgEl('pbmSend'); if (!t || !s) return;
    t.style.height = 'auto'; t.style.height = Math.min(160, Math.max(44, t.scrollHeight + 2)) + 'px';
    const ready = !!t.value.trim() || (!pbMsg.editing && pbMsg.draftPhotos.length > 0);
    s.disabled = !ready; s.classList.toggle('on', ready); s.textContent = pbMsg.editing ? 'Save' : 'Send';
  };
  function pbMsgPaintThumbs() {
    const el = pbMsgEl('pbmThumbs'); if (!el) return;
    el.innerHTML = pbMsg.draftPhotos.map((p, i) => '<span><img src="' + pbSafePhotoUrl(p.url) + '" alt="Photo ' + (i + 1) + '"><button type="button" aria-label="Remove photo ' + (i + 1) + '" onclick="pbMsgPhotoRemove(' + i + ')">&times;</button></span>').join('');
  }
  window.pbMsgPhotoRemove = function(i) { pbMsg.draftPhotos.splice(i, 1); pbMsgPaintThumbs(); pbMsgTyped(); };
  // resized exactly like run and note photos: longest side 900 px, JPEG 0.72
  window.pbMsgPhotoPicked = function(input) {
    const files = Array.from((input && input.files) || []); if (input) input.value = '';
    files.slice(0, Math.max(0, 6 - pbMsg.draftPhotos.length)).forEach((file) => {
      const tmp = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        try {
          const max = 900; let w = img.width, h = img.height;
          if (w >= h && w > max) { h = Math.round(h * max / w); w = max; } else if (h > w && h > max) { w = Math.round(w * max / h); h = max; }
          const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
          if (pbMsg.draftPhotos.length < 6) pbMsg.draftPhotos.push({ url: c.toDataURL('image/jpeg', 0.72), w, h });
          c.width = c.height = 0;
        } catch (e) { console.error(e); } finally { URL.revokeObjectURL(tmp); pbMsgPaintThumbs(); pbMsgTyped(); }
      };
      img.onerror = () => { URL.revokeObjectURL(tmp); pbAlert('That file couldn’t be read as a photo, so it wasn’t added.', 'Photo Not Added'); };
      img.src = tmp;
    });
    if (files.length + pbMsg.draftPhotos.length > 6) pbAlert('Up to 6 photos in one message.', 'Photos');
  };
  window.pbMsgSend = async function() {
    const uid = pbMsgUid(), cur = pbMsg.cur, t = pbMsgEl('pbmText'); if (!uid || !cur || !t) return;
    const body = t.value.replace(/\s+$/, '');
    if (pbMsg.editing) return pbMsgEditSave(body);
    if (!body.trim() && !pbMsg.draftPhotos.length) return;
    if (body.length > 4000) { pbAlert('That message is too long (4,000 characters at most).', 'Messages'); return; }
    const x = { cid: pbMsgRid(), chat: cur.id || null, key: cur.id ? null : cur.key, target: cur.id ? null : cur.target, title: cur.title, body: body.trim() ? body : '', photos: pbMsg.draftPhotos.map((p) => ({ url: p.url, w: p.w, h: p.h })), at: new Date().toISOString(), state: 'waiting' };
    pbMsg.out.push(x);
    const ok = await pbMsgSaveOut();
    if (!ok) { pbMsg.out = pbMsg.out.filter((o) => o !== x); pbAlert('This phone could not save the message (storage full?). It was not sent. Copy your text before leaving.', 'Not Saved'); return; }
    t.value = ''; pbMsg.draftPhotos = []; pbMsgPaintChat(); pbMsgPaintHome();
    pbMsgFlush();
  };
  window.pbMsgDropUnsent = function(cid) {
    pbConfirm('Remove this unsent message from this phone? It was never sent.', async () => { pbMsg.out = pbMsg.out.filter((o) => o.cid !== cid); await pbMsgSaveOut(); pbMsgPaintChat(); pbMsgPaintHome(); }, 'Remove Unsent Message', { no: 'Keep', yes: 'Remove' });
  };
  function pbMsgB64Blob(url) { const s = String(url).split(',')[1] || ''; const bin = atob(s); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: 'image/jpeg' }); }
  // the outbox: in order, one at a time; no signal or an error leaves it for later; a refusal is shown on the message and kept
  let pbMsgFlushT = null;
  async function pbMsgFlush() {
    const uid = pbMsgUid(); if (!uid || pbMsg.uid !== uid || pbMsg.flushBusy) return;
    const todo = pbMsg.out.filter((o) => o.state !== 'refused' && !(o.retryAt && o.retryAt > Date.now()));
    clearTimeout(pbMsgFlushT); if (pbMsg.out.some((o) => o.state !== 'refused')) pbMsgFlushT = setTimeout(pbMsgFlush, 60000);
    if (!todo.length || !(await pbMsgCanAsk(uid))) return;
    pbMsg.flushBusy = true; let changed = false;
    try {
      for (const o of todo) {
        if (pbMsg.uid !== uid) break;
        o.state = 'sending'; if (pbCurrentScreen === 'msgChat') pbMsgPaintChat();
        // a chat started with no signal: open it now
        if (!o.chat && o.target) {
          const r = o.target.kind === 'job' ? await pbPermitRpc('pb_msg_open_job', { p_job_number: o.target.job, p_expect_uid: uid }, 20000) : await pbPermitRpc('pb_msg_open_dm', { p_user: o.target.user, p_expect_uid: uid }, 20000);
          if (r && !r.error && r.data && r.data.chat) {
            const c = r.data.chat; o.chat = c.id; pbMsg.chats[c.id] = Object.assign(pbMsg.chats[c.id] || { msgs: [] }, { chat: c });
            if (pbMsg.list && Array.isArray(pbMsg.list.chats) && !pbMsg.list.chats.some((y) => y.id === c.id)) pbMsg.list.chats.unshift(c);
            if (pbMsg.cur && pbMsg.cur.key && pbMsg.cur.key === o.key) pbMsg.cur = { id: c.id, key: null, target: null, title: c.title };
            pbMsg.out.forEach((y) => { if (y !== o && !y.chat && y.key === o.key) y.chat = c.id; });
            changed = true;
          } else { const code = pbMsgCode(r); if (PB_MSG_REFUSED[code]) { o.state = 'refused'; o.why = PB_MSG_REFUSED[code]; changed = true; continue; } o.state = 'waiting'; break; }
        }
        const co = pbMsg.list && pbMsg.list.me && pbMsg.list.me.company_id;
        if (!co) { o.state = 'waiting'; break; }
        // photos first (storage), then the message names them
        let upOk = true; const ph = [];
        for (let i = 0; i < (o.photos || []).length; i++) {
          const path = co + '/' + o.chat + '/' + uid + '/' + o.cid + '-' + (i + 1) + '.jpg';
          let u = null; try { u = await sbClient.storage.from('msg-photos').upload(path, pbMsgB64Blob(o.photos[i].url), { contentType: 'image/jpeg', upsert: false }); } catch (e) { u = { error: { message: String(e && e.message || e) } }; }
          if (u && u.error && !/already exists|duplicate/i.test(String(u.error.message || ''))) { upOk = false; break; }
          ph.push({ path, w: o.photos[i].w, h: o.photos[i].h }); pbMsg.photos[path] = o.photos[i].url;
        }
        if (!upOk) { o.state = 'waiting'; o.retryAt = Date.now() + 120000; changed = true; break; }
        const r = await pbPermitRpc('pb_msg_send', { p_chat: o.chat, p_client_id: o.cid, p_body: o.body || null, p_photos: ph, p_phone_at: o.at, p_expect_uid: uid }, 30000);
        if (pbMsg.uid !== uid) break;
        if (r && !r.error && r.data && r.data.ok && r.data.message) {
          const m = r.data.message, cx = pbMsg.chats[o.chat] || (pbMsg.chats[o.chat] = { msgs: [] });
          if (!cx.msgs.some((y) => y.seq === m.seq)) { cx.msgs.push(m); cx.msgs.sort((a, b) => a.seq - b.seq); }
          if (cx.chat) { cx.chat.last_at = m.at; cx.chat.last_seq = Math.max(cx.chat.last_seq || 0, m.seq); cx.chat.read_seq = Math.max(cx.chat.read_seq || 0, m.seq); cx.chat.last = { seq: m.seq, at: m.at, author_name: m.author_name, mine: true, deleted: false, photos: (m.photos || []).length, preview: String(m.body || '').slice(0, 60) }; }
          pbMsg.out = pbMsg.out.filter((y) => y !== o); changed = true; continue;
        }
        const code = pbMsgCode(r);
        if (code === 'pb:photo_missing') { o.state = 'waiting'; o.retryAt = Date.now() + 60000; changed = true; continue; }
        if (code === 'pb:quota') { o.state = 'waiting'; o.retryAt = Date.now() + 3600000; changed = true; continue; }
        if (PB_MSG_REFUSED[code]) { o.state = 'refused'; o.why = PB_MSG_REFUSED[code]; changed = true; continue; }
        o.state = 'waiting'; changed = true; break; // no signal, signed out, another account, server trouble: later
      }
    } finally {
      pbMsg.flushBusy = false;
      pbMsg.out.forEach((o) => { if (o.state === 'sending') o.state = 'waiting'; });
      if (changed) { await pbMsgSaveOut(); pbMsgSave(); }
      pbMsgPaintAll();
    }
  }
  window.__pbMsgFlush = pbMsgFlush; window.__pbMsg = () => pbMsg; // tests
  // ---- edit / delete (need signal: the server keeps every version) ----
  window.pbMsgMore = function(seq) {
    const cur = pbMsg.cur, x = cur && pbMsg.chats[cur.id], m = x && x.msgs.find((y) => y.seq === seq); if (!m) return;
    const office = !!(x.chat && x.chat.admin);
    const b = [];
    if (pbMsgCanEdit(m)) b.push({ label: 'Edit', onClick: () => pbMsgEditStart(m) });
    if (!m.deleted && (m.mine || office)) b.push({ label: 'Delete', danger: true, onClick: () => pbMsgDelete(m) });
    b.push({ label: 'Close', tapOut: true });
    pbShowModal(m.mine ? (pbMsgCanEdit(m) ? 'Your message. You can change it for 24 hours.' : 'Your message.') : 'Message from ' + (m.author_name || 'someone') + '. As the office you can delete it.', b, 'Message');
  };
  function pbMsgEditStart(m) { pbMsg.editing = m; const t = pbMsgEl('pbmText'); t.value = m.body || ''; pbMsgEl('pbmEditing').hidden = false; pbMsgTyped(); t.focus(); }
  window.pbMsgEditCancel = function() { pbMsg.editing = null; pbMsgEl('pbmText').value = ''; pbMsgEl('pbmEditing').hidden = true; pbMsgTyped(); };
  async function pbMsgEditSave(body) {
    const uid = pbMsgUid(), m = pbMsg.editing; if (!m) return;
    if (!(await pbMsgCanAsk(uid))) { pbAlert('No signal. Changes to a sent message need signal. Try again when you have signal.', 'Not Changed'); return; }
    const r = await pbPermitRpc('pb_msg_edit', { p_message: m.id, p_body: body, p_expect_uid: uid }, 20000);
    if (r && !r.error && r.data && r.data.ok) { pbMsgReplace(r.data.message); window.pbMsgEditCancel(); return; }
    const code = pbMsgCode(r);
    pbAlert(code === 'pb:too_late' ? 'A message can be changed for 24 hours after it was sent.' : code === 'pb:empty' ? 'A message can’t be empty. Delete it instead.' : 'The change could not be saved. Try again.', 'Not Changed');
  }
  function pbMsgDelete(m) {
    pbConfirm('Delete this message? Everyone in the chat sees "Message deleted". The company keeps the original in its records.', async () => {
      const uid = pbMsgUid();
      if (!(await pbMsgCanAsk(uid))) { pbAlert('No signal. Try again when you have signal.', 'Not Deleted'); return; }
      const r = await pbPermitRpc('pb_msg_delete', { p_message: m.id, p_expect_uid: uid }, 20000);
      if (r && !r.error && r.data && r.data.ok) { pbMsgReplace(r.data.message); return; }
      pbAlert('The message could not be deleted. Try again.', 'Not Deleted');
    }, 'Delete Message', { no: 'Keep', yes: 'Delete Message' });
  }
  function pbMsgReplace(m) { const x = pbMsg.cur && pbMsg.chats[pbMsg.cur.id]; if (!x || !m) return; const i = x.msgs.findIndex((y) => y.seq === m.seq); if (i >= 0) x.msgs[i] = m; pbMsgSave(); pbMsgPaintChat(); }
  // ---- chat info ----
  window.pbMsgOpenInfo = function() { if (!pbMsg.cur || !pbMsg.cur.id) return; pbMsg.info = null; pbGoto('msgInfo'); pbMsgLoadInfo(); };
  async function pbMsgLoadInfo() {
    const uid = pbMsgUid(), id = pbMsg.cur && pbMsg.cur.id; if (!uid || !id) return;
    const x = pbMsg.chats[id]; pbMsgEl('pbmInfoTitle').textContent = (x && x.chat && x.chat.title) || 'Chat';
    pbMsgEl('pbmInfoLine').textContent = 'Loading…'; pbMsgEl('pbmInfoBody').innerHTML = '';
    if (!(await pbMsgCanAsk(uid))) { pbMsgEl('pbmInfoLine').textContent = 'No signal. Chat info needs signal.'; return; }
    const r = await pbPermitRpc('pb_msg_info', { p_chat: id, p_expect_uid: uid }, 20000);
    if (!pbMsg.cur || pbMsg.cur.id !== id) return;
    if (!(r && !r.error && r.data && r.data.ok)) { pbMsgEl('pbmInfoLine').textContent = pbMsgCode(r) === 'pb:not_in_chat' ? 'You are no longer in this chat.' : 'Chat info could not be loaded. Try again.'; return; }
    pbMsg.info = r.data; if (r.data.chat && pbMsg.chats[id]) pbMsg.chats[id].chat = r.data.chat;
    pbMsgPaintInfo();
  }
  const PB_MSG_ROLE = { office: 'Office', foreman: 'Foreman', pipelayer: 'Pipelayer' };
  function pbMsgLogText(l) {
    const by = l.by || 'The app', t = l.target || '';
    if (l.what === 'include_pipelayers') return by + ' turned Include pipelayers ' + (l.new === true ? 'on' : 'off');
    if (l.what === 'pipelayer_history') return by + ' set Pipelayers see: ' + (l.new === 'all' ? 'Whole chat' : 'From when added');
    if (l.what === 'person_added') return by + ' added ' + t;
    if (l.what === 'person_removed') return by + ' took ' + t + ' off the chat';
    if (l.what === 'closed') return l.by ? by + ' closed the chat' : 'Closed after 120 days with no message';
    if (l.what === 'reopened') return by + ' reopened the chat';
    if (l.what === 'started') return by + ' started the chat';
    if (l.what === 'archive_requested') return (l.by ? by + ' saved' : 'Saved') + ' an archive';
    if (l.what === 'message_deleted') return by + ' deleted a message from ' + t;
    return by + ': ' + l.what;
  }
  function pbMsgPaintInfo() {
    const I = pbMsg.info, el = pbMsgEl('pbmInfoBody'); if (!I || !el) return;
    pbMsgEl('pbmInfoLine').textContent = '';
    const c = I.chat || {}, mg = !!I.can_manage, uid = pbMsgUid();
    const people = (I.people || []).filter((p) => p.state === 'in');
    const out = (I.people || []).filter((p) => p.state !== 'in');
    let h = '';
    const R = I.rule || null;
    const who = c.kind !== 'job' || !R ? '' : '<p class="pb-help" id="pbmWho">'
      + (R.foremen === 'assigned' && R.pms === 'assigned' ? 'Everyone assigned to this job is in, with the company account and managers.'
        : [R.foremen === 'worked' ? 'Nobody is assigned to this job, so the foremen who worked it in the last 120 days are in.'
             : R.foremen === 'linked' ? 'No foremen are listed on the job page, so foremen with open inspections, crew runs or dailies on this job are in.' /* foremen_job_nov23 */
             : 'The foremen assigned to this job are in.',
           R.pms === 'all' ? 'No PM or super is assigned to this job, so every PM and super is in.' : 'The PMs and supers assigned to this job are in.',
           'The company account and managers are always in.'].join(' ')) + '</p>';
    h += '<section class="pbm-sec" aria-labelledby="pbmPplH"><h2 id="pbmPplH">People in this chat (' + people.length + ')</h2>' + who
      + people.map((p) => '<div class="pbm-person"><span class="tx"><span data-noi18n>' + pbMsgEsc(p.name) + '</span> <span class="rl">' + pbMsgEsc(PB_MSG_ROLE[p.role] || '') + '</span></span>'
        + (mg && c.kind === 'job' && p.role !== 'office' && p.uid !== uid ? '<button type="button" class="pbm-btn" data-uid="' + pbMsgEsc(p.uid) + '" data-name="' + pbMsgEsc(p.name) + '" onclick="pbMsgPerson(this.dataset.uid, false, this.dataset.name)">Take off</button>' : '') + '</div>').join('')
      + (mg && out.length ? '<p class="pbm-h">Not in it now</p>' + out.map((p) => '<div class="pbm-person"><span class="tx"><span data-noi18n>' + pbMsgEsc(p.name) + '</span> <span class="rl">' + pbMsgEsc(PB_MSG_ROLE[p.role] || '') + '</span></span><button type="button" class="pbm-btn" data-uid="' + pbMsgEsc(p.uid) + '" data-name="' + pbMsgEsc(p.name) + '" onclick="pbMsgPerson(this.dataset.uid, true, this.dataset.name)">Add</button></div>').join('') : '')
      + (mg ? '<div class="pbm-actions"><button type="button" class="pbm-btn" onclick="pbMsgAddPick()">Add a person</button></div><div class="pbm-picks" id="pbmAddPick" hidden></div>' : '') + '</section>';
    if (c.kind === 'job') {
      h += '<section class="pbm-sec" aria-labelledby="pbmPlH"><h2 id="pbmPlH">Pipelayers</h2>'
        + (mg ? '<label class="pb-set-switch pbm-sw" for="pbmIncl"><span>Include pipelayers</span><input type="checkbox" role="switch" id="pbmIncl"' + (c.include_pipelayers ? ' checked' : '') + ' onchange="pbMsgSetIncl(this.checked)"></label>'
              : '<p>' + (c.include_pipelayers ? 'Pipelayers on this job are in this chat.' : 'Pipelayers are not in this chat.') + '</p>')
        + (c.include_pipelayers ? (mg ? '<p class="pb-set-label" id="pbmHistL">Pipelayers see</p><div class="pb-toggle" role="group" aria-labelledby="pbmHistL">'
              + '<button type="button" data-val="from_added" aria-pressed="' + (c.pipelayer_history !== 'all') + '" class="' + (c.pipelayer_history !== 'all' ? 'active' : '') + '" onclick="pbMsgSetHist(\'from_added\')">From when added</button>'
              + '<button type="button" data-val="all" aria-pressed="' + (c.pipelayer_history === 'all') + '" class="' + (c.pipelayer_history === 'all' ? 'active' : '') + '" onclick="pbMsgSetHist(\'all\')">Whole chat</button></div>'
            : '<p>Pipelayers see: ' + (c.pipelayer_history === 'all' ? 'the whole chat' : 'messages from when they were added') + '.</p>') : '')
        + '<p class="pb-help">' + (mg ? 'Only the office changes this.' : '') + '</p></section>';
    }
    h += '<section class="pbm-sec"><label class="pb-set-switch pbm-sw" for="pbmMute"><span>Mute this chat</span><input type="checkbox" role="switch" id="pbmMute"' + (c.muted ? ' checked' : '') + ' onchange="pbMsgMute(this.checked)"></label><p class="pb-help">No alerts from this chat on your phone. Messages still arrive.</p></section>';
    if ((I.office && c.kind === 'job') || (c.kind === 'dm' && I.archives)) {
      const ar = (I.archives || []);
      h += '<section class="pbm-sec" aria-labelledby="pbmArH"><h2 id="pbmArH">Archive</h2><p class="pb-help">The whole chat in one file (text and photos) to keep. Saved by itself when the chat closes.</p>'
        + ar.map((a) => '<div class="pbm-person"><span class="tx"><span data-noi18n>' + pbMsgEsc(pbMsgTime(a.at)) + ' · </span>' + (a.state === 'done' ? pbMsgEsc((Math.max(0.1, (a.bytes || 0) / 1048576)).toFixed(1) + ' MB') : a.state === 'failed' ? 'Failed' : 'Being made') + '</span>'
          + (a.state === 'done' ? (a.files || []).map((f, i) => '<button type="button" class="pbm-btn" data-path="' + pbMsgEsc(f.path) + '" data-ar="' + pbMsgEsc(a.id) + '" onclick="pbMsgDownload(this.dataset.path, this.dataset.ar)">Download' + ((a.files || []).length > 1 ? ' ' + (i + 1) : '') + '</button>').join('') : '') + '</div>').join('')
        + '<div class="pbm-actions"><button type="button" class="pbm-btn" onclick="pbMsgArchiveNow()">Save archive now</button>'
        + (c.kind === 'job' ? '<button type="button" class="pbm-btn" onclick="pbMsgClose(' + (c.closed ? 'false' : 'true') + ')">' + (c.closed ? 'Reopen chat' : 'Close chat') + '</button>' : '') + '</div></section>';
    }
    const log = I.log || [];
    if (log.length) h += '<section class="pbm-sec" aria-labelledby="pbmLogH"><h2 id="pbmLogH">Changes</h2><ul class="pbm-log">' + log.slice(0, 30).map((l) => '<li><span data-noi18n>' + pbMsgEsc(pbMsgLogText(l)) + '</span> <span data-noi18n>· ' + pbMsgEsc(pbMsgTime(l.at)) + '</span></li>').join('') + '</ul></section>';
    el.innerHTML = h;
  }
  async function pbMsgInfoCall(fn, args, okMsg) {
    const uid = pbMsgUid(), id = pbMsg.cur && pbMsg.cur.id; if (!uid || !id) return null;
    if (!(await pbMsgCanAsk(uid))) { pbAlert('No signal. Try again when you have signal.', 'Not Changed'); pbMsgPaintInfo(); return null; }
    const r = await pbPermitRpc(fn, Object.assign({ p_chat: id, p_expect_uid: uid }, args), 20000);
    if (r && !r.error && r.data && r.data.ok) { await pbMsgLoadInfo(); return r.data; }
    const code = pbMsgCode(r);
    pbAlert(code === 'pb:not_office' ? 'Only the office (company account, managers, PMs and supers) can change this.' : code === 'pb:office_always_in' ? 'The office is always in job chats.' : code === 'pb:quota' ? 'Too many archives today. Try tomorrow.' : 'That could not be changed. Try again.', 'Not Changed');
    pbMsgPaintInfo(); return null;
  }
  window.pbMsgSetIncl = function(on) { const c = (pbMsg.info && pbMsg.info.chat) || {}; pbMsgInfoCall('pb_msg_set', { p_include_pipelayers: !!on, p_pipelayer_history: c.pipelayer_history || 'from_added' }); };
  window.pbMsgSetHist = function(h) { pbMsgInfoCall('pb_msg_set', { p_include_pipelayers: true, p_pipelayer_history: h }); };
  window.pbMsgMute = function(on) { pbMsgInfoCall('pb_msg_mute', { p_muted: !!on }); };
  window.pbMsgPerson = function(user, on, name) {
    const go = () => pbMsgInfoCall('pb_msg_person', { p_user: user, p_in: !!on }).then((d) => { if (d && d.note === 'pipelayers_off') pbAlert((name || 'They') + ' will be in the chat when Include pipelayers is on.', 'Added'); });
    if (on) go(); else pbConfirm('Take ' + (name || 'this person') + ' off this chat? They stop seeing it at once. The office can add them back.', go, 'Take Off Chat', { no: 'Keep', yes: 'Take Off' });
  };
  window.pbMsgAddPick = async function() {
    const el = pbMsgEl('pbmAddPick'); if (!el) return; el.hidden = !el.hidden; if (el.hidden) return;
    await pbMsgLoadPicks();
    const inIds = new Set(((pbMsg.info && pbMsg.info.people) || []).filter((p) => p.state === 'in').map((p) => p.uid));
    const ppl = (pbMsg.people || []).filter((p) => !inIds.has(p.uid) && p.role !== 'office');
    el.innerHTML = ppl.length ? ppl.map((p) => '<button type="button" class="pbm-btn" data-uid="' + pbMsgEsc(p.uid) + '" data-name="' + pbMsgEsc(p.name) + '" onclick="pbMsgPerson(this.dataset.uid, true, this.dataset.name)" data-noi18n>' + pbMsgEsc(p.name) + '</button>').join('') : '<span class="pbm-line">Everyone is in.</span>';
  };
  window.pbMsgArchiveNow = function() { pbMsgInfoCall('pb_msg_archive_request', {}).then((d) => { if (d) pbAlert('The archive is being made. It shows here with a Download button in a few minutes.', 'Archive'); }); };
  window.pbMsgClose = function(close) {
    if (!close) { pbMsgInfoCall('pb_msg_close', { p_closed: false }); return; }
    pbConfirm('Close this chat? Nobody can write in it until the office reopens it. An archive file of the whole chat is saved.', () => pbMsgInfoCall('pb_msg_close', { p_closed: true }), 'Close Chat', { no: 'Keep Open', yes: 'Close Chat' });
  };
  window.pbMsgDownload = async function(path, archiveId) {
    if (!sbClient || !sbClient.storage || navigator.onLine === false) { pbAlert('No signal. Downloading needs signal.', 'Archive'); return; }
    // every download is logged first (Tommy, Nov 22); the file only opens after that
    const uid = pbMsgUid(); const lg = await pbPermitRpc('pb_msg_archive_download', { p_archive: archiveId, p_path: path, p_expect_uid: uid }, 15000);
    if (!(lg && !lg.error && lg.data && lg.data.ok)) { pbAlert(pbMsgCode(lg) === 'pb:not_office' ? 'Only the office can download this archive.' : 'The archive could not be opened. Try again.', 'Archive'); return; }
    let r = null; try { r = await sbClient.storage.from('msg-archives').createSignedUrl(path, 600, { download: String(path).split('/').pop() }); } catch (e) { r = null; }
    const u = r && !r.error && r.data && r.data.signedUrl;
    if (!u) { pbAlert('The archive could not be opened. Try again.', 'Archive'); return; }
    window.open(u, '_blank', 'noopener');
  };
  // ---- direct messages as company records (the company account only; names and counts, never the text) ----
  window.pbMsgDmRecords = async function() {
    const el = pbMsgEl('pbmDmRec'), uid = pbMsgUid(); if (!el || !uid) return;
    el.hidden = !el.hidden; if (el.hidden) return;
    el.innerHTML = '<p class="pbm-line">Loading…</p>';
    if (!(await pbMsgCanAsk(uid))) { el.innerHTML = '<p class="pbm-line">No signal.</p>'; return; }
    const r = await pbPermitRpc('pb_msg_dm_records', { p_expect_uid: uid }, 20000);
    if (!(r && !r.error && r.data && r.data.ok)) { el.innerHTML = '<p class="pbm-line">Could not be loaded. Try again.</p>'; return; }
    const T = r.data.threads || [];
    el.innerHTML = '<p class="pb-help">Direct messages between people in the company. You can save and download a thread as an archive file; you cannot read it here. Each download is logged and the two people see it in the chat\u2019s Changes.</p>'
      + (T.length ? T.map((t) => { const a = (t.archives || []).find((x) => x.state === 'done'), w = (t.archives || []).find((x) => x.state === 'queued' || x.state === 'working');
          return '<div class="pbm-person"><span class="tx"><span data-noi18n>' + pbMsgEsc(t.a + ' · ' + t.b) + '</span> <span class="rl" data-noi18n>' + pbMsgEsc(t.messages + ' · ' + (t.last_at ? pbMsgTime(t.last_at) : '')) + '</span></span>'
            + (a ? (a.files || []).map((f) => '<button type="button" class="pbm-btn" data-path="' + pbMsgEsc(f.path) + '" data-ar="' + pbMsgEsc(a.id) + '" onclick="pbMsgDownload(this.dataset.path, this.dataset.ar)">Download</button>').join('') : '')
            + (w ? '<span class="rl">Being made</span>' : '<button type="button" class="pbm-btn" data-chat="' + pbMsgEsc(t.id) + '" onclick="pbMsgDmArchive(this.dataset.chat)">Save archive</button>') + '</div>'; }).join('')
        : '<p class="pbm-line">No direct messages yet.</p>');
  };
  window.pbMsgDmArchive = async function(id) {
    const uid = pbMsgUid(); if (!(await pbMsgCanAsk(uid))) { pbAlert('No signal. Try again when you have signal.', 'Archive'); return; }
    const r = await pbPermitRpc('pb_msg_archive_request', { p_chat: id, p_expect_uid: uid }, 20000);
    if (r && !r.error && r.data && r.data.ok) { pbAlert('The archive is being made. It shows here with a Download button in a few minutes.', 'Archive'); const el = pbMsgEl('pbmDmRec'); if (el) { el.hidden = true; window.pbMsgDmRecords(); } }
    else pbAlert(pbMsgCode(r) === 'pb:not_office' ? 'Only the company account can save direct messages.' : 'That could not be changed. Try again.', 'Archive');
  };
  // ---- message settings ----
  window.pbMsgOpenSettings = function() { pbGoto('msgSettings'); pbMsgPaintSettings(); pbMsgRefresh(true).then(pbMsgPaintSettings).catch(() => {}); };
  function pbMsgPaintSettings() {
    const L = pbMsg.list || {}, p = L.prefs || { push: true, words: true, quiet_on: true, quiet_from: '19:00', quiet_to: '06:00' };
    if (pbMsg.prefDirty) return;
    pbMsgEl('pbmPrefPush').checked = p.push !== false; pbMsgEl('pbmPrefWords').checked = p.words !== false; pbMsgEl('pbmPrefQuiet').checked = p.quiet_on !== false;
    pbMsgEl('pbmQuietFrom').value = p.quiet_from || '19:00'; pbMsgEl('pbmQuietTo').value = p.quiet_to || '06:00';
    pbMsgEl('pbmQuietTimes').hidden = p.quiet_on === false;
    const can = !!(L.me && L.me.can_retention); pbMsgEl('pbmRetSection').hidden = !can;
    document.querySelectorAll('#pbmRetToggle button').forEach((b) => { const on = b.dataset.val === (L.retention || 'forever'); b.classList.toggle('active', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  let pbMsgPrefT = null;
  window.pbMsgPrefsChanged = function() {
    pbMsg.prefDirty = true; pbMsgEl('pbmQuietTimes').hidden = !pbMsgEl('pbmPrefQuiet').checked;
    clearTimeout(pbMsgPrefT); pbMsgPrefT = setTimeout(pbMsgPrefsSave, 600);
  };
  async function pbMsgPrefsSave() {
    const uid = pbMsgUid(), say = (t) => { const m = pbMsgEl('pbmPrefMsg'); m.hidden = !t; m.textContent = t; };
    if (!(await pbMsgCanAsk(uid))) { say('No signal. Not saved yet: change it again when you have signal.'); pbMsg.prefDirty = false; return; }
    const a = { p_push: pbMsgEl('pbmPrefPush').checked, p_words: pbMsgEl('pbmPrefWords').checked, p_quiet_on: pbMsgEl('pbmPrefQuiet').checked, p_quiet_from: pbMsgEl('pbmQuietFrom').value || '19:00', p_quiet_to: pbMsgEl('pbmQuietTo').value || '06:00', p_expect_uid: uid };
    const r = await pbPermitRpc('pb_msg_prefs_set', a, 15000);
    pbMsg.prefDirty = false;
    if (r && !r.error && r.data && r.data.ok) { if (pbMsg.list) pbMsg.list.prefs = { push: a.p_push, words: a.p_words, quiet_on: a.p_quiet_on, quiet_from: a.p_quiet_from, quiet_to: a.p_quiet_to }; pbMsgSave(); say('Saved.'); }
    else say('Not saved. Try again.');
  }
  window.pbMsgRetention = function(v) {
    const L = pbMsg.list || {}; if ((L.retention || 'forever') === v) return;
    const go = async () => {
      const uid = pbMsgUid(), say = (t) => { const m = pbMsgEl('pbmRetMsg'); m.hidden = !t; m.textContent = t; };
      if (!(await pbMsgCanAsk(uid))) { say('No signal. Not changed.'); return; }
      const r = await pbPermitRpc('pb_msg_company_set', { p_retention: v, p_expect_uid: uid }, 15000);
      if (r && !r.error && r.data && r.data.ok) { L.retention = v; pbMsgSave(); pbMsgPaintSettings(); say('Saved.'); } else say(pbMsgCode(r) === 'pb:not_company_account' ? 'Only the company account or a manager can change this.' : 'Not changed. Try again.');
    };
    if (v === '13m') pbConfirm('Delete messages, photos and chat archives after 13 months? Anything older than 13 months is deleted for good every day after this, for the whole company.', go, 'Delete After 13 Months', { no: 'Keep Forever', yes: 'Delete After 13 Months' });
    else go();
  };
  // ---- wiring: screens, tabs, notifications, signal ----
  window.pbScreenTab = (inner => function(name) { return /^(messages|msgChat|msgInfo|msgSettings)$/.test(String(name)) ? 'home' : inner.apply(this, arguments); })(window.pbScreenTab);
  window.pbScreenHooks.push((name) => {
    try {
      if (name === 'home') { pbMsgPaintHome(); if (pbMsg.loaded) pbMsgRefresh(false).catch(() => {}); }
      if (name === 'messages') pbMsgPaintList();
      if (name === 'msgChat') pbMsgPaintChat();
      if (name !== 'msgChat' && pbMsg.editing) { pbMsg.editing = null; const t = pbMsgEl('pbmText'); if (t) t.value = ''; const e = pbMsgEl('pbmEditing'); if (e) e.hidden = true; }
      if (name === 'settings') { const b = pbMsgEl('settingsMsgBtn'); if (b) b.hidden = !pbMsgInCompany(pbMsgUid()); }
    } catch (e) { console.error(e); }
  });
  window.pbAccountLoadHooks.push((uid) => {
    pbMsg = Object.assign({}, pbMsg, { uid: null, loaded: false, list: null, chats: {}, out: [], photos: {}, cur: null, at: 0, draftPhotos: [], editing: null });
    // after the account's own start-up calls (8 s): messages never compete with records loading on a weak signal
    setTimeout(() => { const u = pbMsgUid(); if (!u) return; pbMsgLoad(u).then(() => { pbMsgPaintAll(); return pbMsgRefresh(true); }).catch(() => {}); }, 8000);
  });
  window.addEventListener('online', () => { setTimeout(() => { pbMsgFlush(); pbMsgRefresh(true).catch(() => {}); }, 2500); });
  window.addEventListener('offline', () => { try { pbMsgPaintAll(); } catch (e) {} });
  // a typed message is never lost by leaving the chat: it stays in the box; a message written (Send) is in the outbox already
  pbMsg.pollT = setInterval(() => {
    if (document.visibilityState === 'hidden' || navigator.onLine === false) return;
    if (pbCurrentScreen === 'msgChat' && pbMsg.cur && pbMsg.cur.id) pbMsgFetch(false);
    else if (pbCurrentScreen === 'messages') pbMsgRefresh(false).catch(() => {});
  }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && (pbCurrentScreen === 'home' || pbCurrentScreen === 'messages')) pbMsgRefresh(false).catch(() => {}); });
  // a message alert opens its chat: #/messages/<chat id> (the link is checked against unsaved work first, like every alert)
  window.pbPushRoutes['/messages'] = () => window.pbMsgOpenList();
  { const o = window.pbPushOpen; window.pbPushOpen = function(hash) { const m = /^#\/messages\/([0-9a-f-]{36})$/.exec(String(hash || '')); if (m) { pbMsg.pendingOpen = m[1]; return o.call(this, '#/messages'); } return o.apply(this, arguments); }; }
  // ================= end messaging_nov22 =================
