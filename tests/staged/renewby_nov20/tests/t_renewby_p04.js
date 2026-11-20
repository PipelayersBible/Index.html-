// renewby_nov20 (p04): the Renew-by table after the "find the renew-by deadlines" research.
// CT IL MO NC NM leave the "not confirmed" group; South Carolina loses its Renew-by line (extend any time before
// expiry); DE FL KS SD WY keep the first-call wait and the rule sheet says it is not confirmed; Illinois 25 working days.
// Harness = locate_round3_nov20/tests/t_loc_round3.js (its lines 6-47), page clock Mon Jun 1 2026. One browser.
// Usage: PB_URL=http://127.0.0.1:9967/cur.html NODE_PATH=/opt/npm-tools/node_modules node t_renewby_p04.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const T=path.resolve(__dirname,'../../..');const co=require(T+'/rig/co');
const BASE=process.env.PB_URL||'http://127.0.0.1:9967/cur.html';
const OUT=process.env.PB_OUT||path.resolve(__dirname,'../out');try{fs.mkdirSync(OUT,{recursive:true});}catch(e){}
let fails=0,n=0;const ok=(c,m)=>{n++;console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
let FSB=fs.readFileSync(T+'/rig/fakesb.js','utf8');
{const a="return res(typeof o==='function'?o(a):o===undefined?null:o);";if(FSB.split(a).length!==2)throw new Error('fakesb changed');
 FSB=FSB.replace(a,"const v=typeof o==='function'?o(a):o===undefined?null:o;return v&&v.__error?Promise.resolve({data:null,error:{message:v.__error}}):res(v);");}
const SRC=fs.readFileSync(T+'/staged/locate811_nov20/tests/t_loc811_renew_history.js','utf8');
const a0=SRC.indexOf('const FAKE='),a1=SRC.indexOf('async function boot');if(a0<0||a1<0)throw new Error('locate811 test changed');
const FAKE=eval('('+SRC.slice(a0+'const FAKE='.length,a1).trim().replace(/;$/,'')+')');
const CLOCK=";(function(){const R=Date;window.__off=R.UTC(2026,5,1,17,0,0)-R.now();class D extends R{constructor(...a){if(a.length===0)super(R.now()+window.__off);else super(...a);}static now(){return R.now()+window.__off;}}window.Date=D;})();";
// tickets: [id suffix, number, called, expires, renewed (or null), renewals]
const SEED=(rows)=>";(function(){const S=window.__srv;S.tickets.length=0;S.log.length=0;"+JSON.stringify(rows)+".forEach(function(r){const t={id:'aaaaaaaa-0000-4000-8000-0000000000'+r[0],job_key:'j-100',job_number:'J-100',ticket_no:r[1],called_at:S.day(r[2]),expires_at:S.day(r[3]),note:null,closed:false,closed_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),version:1,by:'Maria Office',renewed_at:r[4]===null?null:S.day(r[4]),renewals:r[5]};S.tickets.push(t);"
  +"S.log.push({id:++S.seq,locate_id:t.id,action:'on_file',at:t.updated_at,by_name:t.by,ticket_no:t.ticket_no,called_at:t.called_at,expires_at:t.expires_at,renewed_at:t.renewed_at,closed:false,expires_was:null,changes:{}});});})();";
async function boot(rows){
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block',timezoneId:'America/Los_Angeles'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FSB}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.route(/nominatim|openstreetmap/,r=>r.abort());
  await ctx.addInitScript(CLOCK+co+FAKE('new')+SEED(rows));const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(3500);
  await p.evaluate(()=>window.pbOpenLocates('J-100'));await p.waitForTimeout(1500);
  return {b,ctx,p};}
const ID=(x)=>'aaaaaaaa-0000-4000-8000-0000000000'+x;
const txt=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?e.innerText.replace(/\s+/g,' ').trim():null;},id);
const has=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return !!e&&e.offsetParent!==null;},id);
const state=async(p,c)=>{await p.evaluate(c=>window.pbLocSrSet(c),c);await p.waitForTimeout(250);};
const modal=(p)=>p.evaluate(()=>{const o=[...document.querySelectorAll('.pb-modal-overlay.show, .pb-modal.show, [role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden])')].find(e=>e.offsetParent!==null||e.getClientRects().length);return o?o.innerText.replace(/\s+/g,' ').trim():null;});
const modalOk=(p)=>p.evaluate(()=>{const o=[...document.querySelectorAll('.pb-modal-overlay.show, .pb-modal.show, [role="dialog"]:not([hidden]), [role="alertdialog"]:not([hidden])')].find(e=>e.getClientRects().length);if(!o)return false;const y=[...o.querySelectorAll('button')].find(x=>/^ok$/i.test(x.textContent.trim()));if(y)y.click();return !!y;});
const wide=(p)=>p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('#screen-locates *').forEach(e=>{if(!e.offsetParent)return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>w+1||r.left<-1))bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.left)+'-'+Math.round(r.right));});return {scroll:document.documentElement.scrollWidth>w+1,bad:bad.slice(0,5)};});
// the test's own calendar (not the app's): weekdays, less the holidays near June 2026
const HOL=new Set(['2026-05-25','2026-06-19','2026-07-03']);
const iso=(t)=>new Date(t).toISOString().slice(0,10),ms=(d)=>Date.parse(d+'T12:00:00Z');
const wd=(d)=>{const w=new Date(ms(d)).getUTCDay();return w!==0&&w!==6&&!HOL.has(d);};
const addWd=(d,k)=>{let c=0;while(c<k){d=iso(ms(d)+864e5);if(wd(d))c++;}return d;};
const before=(x,k)=>{let d=x;for(let g=0;g<40;g++){d=iso(ms(d)-864e5);if(wd(d)&&addWd(d,k)<x)return d;}return '';};
const dayW=(d)=>new Date(ms(d)).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).replace(',','');
const J=(d)=>'2026-06-'+String(d).padStart(2,'0');
// what Tommy listed, and what the Nov 20 sources name (working days before expiry)
const NAMED={MN:2,AL:2,KY:2,CO:2,TN:3,MS:3,VA:3,OK:4,MA:3,ME:3,NH:3,VT:3};
const MORE={DC:3,WV:2,UT:2,AZ:2,GA:3,AR:2,IA:2,ID:2,IN:2,LA:3,MD:3,MI:3,NJ:3,OR:2,TX:2,WA:2};
const CONF={CT:2,IL:2,MO:2,NC:3,NM:2};            // named by the law / the center, or a new notice that waits like a first call
const EST={DE:3,FL:2,KS:2,SD:2,WY:2};             // still the first-call wait, not confirmed
(async()=>{
  // A: new, called Fri May 29, expires Fri Jun 26.  B: renewed once, expires Fri Jun 19.  K: new, expires Fri Jun 5.
  let {b,p}=await boot([['0a','RB-NEW',-3,25,null,0],['0b','RB-REN',-30,18,-2,1],['0c','RB-NEAR',-10,4,null,0]]);
  const A=ID('0a'),B=ID('0b'),K=ID('0c');
  ok(await txt(p,'loc_'+A+'Exp')===dayW(J(26))&&await txt(p,'loc_'+B+'Exp')===dayW(J(19)),'tickets on screen: '+await txt(p,'loc_'+A+'Exp')+', '+await txt(p,'loc_'+B+'Exp'));
  const sheet=async()=>{await p.click('#locRule_'+A);await p.waitForTimeout(350);const t=await txt(p,'pbLocRule_renew');await p.click('#pbLocRuleClose');await p.waitForTimeout(200);return t||'';};

  // ---- the two tables
  const tb=await p.evaluate(()=>{const R=window.__debugLocRen;return {rb:Object.keys(R.rb).sort().map(c=>c+R.rb[c]).join(' '),rb0:Object.keys(R.rb0).sort().join(' ')};});
  ok(tb.rb==='AL2 AR2 AZ2 CO2 CT2 DC3 GA3 IA2 ID2 IL2 IN2 KY2 LA3 MA3 MD3 ME3 MI3 MN2 MO2 MS3 NC3 NH3 NJ3 NM2 OK4 OR2 TN3 TX2 UT2 VA3 VT3 WA2 WV2','the call-ahead table now has CT IL MO NC NM: '+tb.rb);
  ok(tb.rb0==='CA HI NV SC','renew by the last day itself (no line) now has South Carolina: '+tb.rb0);

  // ---- the five states that left "not confirmed": same dates as before, no "not confirmed" on the rule sheet
  for(const c of Object.keys(CONF)){
    await state(p,c);const k=CONF[c];
    const gA=await txt(p,'loc_'+A+'Rb'),gB=await txt(p,'loc_'+B+'Rb'),gK=await txt(p,'loc_'+K+'Rb');
    ok(gA===dayW(before(J(26),k))&&gB===dayW(before(J(19),k))&&gK===dayW(before(J(5),k)),c+' ('+k+' working days): Renew by '+gA+' / '+gB+' / '+gK+' for expiries Jun 26 / Jun 19 / Jun 5');
    const e=await p.evaluate(c=>window.__debugLocRen.rbCode(c),c);const sh=await sheet();
    ok(e&&e.n===k&&!e.est&&/“Renew by” on the ticket is \d working days before it expires/.test(sh)&&!/Not confirmed/.test(sh),c+': not an estimate any more; rule sheet: '+sh.slice(0,230));
  }
  // ---- the five still on the first-call wait: the date stays (the earlier one) and the rule sheet says it is not confirmed
  for(const c of Object.keys(EST)){
    await state(p,c);const k=EST[c];
    const gA=await txt(p,'loc_'+A+'Rb'),gB=await txt(p,'loc_'+B+'Rb');
    ok(gA===dayW(before(J(26),k))&&gB===dayW(before(J(19),k)),c+' ('+k+' working days, first-call wait): Renew by '+gA+' / '+gB);
    const e=await p.evaluate(c=>window.__debugLocRen.rbCode(c),c);const sh=await sheet();
    ok(e&&e.n===k&&e.est===true&&/with one day to spare\. Not confirmed with the 811 center\./.test(sh)&&/no source names a day/.test(sh),c+': rule sheet says it is not confirmed: '+sh.slice(-170));
  }
  // ---- South Carolina: no Renew-by line; the plain 7-day / 2-day reminders; the rule sheet says how to extend
  await state(p,'SC');
  ok(!(await p.$('#loc_'+A+'Rb'))&&!(await p.$('#loc_'+B+'Rb'))&&await has(p,'loc_'+A+'Exp'),'South Carolina: no Renew-by line, Expires stays');
  const sc=await p.evaluate(()=>{const D=window.__debugLoc28,l={id:'x',job_key:'j-100',job_number:'J-100',called_at:'2026-05-10',expires_at:'2026-06-26',renewed_at:'2026-05-29',renewals:1,closed:false},o={},off=window.__off;
    for(const d of [18,19,24,26])
    {window.__off=off+(d-1)*864e5;const s=D.stat(l);o[d]=(s.lv||'-')+'|'+s.text;}window.__off=off;return o;});
  ok(sc[18]==='-|8 days left'&&sc[19]==='amber|7 days left'&&sc[24]==='red|2 days left'&&sc[26]==='red|Expires today','South Carolina reminders: 7 days amber, 2 days red: '+JSON.stringify(sc));
  const scS=await sheet();
  ok(/Send an Extension any time before the ticket expires: same number, 15 more working days/.test(scS)&&/Remark/.test(scS)&&!/“Renew by”/.test(scS),'South Carolina rule sheet: '+scS.slice(0,240));
  // ---- no ticket life in the app: no line (Ohio, Pennsylvania, Montana)
  for(const c of ['OH','PA','MT']){await state(p,c);ok(!(await p.$('#loc_'+A+'Rb'))&&!(await p.$('#loc_'+B+'Rb')),c+': no Renew-by line (no ticket life in the app)');}

  // ---- Illinois: 25 working days from the request; the Renew-by day is inside the law's window (20th day or later)
  const il=await p.evaluate(()=>{const M=window.pbSrMath,R=window.__debugLocRen,r=M.row('IL'),x=M.expires('2026-06-01','IL');
    const add=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
    const nth=(d,x)=>{let k=0,g=0;while(d<x&&g++<200){d=add(d,1);if(M.workDay(d,'IL',true))k++;}return k;};
    const bad=[];let lo=99,hi=0;for(let i=0;i<366;i++){const c=add('2026-06-01',i);if(!M.workDay(c,'IL',true))continue;const e=M.expires(c,'IL'),by=R.before(e,2,'IL'),k=nth(c,by);lo=Math.min(lo,k);hi=Math.max(hi,k);if(!by||k<20||!(by<e))bad.push(c+' '+e+' by '+by+' day '+k);}
    return {life:r.life.n+r.life.unit+'/'+r.life.from,x,days:nth('2026-06-01',x),cal:Math.round((Date.parse(x)-Date.parse('2026-06-01'))/864e5),by:R.before(x,2,'IL'),byDay:nth('2026-06-01',R.before(x,2,'IL')),lo,hi,bad:bad.slice(0,5),renew:r.renew,text:r.life.text};});
  ok(il.life==='25wd/call'&&il.days===25&&il.cal>=33,'Illinois: called Mon Jun 1, expires '+il.x+' = working day '+il.days+' ('+il.cal+' calendar days; was 25 calendar days)');
  ok(il.byDay>=20&&il.byDay<25&&!il.bad.length&&il.lo>=20,'Illinois: Renew by '+il.by+' is working day '+il.byDay+'; over a year of call days it is always day '+il.lo+' to '+il.hi+' (the law: not before the 20th) '+JSON.stringify(il.bad));
  ok(/not before the 20th day/.test(il.renew)&&/skips weekends/.test(il.text),'Illinois lines: '+il.renew);

  // ---- rows: what changed, and the day checked
  const rows=await p.evaluate(()=>{const M=window.pbSrMath,o={};for(const c of ['CT','DE','FL','IL','KS','MO','NC','NM','SC','SD','WY','OH','PA','MT','GA','TN']){const r=M.row(c);o[c]={life:r.life&&(r.life.n+r.life.unit+'/'+r.life.from),renew:r.renew,checked:r.checked,src:r.sources[0].what,n:(r.renew||'').length};}return o;});
  ok(['CT','DE','FL','IL','KS','MO','NC','NM','SC','SD','WY'].every(c=>rows[c].checked==='2026-11-20'),'the 11 rows carry Nov 20 as the day checked');
  ok(rows.OH.checked==='2026-11-19'&&rows.PA.checked==='2026-11-19'&&rows.MT.checked==='2026-11-19'&&rows.GA.checked==='2026-11-19','Ohio, Pennsylvania, Montana, Georgia rows untouched');
  ok(rows.CT.life==='30cd/call'&&rows.MO.life==='21cd/dig'&&rows.NC.life==='28cd/dig'&&rows.NM.life==='15wd/dig'&&rows.SC.life==='15wd/dig'&&rows.DE.life==='12wd/call'&&rows.FL.life==='30cd/call'&&rows.KS.life==='20cd/dig'&&rows.SD.life==='21cd/dig'&&rows.WY.life==='14wd/call','no other ticket life changed');
  ok(/new ticket/.test(rows.CT.renew)&&/2 full working days/.test(rows.CT.renew)&&/new ticket/.test(rows.MO.renew)&&/3 full working days/.test(rows.NC.renew)&&/new locate/.test(rows.NM.renew),'renew lines: CT "'+rows.CT.renew+'" | NC "'+rows.NC.renew+'"');
  ok(/Ameren/.test(rows.MO.src)&&/16-345-4/.test(rows.CT.src)&&/58-36-60/.test(rows.SC.src)&&/220 ILCS 50\/2/.test(rows.IL.src)&&/NM811/.test(rows.NM.src),'the new sources lead each row');

  // ---- no lapse, every state with a line, a year of expiries (same check as round 3)
  const nl=await p.evaluate(()=>{const R=window.__debugLocRen,M=window.pbSrMath,codes=M.codes(),bad=[],shown=[];let checks=0;
    const add=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
    for(const c of codes){const B=R.rbCode(c);if(!B)continue;shown.push(c+B.n+(B.est?'*':''));const N=M.row(c).notice;
      for(let i=0;i<366;i++){const x=add('2026-06-01',i),by=R.before(x,B.n,c);checks++;
        if(!by||!(by<x)||!M.workDay(by,c,false)){bad.push(c+' '+x+' by '+by);continue;}
        let d=by,k=0;while(k<B.n){d=add(d,1);if(M.workDay(d,c,false))k++;}
        if(!(d<x))bad.push(c+' '+x+' good '+d);
        if(N&&N.unit==='wd'&&N.n<=B.n&&!(M.canDig(by,c)<x))bad.push(c+' '+x+' canDig '+M.canDig(by,c));}}
    return {bad:bad.slice(0,8),checks,shown:shown.join(' ')};});
  ok(!nl.bad.length&&nl.checks>10000,'no lapse: in '+nl.checks+' state/expiry pairs a call on the Renew-by day is good before the last day '+JSON.stringify(nl.bad));
  ok(nl.shown.split(' ').filter(x=>/\*$/.test(x)).join(' ')==='DE3* FL2* KS2* SD2* WY2*','the only states left on an unconfirmed first-call wait: '+nl.shown.split(' ').filter(x=>/\*$/.test(x)).join(' '));
  console.log('     states with a Renew-by line (* = not confirmed): '+nl.shown);
  // 390 px: nothing off the screen with the longer rule sheet (Delaware has the longest renew line with the note)
  await state(p,'DE');await p.click('#locRule_'+A);await p.waitForTimeout(350);
  const w=await p.evaluate(()=>{const c=document.getElementById('pbLocRuleCard'),W=document.documentElement.clientWidth,r=c.getBoundingClientRect();return {ok:r.right<=W+1&&r.left>=-1&&c.scrollWidth<=c.clientWidth+1,W};});
  ok(w.ok,'390 px: the rule sheet fits '+JSON.stringify(w));await p.screenshot({path:OUT+'/rule_sheet_de_390.png'});
  await p.click('#pbLocRuleClose');await p.waitForTimeout(200);
  await state(p,'IL');await p.screenshot({path:OUT+'/il_tickets_390.png',fullPage:true});
  ok(!p.errs.length,'no page errors '+p.errs.join(' | '));
  await b.close();
  console.log(fails?('FAILED '+fails+'/'+n):('ALL PASS '+n+'/'+n));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
