// locate811 (Nov 20): 811 Renew and History in the app (r17.10, unpatched) against a fake company server that answers
// the way sql/01_locate_renew_history.sql does (the same rules, in the page: FAKE below).
// A) today's server (no "renewals" / "log_n" on a ticket): no Renew, no History; Edit and Mark Closed as before.
// B) the server with 01 applied: Renew and History show; a renewal sends p_renewed_at and the new expiry; the card says
//    Renewed; History lists it with the old and new expiry; a second renewal counts; an Edit after it is not a renewal;
//    an expired ticket has no Renew; a renewal the server refuses (pb:renew_late) is shown, not lost; no signal: kept
//    and sent later; History with no signal says so; closed tickets keep their History; 390 px, no sideways scroll.
// Usage: PB_URL=http://127.0.0.1:9750/cur.html node t_loc811_renew_history.js   (one browser at a time)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const T=path.resolve(__dirname,'../../..');const co=require(T+'/rig/co');
const BASE=process.env.PB_URL||'http://127.0.0.1:9750/cur.html';
const OUT=process.env.PB_OUT||path.resolve(__dirname,'../out');try{fs.mkdirSync(OUT,{recursive:true});}catch(e){}
let fails=0,n=0;const ok=(c,m)=>{n++;console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
// fakesb with one addition: an override that returns {__error: 'text'} answers as an RPC error (as PostgREST does)
let FSB=fs.readFileSync(T+'/rig/fakesb.js','utf8');
{const a="return res(typeof o==='function'?o(a):o===undefined?null:o);";if(FSB.split(a).length!==2)throw new Error('fakesb changed');
 FSB=FSB.replace(a,"const v=typeof o==='function'?o(a):o===undefined?null:o;return v&&v.__error?Promise.resolve({data:null,error:{message:v.__error}}):res(v);");}
// the fake company server: mode 'old' = the live server on Nov 20; 'new' = with sql/01 applied
const FAKE=(mode)=>`;(function(){
  const day=(n)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const S=window.__srv={mode:${JSON.stringify(mode)},me:'Test Foreman',tickets:[],log:[],seq:0,refuse:null,day};
  const add=(id,no,called,exp,o)=>{const t=Object.assign({id,job_key:'j-100',job_number:'J-100',ticket_no:no,called_at:day(called),expires_at:day(exp),note:null,closed:false,closed_at:null,created_at:new Date(Date.now()-864e5*3).toISOString(),updated_at:new Date(Date.now()-864e5*3).toISOString(),version:1,by:'Maria Office',renewed_at:null,renewals:0},o||{});S.tickets.push(t);
    S.log.push({id:++S.seq,locate_id:id,action:'on_file',at:t.updated_at,by_name:t.by,ticket_no:t.ticket_no,called_at:t.called_at,expires_at:t.expires_at,renewed_at:null,closed:t.closed,expires_was:null,changes:{}});return t;};
  add('aaaaaaaa-0000-4000-8000-000000000001','A2611-501',-20,3);
  add('aaaaaaaa-0000-4000-8000-000000000002','A2610-777',-40,-5);
  add('aaaaaaaa-0000-4000-8000-000000000003','A2609-100',-70,-42,{closed:true,closed_at:new Date(Date.now()-864e5*30).toISOString()});
  const json=(t)=>{const j={id:t.id,job_key:t.job_key,job_number:t.job_number,ticket_no:t.ticket_no,called_at:t.called_at,expires_at:t.expires_at,note:t.note,closed:t.closed,closed_at:t.closed_at,created_at:t.created_at,updated_at:t.updated_at,version:t.version,by_name:t.by};
    if(S.mode==='new'){j.renewed_at=t.renewed_at;j.renewals=t.renewals;j.log_n=S.log.filter(g=>g.locate_id===t.id).length;}return j;};
  const list=()=>S.tickets.map(json);
  const NF=(n)=>({__error:'Could not find the function public.'+n+' in the schema cache'});
  window.__rpcOverride=Object.assign(window.__rpcOverride||{},{
    pb_prod_locates:(a)=>({ok:true,job_key:'j-100',locate_days:28,locates:list(),job:{job_number:a.p_job_number,project_name:'Main St Sewer',address:'500 Main St, Fresno, CA 93721'},server_at:new Date().toISOString()}),
    pb_prod_locates_mine:()=>({ok:true,locate_days:28,locates:list().filter(l=>!l.closed),server_at:new Date().toISOString()}),
    pb_prod_locate_log:(a)=>{if(S.mode!=='new')return NF('pb_prod_locate_log');if(S.logDown)return {__error:'Failed to fetch'};const t=S.tickets.find(x=>x.id===a.p_id);if(!t)return {__error:'pb:not_found'};
      const L=S.log.filter(g=>g.locate_id===t.id).sort((x,y)=>y.id-x.id);return {ok:true,id:t.id,total:L.length,log:L.slice(0,50),server_at:new Date().toISOString()};},
    pb_prod_locate_set:(a)=>{
      if('p_renewed_at' in a&&S.mode!=='new')return NF('pb_prod_locate_set(p_called_at, p_closed, p_expect_uid, p_expect_version, p_expires_at, p_id, p_job_number, p_note, p_renewed_at, p_ticket_no)');
      if(S.down)return {__error:'Failed to fetch'};
      if(S.refuse){const e=S.refuse;S.refuse=null;return {__error:e};}
      let t=S.tickets.find(x=>x.id===a.p_id);const ren0=a.p_renewed_at||null;
      if(ren0&&(ren0<a.p_called_at||a.p_expires_at<ren0||ren0>day(1)))return {__error:'pb:bad_date'};
      if(!t){t={id:a.p_id,job_key:'j-100',job_number:a.p_job_number,ticket_no:a.p_ticket_no,called_at:a.p_called_at,expires_at:a.p_expires_at,note:a.p_note,closed:!!a.p_closed,closed_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),version:1,by:S.me,renewed_at:ren0,renewals:ren0?1:0};S.tickets.push(t);
        S.log.push({id:++S.seq,locate_id:t.id,action:'added',at:t.updated_at,by_name:S.me,ticket_no:t.ticket_no,called_at:t.called_at,expires_at:t.expires_at,renewed_at:t.renewed_at,closed:t.closed,expires_was:null,changes:{}});
        return {ok:true,locate:json(t),locates:list(),server_at:new Date().toISOString()};}
      const ren=ren0||t.renewed_at,renewal=!!ren0&&(!t.renewed_at||ren0>t.renewed_at),closed=a.p_closed===null||a.p_closed===undefined?t.closed:!!a.p_closed;
      const same=a.p_ticket_no===t.ticket_no&&a.p_called_at===t.called_at&&a.p_expires_at===t.expires_at&&(a.p_note||null)===(t.note||null)&&closed===t.closed&&ren===t.renewed_at;
      if(a.p_expect_version!==t.version&&!same)return {ok:false,stale:true,code:'pb:stale',locate:json(t),locates:list(),server_at:new Date().toISOString()};
      if(renewal&&ren0>t.expires_at)return {__error:'pb:renew_late'};
      if(same)return {ok:true,same:true,locate:json(t),locates:list(),server_at:new Date().toISOString()};
      const ch={};[['ticket_no',a.p_ticket_no],['called_at',a.p_called_at],['expires_at',a.p_expires_at],['renewed_at',ren],['note',a.p_note||null]].forEach(([k,v])=>{if((t[k]||null)!==(v||null))ch[k]=[t[k]||null,v||null];});
      const act=closed&&!t.closed?'closed':!closed&&t.closed?'reopened':renewal?'renewed':'edited',was=t.expires_at;
      Object.assign(t,{ticket_no:a.p_ticket_no,called_at:a.p_called_at,expires_at:a.p_expires_at,note:a.p_note||null,closed,closed_at:closed?(t.closed_at||new Date().toISOString()):null,renewed_at:ren,renewals:t.renewals+(renewal?1:0),version:t.version+1,updated_at:new Date().toISOString(),by:S.me});
      S.log.push({id:++S.seq,locate_id:t.id,action:act,at:t.updated_at,by_name:S.me,ticket_no:t.ticket_no,called_at:t.called_at,expires_at:t.expires_at,renewed_at:t.renewed_at,closed:t.closed,expires_was:was,changes:ch});
      return {ok:true,locate:json(t),locates:list(),server_at:new Date().toISOString()};}
  });})();`;
async function boot(mode){
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FSB}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.route(/nominatim|openstreetmap/,r=>r.abort());
  await ctx.addInitScript(co+FAKE(mode));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(3500);
  await p.evaluate(()=>window.pbOpenLocates('J-100'));await p.waitForTimeout(1500);
  return {b,ctx,p};}
const txt=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?e.innerText.replace(/\s+/g,' ').trim():null;},id);
const has=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return !!e&&e.offsetParent!==null;},id);
const val=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?e.value:null;},id);
const sets=(p)=>p.evaluate(()=>(window.__rpcArgs||[]).filter(x=>x[0]==='pb_prod_locate_set').map(x=>x[1]));
const day=(p,n)=>p.evaluate(n=>window.__srv.day(n),n);
const wide=(p)=>p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('#screen-locates *').forEach(e=>{if(!e.offsetParent)return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>w+1||r.left<-1))bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.left)+'-'+Math.round(r.right));});return {scroll:document.documentElement.scrollWidth>w+1,bad:bad.slice(0,5)};});
const T1='aaaaaaaa-0000-4000-8000-000000000001',T2='aaaaaaaa-0000-4000-8000-000000000002',T3='aaaaaaaa-0000-4000-8000-000000000003';

(async()=>{
  // ---------- A) today's server ----------
  let {b,p}=await boot('old');
  ok(await has(p,'locT_'+T1)&&await has(p,'locEdit_'+T1)&&await has(p,'locClose_'+T1),'old server: the ticket shows with Edit and Mark Closed');
  ok(!(await has(p,'locRenew_'+T1))&&!(await p.$('#locLog_'+T1)),'old server: no Renew button, no History (the server sends no "renewals" / "log_n")');
  ok(!(await p.evaluate(()=>(window.__rpcLog||[]).includes('pb_prod_locate_log'))),'old server: the history RPC is never called');
  ok(!p.errs.length,'old server: no page errors '+JSON.stringify(p.errs.slice(0,2)));
  await b.close();

  // ---------- B) the server with sql/01 ----------
  ({b,p}=await boot('new'));
  const d0=await day(p,0),d3=await day(p,3),d28=await day(p,28);
  ok(await has(p,'locRenew_'+T1),'new server: Renew shows on an open ticket that has not expired');
  ok(!(await has(p,'locRenew_'+T2))&&/Expired/.test(await txt(p,'locNoDig_'+T2)||''),'an expired ticket has no Renew, and says "Don’t dig until a new ticket is valid": '+await txt(p,'locNoDig_'+T2));
  ok(/^History \(1\)/.test(await txt(p,'locLog_'+T1)||''),'History (1) on the ticket that was on file: '+await txt(p,'locLog_'+T1));
  await p.click('#locLog_'+T1+' summary');await p.waitForTimeout(600);
  const h0=await txt(p,'locLogBody_'+T1);
  ok(/On file/.test(h0)&&/Maria Office/.test(h0)&&/Called in .*, expires /.test(h0),'History opens: the "On file" row with who and the dates: '+h0);
  await p.click('#locLog_'+T1+' summary');
  // the renewal form
  await p.click('#locRenew_'+T1);await p.waitForTimeout(400);
  const form=await txt(p,'locForm');
  ok(/Renew ticket A2611-501/.test(form)&&/Now expires/.test(form),'Renew form: "Renew ticket A2611-501", "Now expires …": '+form.slice(0,140));
  ok(await val(p,'locRen')===d0&&await val(p,'locExp')===d28,'Renew form: renewed today, new expiry 28 days on (California): '+await val(p,'locRen')+' -> '+await val(p,'locExp'));
  ok(/California/.test(await txt(p,'locExpHelp')||''),'Renew form: the help line names the state’s rule: '+await txt(p,'locExpHelp'));
  await p.screenshot({path:OUT+'/renew_form_390.png'});
  const before=(await sets(p)).length;
  await p.click('#locSave');await p.waitForTimeout(1500);
  const S1=(await sets(p)).slice(before);
  ok(S1.length===1&&S1[0].p_renewed_at===d0&&S1[0].p_expires_at===d28&&S1[0].p_id===T1&&S1[0].p_expect_version===1&&S1[0].p_ticket_no==='A2611-501','one save went: p_renewed_at today, the new expiry, the ticket id and version: '+JSON.stringify(S1[0]));
  const card=await txt(p,'locT_'+T1);
  ok(/Renewed /.test(card)&&!/times\)/.test(card)&&/28 days left|Expires/.test(card)&&!(await p.$('#locPend_'+T1)),'the card says Renewed, 28 days left, nothing waiting: '+card.slice(0,160));
  ok(/^History \(2\)/.test(await txt(p,'locLog_'+T1)||''),'History (2) after the renewal');
  await p.click('#locLog_'+T1+' summary');await p.waitForTimeout(600);
  const h1=await txt(p,'locLogBody_'+T1);
  ok(/^Renewed · .*Test Foreman.*Expires .* → .*Renewed — → /.test(h1)&&h1.indexOf('Renewed')<h1.indexOf('On file'),'History: the renewal first (who, old → new expiry), then On file: '+h1);
  await p.screenshot({path:OUT+'/history_390.png',fullPage:false});
  const w1=await wide(p);ok(!w1.scroll&&!w1.bad.length,'390 px: no sideways scroll with History open '+JSON.stringify(w1));
  // a second renewal the next day would be d+1; the app allows "today" again only as an edit, so renew with tomorrow's date typed
  await p.click('#locRenew_'+T1);await p.waitForTimeout(300);
  const d1=await day(p,1),d29=await day(p,29);
  await p.fill('#locRen',d1);await p.dispatchEvent('#locRen','change');await p.waitForTimeout(200);
  ok(await val(p,'locExp')===d29,'changing the renewal day moves the new expiry with it: '+await val(p,'locExp'));
  await p.click('#locSave');await p.waitForTimeout(1500);
  ok(/Renewed .*\(2 times\)/.test(await txt(p,'locT_'+T1)),'a second renewal: "(2 times)": '+(await txt(p,'locT_'+T1)).slice(0,120));
  // an Edit after a renewal carries the renewal day and is not counted as one
  await p.click('#locEdit_'+T1);await p.waitForTimeout(300);
  await p.fill('#locNote','North side of Main St');await p.click('#locSave');await p.waitForTimeout(1500);
  const S3=(await sets(p)).pop(),srv=await p.evaluate(id=>{const t=window.__srv.tickets.find(x=>x.id===id);return {renewals:t.renewals,note:t.note,last:window.__srv.log[window.__srv.log.length-1].action};},T1);
  ok(S3.p_renewed_at===d1&&srv.renewals===2&&srv.note==='North side of Main St'&&srv.last==='edited','an Edit after it: sends the renewal day on file, the server counts no new renewal and logs "edited": '+JSON.stringify(srv));
  await p.waitForTimeout(300);
  if(!(await p.evaluate(id=>document.getElementById('locLog_'+id).open,T1))){await p.click('#locLog_'+T1+' summary');}await p.waitForTimeout(700);
  const h2=await txt(p,'locLogBody_'+T1);
  ok(/^Edited · .*Where — → North side of Main St/.test(h2)&&(h2.match(/Renewed ·/g)||[]).length===2,'History (4): Edited (Where — → …), two renewals, On file: '+h2.slice(0,200));
  // a renewal the server refuses is shown on the ticket, with Fix and Send Again / Discard
  await p.evaluate(()=>{window.__srv.refuse='pb:renew_late';});
  await p.click('#locRenew_'+T1);await p.waitForTimeout(300);await p.fill('#locExp',await day(p,30));await p.dispatchEvent('#locExp','change');await p.click('#locSave');await p.waitForTimeout(1500);
  const pend=await txt(p,'locPend_'+T1);
  ok(/Not accepted/.test(pend)&&/811 only renews a ticket before it expires/.test(pend)&&await has(p,'locFix_'+T1)&&await has(p,'locDiscard_'+T1),'refused by the server (pb:renew_late): "Not accepted", why, Fix and Send Again / Discard: '+pend);
  await p.click('#locDiscard_'+T1);await p.waitForTimeout(300);
  {const m=await p.evaluate(()=>{const o=document.querySelector('.pb-modal-overlay.show, .pb-modal.show, [role="dialog"]:not([hidden])');if(!o)return null;const bs=[...o.querySelectorAll('button')].filter(x=>x.offsetParent);const y=bs.find(x=>/discard|yes|ok/i.test(x.textContent));if(y)y.click();return bs.map(x=>x.textContent.trim());});await p.waitForTimeout(500);
   ok(!(await p.$('#locPend_'+T1))&&await has(p,'locRenew_'+T1),'Discard: back to the server’s copy, Renew is there again '+JSON.stringify(m));}
  // no signal: the renewal is kept on the phone and sent later
  await p.evaluate(()=>{window.__srv.down=true;});
  await p.click('#locRenew_'+T1);await p.waitForTimeout(300);await p.fill('#locExp',await day(p,31));await p.dispatchEvent('#locExp','change');await p.click('#locSave');await p.waitForTimeout(1500);
  ok(/Waiting to send/.test(await txt(p,'locPend_'+T1)||'')||/Saved on this phone/.test(await txt(p,'locStatus')||''),'no answer from the server: kept on this phone, waiting to send: '+(await txt(p,'locPend_'+T1))+' / '+(await txt(p,'locStatus')));
  const kept=await p.evaluate(()=>{const s=window.__debugLocates();return s.st.queue.filter(q=>q.state==='waiting').map(q=>({r:q.renewed_at,e:q.expires_at}));});
  ok(kept.length===1&&kept[0].e===await day(p,31),'the renewal is in the phone’s queue with its dates: '+JSON.stringify(kept));
  await p.evaluate(()=>{window.__srv.down=false;window.dispatchEvent(new Event('online'));});
  await p.evaluate(()=>window.pbOpenLocates('J-100'));await p.waitForTimeout(2500);
  const srv2=await p.evaluate(id=>{const t=window.__srv.tickets.find(x=>x.id===id);return {exp:t.expires_at,renewals:t.renewals};},T1);
  ok(srv2.exp===await day(p,31)&&!(await p.$('#locPend_'+T1)),'signal back: it was sent (the server has the new expiry), nothing waiting: '+JSON.stringify(srv2));
  // History with no signal
  await p.evaluate(()=>{window.__srv.logDown=true;});
  await p.click('#locLog_'+T2+' summary');await p.waitForTimeout(600);
  ok(/Loads with signal/.test(await txt(p,'locLogBody_'+T2)||''),'History with no signal: "Loads with signal.": '+await txt(p,'locLogBody_'+T2));
  await p.evaluate(()=>{window.__srv.logDown=false;});
  // closed tickets keep their History; Mark Closed and Reopen are rows
  await p.click('#locClose_'+T2);await p.waitForTimeout(300);
  await p.evaluate(()=>{const o=[...document.querySelectorAll('button')].filter(x=>x.offsetParent&&/^(close ticket|mark closed|yes|ok|close)$/i.test(x.textContent.trim())&&x.closest('.pb-modal, .pb-modal-overlay, [role="dialog"]'));if(o[0])o[0].click();});await p.waitForTimeout(1500);
  const cl=await p.evaluate(id=>{const t=window.__srv.tickets.find(x=>x.id===id);return {closed:t.closed,last:window.__srv.log[window.__srv.log.length-1].action};},T2);
  ok(cl.closed&&cl.last==='closed','Mark Closed: the server closes it and logs "closed": '+JSON.stringify(cl));
  await p.evaluate(()=>{const d=document.getElementById('locClosed');if(d)d.open=true;});await p.waitForTimeout(200);
  ok(/^History \(2\)/.test(await txt(p,'locLog_'+T2)||'')&&/^History \(1\)/.test(await txt(p,'locLog_'+T3)||'')&&!(await p.$('#locRenew_'+T2)),'closed tickets keep History (2 and 1) and have no Renew');
  const reopened=await p.evaluate(id=>document.getElementById('locLog_'+id).open,T2); // it was open (the failed load above) when the screen redrew
  if(!reopened)await p.click('#locLog_'+T2+' summary');await p.waitForTimeout(900);
  console.log('note: History of '+T2.slice(-1)+' redrawn open='+reopened+', body: '+((await txt(p,'locLogBody_'+T2))||'(empty)').slice(0,60));
  ok(/^Closed · /.test(await txt(p,'locLogBody_'+T2)||''),'closed ticket’s History starts with Closed: '+(await txt(p,'locLogBody_'+T2)).slice(0,120));
  const w2=await wide(p);ok(!w2.scroll&&!w2.bad.length,'390 px: no sideways scroll at the end '+JSON.stringify(w2));
  await p.screenshot({path:OUT+'/locates_390.png',fullPage:true});
  ok(!p.errs.length,'new server: no page errors '+JSON.stringify(p.errs.slice(0,2)));
  await b.close();
  console.log((fails?'FAILED ':'ALL PASS ')+(n-fails)+'/'+n);process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
