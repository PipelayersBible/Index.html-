// locate_form_nov20: the Renew form and the new-ticket form apply the job's state rule without showing it.
// Fake company server: the one from locate811_nov20 (answers as sql/01_locate_renew_history.sql does, now live).
// California, Nevada (third renewal), Utah (from the old expiry), Texas + Florida (new number), dig-day states
// (Colorado, Alabama, Iowa), a state with no confirmed life (Ohio), the one-state rule sheet, old tickets, 10 arguments.
// Usage: PB_URL=http://127.0.0.1:9900/cur.html node t_loc_form_state_rule.js   (one browser at a time)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const T=path.resolve(__dirname,'../../..');const co=require(T+'/rig/co');
const BASE=process.env.PB_URL||'http://127.0.0.1:9900/cur.html';
const OUT=process.env.PB_OUT||path.resolve(__dirname,'../out');try{fs.mkdirSync(OUT,{recursive:true});}catch(e){}
let fails=0,n=0;const ok=(c,m)=>{n++;console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
let FSB=fs.readFileSync(T+'/rig/fakesb.js','utf8');
{const a="return res(typeof o==='function'?o(a):o===undefined?null:o);";if(FSB.split(a).length!==2)throw new Error('fakesb changed');
 FSB=FSB.replace(a,"const v=typeof o==='function'?o(a):o===undefined?null:o;return v&&v.__error?Promise.resolve({data:null,error:{message:v.__error}}):res(v);");}
// the same fake server as the locate811 test, taken from its file so the two can't drift
const SRC=fs.readFileSync(T+'/staged/locate811_nov20/tests/t_loc811_renew_history.js','utf8');
const a0=SRC.indexOf('const FAKE='),a1=SRC.indexOf('async function boot');if(a0<0||a1<0)throw new Error('locate811 test changed');
const FAKE=eval('('+SRC.slice(a0+'const FAKE='.length,a1).trim().replace(/;$/,'')+')');
async function boot(mode){
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FSB}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.route(/nominatim|openstreetmap/,r=>r.abort());
  await ctx.addInitScript(co+FAKE(mode));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(3500);
  // two more open tickets, never renewed
  await p.evaluate(()=>{const S=window.__srv,mk=(id,no,c,x)=>{const t={id,job_key:'j-100',job_number:'J-100',ticket_no:no,called_at:S.day(c),expires_at:S.day(x),note:null,closed:false,closed_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),version:1,by:'Maria Office',renewed_at:null,renewals:0};S.tickets.push(t);
    S.log.push({id:++S.seq,locate_id:id,action:'on_file',at:t.updated_at,by_name:t.by,ticket_no:no,called_at:t.called_at,expires_at:t.expires_at,renewed_at:null,closed:false,expires_was:null,changes:{}});};
    mk('aaaaaaaa-0000-4000-8000-000000000004','B2611-004',-10,4);mk('aaaaaaaa-0000-4000-8000-000000000005','B2611-005',-5,20);});
  await p.evaluate(()=>window.pbOpenLocates('J-100'));await p.waitForTimeout(1500);
  return {b,ctx,p};}
const txt=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?e.innerText.replace(/\s+/g,' ').trim():null;},id);
const has=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return !!e&&e.offsetParent!==null;},id);
const val=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?e.value:null;},id);
const sets=(p)=>p.evaluate(()=>(window.__rpcArgs||[]).filter(x=>x[0]==='pb_prod_locate_set').map(x=>x[1]));
const day=(p,n)=>p.evaluate(n=>window.__srv.day(n),n);
const state=async(p,c)=>{await p.evaluate(c=>window.pbLocSrSet(c),c);await p.waitForTimeout(350);};
const srvT=(p,id)=>p.evaluate(id=>{const S=window.__srv,t=S.tickets.find(x=>x.id===id),g=S.log.filter(x=>x.locate_id===id).pop();return {no:t.ticket_no,exp:t.expires_at,ren:t.renewed_at,renewals:t.renewals,last:g.action,ch:g.changes};},id);
const modal=(p)=>p.evaluate(()=>{const o=[...document.querySelectorAll('.pb-modal-overlay.show, .pb-modal.show, [role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden])')].find(e=>e.offsetParent!==null||e.getClientRects().length);return o?o.innerText.replace(/\s+/g,' ').trim():null;});
const modalOk=(p)=>p.evaluate(()=>{const o=[...document.querySelectorAll('.pb-modal-overlay.show, .pb-modal.show, [role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden])')].find(e=>e.getClientRects().length);if(!o)return false;const y=[...o.querySelectorAll('button')].find(x=>/^ok$/i.test(x.textContent.trim()));if(y)y.click();return !!y;});
const wide=(p)=>p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('#screen-locates *, #pbSrView *').forEach(e=>{if(!e.offsetParent)return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>w+1||r.left<-1))bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.left)+'-'+Math.round(r.right));});return {scroll:document.documentElement.scrollWidth>w+1,bad:bad.slice(0,5)};});
const T1='aaaaaaaa-0000-4000-8000-000000000001',T2='aaaaaaaa-0000-4000-8000-000000000002',T4='aaaaaaaa-0000-4000-8000-000000000004',T5='aaaaaaaa-0000-4000-8000-000000000005';
const RULEWORDS=/is good for|are good for|calendar days|working days|business days|from the renewal day|Check your state/i; // rule text that must not be on a form

(async()=>{
  let {b,p}=await boot('new');
  const d0=await day(p,0),d1=await day(p,1),d3=await day(p,3),d4=await day(p,4);

  // ---------- California (the job address): the ticket and its link ----------
  ok(/^California rule/.test(await txt(p,'locRule_'+T1)||''),'ticket: one small "California rule ›" link: '+await txt(p,'locRule_'+T1));
  const tap=await p.evaluate(id=>{const r=document.getElementById('locRule_'+id).getBoundingClientRect();return Math.round(r.height);},T1);
  ok(tap>=44,'the link is a full-size tap target ('+tap+' px)');
  await p.click('#locRenew_'+T1);await p.waitForTimeout(400);
  let form=await txt(p,'locForm');
  ok(await val(p,'locRen')===d0&&await val(p,'locExp')===await day(p,28),'California renewal: today + 28 days, filled in: '+await val(p,'locExp'));
  ok(!RULEWORDS.test(form)&&!(await has(p,'locExpHelp'))&&!(await p.$('#locNo')),'California Renew form: no rule text, no help line, no number box: '+form);
  ok(/^California rule/.test(await txt(p,'locRuleLink')||''),'Renew form: the same link');
  await p.screenshot({path:OUT+'/renew_ca_390.png'});
  // typing a date of your own still says so, and clearing goes back to the rule
  await p.fill('#locExp',await day(p,20));await p.dispatchEvent('#locExp','change');
  ok(/^Your own date\. Clear it to use California’s rule\.$/.test(await txt(p,'locExpHelp')||''),'own date typed: "'+await txt(p,'locExpHelp')+'"');
  await p.fill('#locExp','');await p.dispatchEvent('#locExp','change');
  ok(await val(p,'locExp')===await day(p,28)&&!(await has(p,'locExpHelp')),'cleared: back to the state date, help line gone');
  let before=(await sets(p)).length;
  await p.click('#locSave');await p.waitForTimeout(1500);
  let S=(await sets(p)).slice(before);
  ok(S.length===1&&Object.keys(S[0]).length===10&&S[0].p_renewed_at===d0&&S[0].p_ticket_no==='A2611-501','the save is the 10-argument call (p_renewed_at with the usual nine), number unchanged: '+Object.keys(S[0]).sort().join(','));
  ok((await srvT(p,T1)).renewals===1&&(await srvT(p,T1)).last==='renewed','server: renewal 1 recorded');

  // ---------- the rule sheet: that state only ----------
  await p.click('#locRule_'+T1);await p.waitForTimeout(300);
  let sheet=await txt(p,'pbLocRuleCard');
  ok(/^California 811 rule/.test(sheet)&&/28 days/.test(sheet)&&/Checked Nov 19, 2026/.test(sheet),'sheet: "California 811 rule", its ticket life, the day checked: '+sheet.slice(0,200));
  const shape=await p.evaluate(()=>{const c=document.getElementById('pbLocRuleCard');return {sel:c.querySelectorAll('select').length,secs:c.querySelectorAll('.pbsr-sec').length,links:c.querySelectorAll('#pbLocRuleSrc a').length,h:Math.round(c.getBoundingClientRect().height),other:/Utah|Nevada|Texas|Florida/.test(c.innerText)};});
  ok(shape.sel===0&&!shape.other&&shape.secs<=4&&shape.links>=1&&shape.h<=844,'sheet: no state list, no other state, 4 short sections, sources behind one fold, fits one screen: '+JSON.stringify(shape));
  const w0=await wide(p);ok(!w0.scroll&&!w0.bad.length,'390 px: no sideways scroll with the sheet open '+JSON.stringify(w0));
  await p.screenshot({path:OUT+'/rule_sheet_ca_390.png'});
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  ok(!(await p.$('#pbSrView'))&&await p.evaluate(id=>document.activeElement&&document.activeElement.id==='locRule_'+id,T1),'Escape closes it; focus is back on the link');

  // ---------- new ticket form: the rule is applied, not shown ----------
  await p.click('#locAddBtn');await p.waitForTimeout(400);
  form=await txt(p,'locForm');
  ok(await val(p,'locExp')===await day(p,28)&&!RULEWORDS.test(form)&&!(await has(p,'locExpHelp'))&&!(await has(p,'locRuleHelp'))&&await has(p,'locRuleLink'),'new ticket (California): expiry filled in, no rule paragraphs, the link: '+form);
  ok(/Can dig from/.test(form)&&/Start work by/.test(form),'new ticket: "Can dig from / Start work by" dates still shown');
  await p.screenshot({path:OUT+'/new_ticket_ca_390.png'});
  await p.click('#locCancel');await p.waitForTimeout(200);

  // ---------- Nevada: two renewals, then a plain message ----------
  await state(p,'NV');
  ok(/^Nevada rule/.test(await txt(p,'locRule_'+T1)||''),'job set to Nevada: the link follows');
  await p.click('#locRenew_'+T1);await p.waitForTimeout(400);
  ok(await has(p,'locForm')&&!(await modal(p)),'Nevada, second renewal: the form opens, no message');
  await p.fill('#locRen',d1);await p.dispatchEvent('#locRen','change');
  ok(await val(p,'locExp')===await day(p,29),'Nevada: 28 days from the renewal day: '+await val(p,'locExp'));
  await p.click('#locSave');await p.waitForTimeout(1500);
  ok((await srvT(p,T1)).renewals===2,'server: renewal 2 recorded');
  before=(await sets(p)).length;
  await p.click('#locRenew_'+T1);await p.waitForTimeout(500);
  const nv=await modal(p);
  ok(nv&&/Nevada allows two renewals on a ticket, and this one has had both\. Call in a new ticket at least 2 working days before this one runs out, and add it here\./.test(nv)&&!(await p.$('#locForm')),'Nevada, third renewal: a plain message, no form: '+nv);
  await p.screenshot({path:OUT+'/nevada_third_390.png'});
  await modalOk(p);await p.waitForTimeout(300);
  ok((await sets(p)).length===before&&await has(p,'locAddBtn'),'nothing was sent; Add Dig Ticket is right there');
  await state(p,'CA');
  await p.click('#locRenew_'+T1);await p.waitForTimeout(400);
  ok(await has(p,'locForm'),'the same ticket on a California job: no limit, the form opens');
  await p.click('#locCancel');await p.waitForTimeout(200);

  // ---------- Utah: 21 days from the OLD expiry ----------
  await state(p,'UT');
  await p.click('#locRenew_'+T4);await p.waitForTimeout(400);
  form=await txt(p,'locForm');
  ok(await val(p,'locExp')===await day(p,25),'Utah: old expiry (today+4) + 21 days = today+25, not today+21: '+await val(p,'locExp'));
  await p.fill('#locRen',await day(p,-1));await p.dispatchEvent('#locRen','change');
  ok(await val(p,'locExp')===await day(p,25),'Utah: changing the renewal day does not move it');
  ok(!RULEWORDS.test(form)&&!/54-8a/.test(form),'Utah Renew form: no rule text: '+form);
  await p.fill('#locRen',d0);await p.dispatchEvent('#locRen','change');
  ok(await has(p,'locNo')&&await val(p,'locNo')==='','Utah: asks for the new ticket number (Blue Stakes: an Update has a different number)');
  await p.fill('#locNo','B2611-004');
  await p.click('#locSave');await p.waitForTimeout(1500);
  ok((await srvT(p,T4)).exp===await day(p,25)&&(await srvT(p,T4)).renewals===1,'server: Utah renewal saved with the right expiry');
  await p.click('#locRule_'+T4);await p.waitForTimeout(300);
  sheet=await txt(p,'pbLocRuleCard');
  ok(/^Utah 811 rule/.test(sheet)&&/21 days from the old expiry/.test(sheet)&&/counts a renewal from the old expiry\. It asks for the new ticket number\./.test(sheet),'Utah sheet says how a renewal counts: '+sheet.slice(0,330));
  await p.click('#pbLocRuleClose');await p.waitForTimeout(200);

  // ---------- Texas: a new ticket number ----------
  await state(p,'TX');
  await p.click('#locRenew_'+T4);await p.waitForTimeout(400);
  form=await txt(p,'locForm');
  ok(await has(p,'locNo')&&await val(p,'locNo')===''&&/New ticket number/.test(form)&&/Renew ticket B2611-004/.test(form),'Texas: the form asks for the new ticket number (empty), under "Renew ticket B2611-004": '+form);
  ok(!RULEWORDS.test(form)&&!/previous/i.test(form),'Texas Renew form: no rule text');
  await p.screenshot({path:OUT+'/renew_tx_390.png'});
  await p.fill('#locRen',d1);await p.dispatchEvent('#locRen','change');
  const txExp=await p.evaluate(d=>window.pbSrMath.expires(d,'TX'),d1);
  ok(await val(p,'locExp')===txExp,'Texas: 14 working days from the day called in again: '+await val(p,'locExp'));
  before=(await sets(p)).length;
  await p.click('#locSave');await p.waitForTimeout(400);
  ok(/Enter the new ticket number from 811\./.test(await txt(p,'locErr')||'')&&(await sets(p)).length===before,'Texas, number left blank: "'+await txt(p,'locErr')+'", nothing sent');
  await p.fill('#locNo','  2653 1234 99 ');await p.click('#locSave');await p.waitForTimeout(1500);
  S=(await sets(p)).slice(before);let sv=await srvT(p,T4);
  ok(S.length===1&&Object.keys(S[0]).length===10&&S[0].p_ticket_no==='2653 1234 99'&&S[0].p_renewed_at===d1&&S[0].p_id===T4,'Texas: one 10-argument save on the same ticket with the new number: '+JSON.stringify(S[0]));
  ok(sv.no==='2653 1234 99'&&sv.last==='renewed'&&sv.renewals===2&&sv.ch.ticket_no&&sv.ch.ticket_no[0]==='B2611-004','server: renewed, and History holds the old number: '+JSON.stringify(sv.ch));
  ok(/Ticket 2653 1234 99/.test(await txt(p,'locT_'+T4)),'the card shows the new number');
  await p.click('#locLog_'+T4+' summary');await p.waitForTimeout(700);
  const hist=await txt(p,'locLogBody_'+T4);
  ok(/^Renewed · /.test(hist)&&/B2611-004 → 2653 1234 99/.test(hist),'History on the phone: Renewed, "B2611-004 → 2653 1234 99": '+hist.slice(0,200));
  await p.click('#locLog_'+T4+' summary');

  // ---------- Florida: a new ticket number, 30 days ----------
  await state(p,'FL');
  await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
  ok(await has(p,'locNo')&&await val(p,'locExp')===await day(p,30),'Florida: asks for the new number; 30 days from today: '+await val(p,'locExp'));
  await p.fill('#locNo','325601234');before=(await sets(p)).length;await p.click('#locSave');await p.waitForTimeout(1500);
  S=(await sets(p)).slice(before);sv=await srvT(p,T5);
  ok(S.length===1&&Object.keys(S[0]).length===10&&sv.no==='325601234'&&sv.ch.ticket_no[0]==='B2611-005'&&sv.exp===await day(p,30),'Florida: saved (10 arguments), old number in History: '+JSON.stringify(sv));
  await p.click('#locRule_'+T5);await p.waitForTimeout(300);
  sheet=await txt(p,'pbLocRuleCard');
  ok(/^Florida 811 rule/.test(sheet)&&/asks for the new ticket number\. The old one stays in History/.test(sheet)&&!/Texas|Utah/.test(sheet),'Florida sheet: only Florida, says the app asks for the new number');
  await p.click('#pbLocRuleClose');await p.waitForTimeout(200);

  // ---------- dig-day states: the life from the renewal day, the wait not added again ----------
  const calc=(c,d)=>p.evaluate(([c,d])=>({ren:window.__debugLocRen.exp(d,'',null),neu:window.pbSrMath.expires(d,c),dig:window.pbSrMath.canDig(d,c),from:window.pbSrMath.row(c).life.from}),[c,d]);
  await state(p,'CO');
  await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
  let k=await calc('CO',d0);
  ok(k.from==='dig'&&await val(p,'locExp')===await day(p,30)&&k.neu>await day(p,30),'Colorado renewal: 30 days from today ('+await val(p,'locExp')+'); a new ticket called in today would run to '+k.neu+' (first dig day '+k.dig+')');
  ok(!(await p.$('#locNo'))&&!RULEWORDS.test(await txt(p,'locForm')),'Colorado Renew form: no number box, no rule text');
  await p.click('#locCancel');await p.waitForTimeout(200);
  await p.click('#locAddBtn');await p.waitForTimeout(400);
  ok(await val(p,'locExp')===k.neu,'Colorado NEW ticket: still counted from the first legal dig day: '+await val(p,'locExp'));
  await p.click('#locCancel');await p.waitForTimeout(200);
  await state(p,'AL');
  await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
  const al=await p.evaluate(d=>{let x=d,c=0,g=0;const add=(s)=>{const t=new Date(s+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+1);return t.toISOString().slice(0,10);};while(c<20&&g++<200){x=add(x);if(window.pbSrMath.workDay(x,'AL',true))c++;}return x;},d0);
  k=await calc('AL',d0);
  ok(await val(p,'locExp')===al&&al<=k.neu,'Alabama renewal: 20 working days from today ('+al+'), never later than a new ticket’s '+k.neu);
  await p.click('#locCancel');await p.waitForTimeout(200);
  for(const [c,nm] of [['GA','Georgia'],['VA','Virginia'],['MI','Michigan']]){await state(p,c);await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
    ok(await has(p,'locNo')&&await val(p,'locNo')===''&&/New ticket number/.test(await txt(p,'locForm')),nm+': Renew asks for the new ticket number');
    await p.click('#locCancel');await p.waitForTimeout(200);}
  const tbl=await p.evaluate(()=>{const t=window.__debugLocRen.table;return Object.keys(t).filter(k=>t[k].no).sort().join(' ');});
  ok(tbl==='CT FL GA IA IN ME MI MN NC NJ OK OR TN TX UT VA WA','new-number states: '+tbl);
  await state(p,'IA');
  await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
  ok(await has(p,'locNo'),'Iowa: Renew asks for the new ticket number');
  ok(await val(p,'locExp')===await day(p,24),'Iowa renewal: 25 days counting today = today+24: '+await val(p,'locExp'));
  await p.click('#locCancel');await p.waitForTimeout(200);
  // every state: a renewal is never later than the old way of counting it (except Utah, by law from the old expiry)
  const all=await p.evaluate(d=>{const bad=[];let k=0;for(const c of window.pbSrMath.codes()){if(!window.pbSrMath.row(c).life)continue;window.pbLocSrSet(c);const r=window.__debugLocRen.exp(d,'',null),nw=window.pbSrMath.expires(d,c);k++;if(!r||r>nw||r<=d)bad.push(c+':'+r+'/'+nw);}return {k,bad};},d0);
  ok(all.k>=35&&!all.bad.length,'all '+all.k+' states with a ticket life: a renewal counted from the renewal day is never later than a new ticket called in that day '+JSON.stringify(all.bad));
  await p.waitForTimeout(400);
  // ---------- a state with no confirmed ticket life ----------
  await state(p,'OH');
  await p.click('#locRenew_'+T5);await p.waitForTimeout(400);
  ok(await val(p,'locExp')===''&&/^Enter the new expiry 811 gave you\.$/.test(await txt(p,'locExpHelp')||''),'Ohio (no set life): expiry left blank, "'+await txt(p,'locExpHelp')+'"');
  await p.click('#locSave');await p.waitForTimeout(300);
  ok(/Pick the new expiry/.test(await txt(p,'locErr')||''),'Ohio: it can’t be saved without the expiry');
  await p.click('#locCancel');await p.waitForTimeout(200);
  await p.click('#locRule_'+T5);await p.waitForTimeout(300);
  ok(/^Ohio 811 rule/.test(await txt(p,'pbLocRuleCard')||''),'Ohio sheet opens: '+(await txt(p,'pbLocRuleCard')).slice(0,160));
  await p.click('#pbLocRuleClose');await p.waitForTimeout(200);

  // ---------- old tickets still open; Edit of a renewed ticket ----------
  await state(p,'CA');
  ok(await has(p,'locT_'+T2)&&await has(p,'locRule_'+T2),'the expired ticket is still listed, with its link');
  await p.click('#locEdit_'+T2);await p.waitForTimeout(400);
  ok(await val(p,'locNo')==='A2610-777'&&/^Your own date/.test(await txt(p,'locExpHelp')||''),'Edit on the expired ticket opens with its number and dates');
  await p.click('#locCancel');await p.waitForTimeout(200);
  await p.click('#locEdit_'+T4);await p.waitForTimeout(400);
  ok(await val(p,'locNo')==='2653 1234 99'&&/^Renewed /.test(await txt(p,'locExpHelp')||'')&&!RULEWORDS.test(await txt(p,'locForm')),'Edit on a renewed ticket: "'+await txt(p,'locExpHelp')+'"');
  await p.fill('#locNote','South side');before=(await sets(p)).length;await p.click('#locSave');await p.waitForTimeout(1500);
  S=(await sets(p)).slice(before);sv=await srvT(p,T4);
  ok(S.length===1&&sv.last==='edited'&&sv.renewals===2,'that Edit is logged Edited, not a renewal: '+JSON.stringify({last:sv.last,renewals:sv.renewals}));
  const w1=await wide(p);ok(!w1.scroll&&!w1.bad.length,'390 px: no sideways scroll on the ticket list '+JSON.stringify(w1));
  await p.screenshot({path:OUT+'/locates_390.png',fullPage:true});
  ok(!p.errs.length,'no page errors '+JSON.stringify(p.errs.slice(0,2)));
  await b.close();

  // ---------- tickets from before the server update (no "renewals" field) ----------
  ({b,p}=await boot('old'));
  ok(await has(p,'locT_'+T1)&&!(await has(p,'locRenew_'+T1))&&await has(p,'locRule_'+T1),'old-style tickets: listed, no Renew, the rule link is there');
  await p.click('#locEdit_'+T1);await p.waitForTimeout(400);
  ok(await val(p,'locNo')==='A2611-501','old-style ticket opens in Edit');
  await p.fill('#locNote','East alley');before=(await sets(p)).length;await p.click('#locSave');await p.waitForTimeout(1500);
  S=(await sets(p)).slice(before);
  ok(S.length===1&&Object.keys(S[0]).length===9&&!('p_renewed_at' in S[0]),'a plain save is still the 9-argument call: '+Object.keys(S[0]).length+' arguments');
  await p.click('#locAddBtn');await p.waitForTimeout(400);await p.fill('#locNo','A2611-900');before=(await sets(p)).length;await p.click('#locSave');await p.waitForTimeout(1500);
  S=(await sets(p)).slice(before);
  ok(S.length===1&&Object.keys(S[0]).length===9&&S[0].p_expires_at===await day(p,28),'a new ticket saves (9 arguments) with California’s date');
  ok(!p.errs.length,'old server: no page errors '+JSON.stringify(p.errs.slice(0,2)));
  await b.close();
  console.log((fails?'FAILED ':'ALL PASS ')+(n-fails)+'/'+n);process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
