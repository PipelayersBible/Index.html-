// locate_round3_nov20 (p03): "Renew by" per state, the reminder before it, no start lines on a renewed ticket,
// the Nevada last-extension reminder and gap note, the state rows confirmed Nov 20.
// The page clock is fixed at Mon Jun 1 2026, 10 AM Pacific (Juneteenth, Fri Jun 19, is the holiday in range).
// Fake company server: the one from locate811_nov20. One browser at a time.
// Usage: PB_URL=http://127.0.0.1:9950/cur.html NODE_PATH=/opt/npm-tools/node_modules node t_loc_round3.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const T=path.resolve(__dirname,'../../..');const co=require(T+'/rig/co');
const BASE=process.env.PB_URL||'http://127.0.0.1:9950/cur.html';
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
const NONE=['CA','NV','HI','RI','OH','NY','AK','WI'];

(async()=>{
  // ================= boot 1: Renew by, state by state; renewed tickets =================
  // A: new, called Fri May 29, expires Fri Jun 26.  B: renewed once, expires Fri Jun 19.  K: new, expires Fri Jun 5.
  let {b,p}=await boot([['0a','RB-NEW',-3,25,null,0],['0b','RB-REN',-30,18,-2,1],['0c','RB-NEAR',-10,4,null,0]]);
  const A=ID('0a'),B=ID('0b'),K=ID('0c');
  ok(await p.evaluate(()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();})==='2026-6-1','the page clock is Jun 1 2026');
  ok(await txt(p,'loc_'+A+'Exp')===dayW(J(26))&&await txt(p,'loc_'+B+'Exp')===dayW(J(19)),'tickets on screen: '+await txt(p,'loc_'+A+'Exp')+', '+await txt(p,'loc_'+B+'Exp'));

  // ---- California: no call-ahead, so no Renew-by line; a new ticket keeps its start lines, a renewed one has none
  ok(await has(p,'loc_'+A+'Dig')&&await has(p,'loc_'+A+'Start')&&!(await p.$('#loc_'+A+'Rb')),'California, new ticket: Can dig from + Start work by, no Renew by');
  ok(!(await p.$('#loc_'+B+'Dig'))&&!(await p.$('#loc_'+B+'Start'))&&await has(p,'loc_'+B+'Exp'),'California, renewed ticket: no "Can dig from", no "Start work by", Expires stays');
  ok(!/Can dig from|Start work by/.test(await txt(p,'locT_'+B)||''),'renewed card has neither start line in its text');
  const sb=await p.evaluate(()=>{const D=window.__debugLoc28,mk=(r,n)=>({id:'x',job_key:'j-100',job_number:'J-100',called_at:'2026-05-22',expires_at:'2026-06-26',renewed_at:r,renewals:n,closed:false});
    return {newS:D.startBy(mk(null,0)),renS:D.startBy(mk('2026-05-30',1)),newK:D.stat(mk(null,0)).k,renK:D.stat(mk('2026-05-30',1)).k,renOnly:D.stat({id:'x',job_key:'j-100',job_number:'J-100',called_at:'2026-06-01',expires_at:'2026-06-26',renewed_at:'2026-06-01',renewals:1,closed:false}).k};});
  ok(sb.newS!==''&&sb.renS===''&&sb.newK==='start'&&sb.renK!=='start'&&sb.renOnly!=='early','start-by / chip: new ticket "'+sb.newK+'" ('+sb.newS+'), renewed "'+sb.renK+'" (no start-by), renewed today is not "not valid yet" ('+sb.renOnly+')');
  // the Edit form of a renewed ticket has no start lines either; a new ticket's form keeps them
  await p.click('#locEdit_'+B);await p.waitForTimeout(400);
  ok(!(await has(p,'locFDig'))&&!(await has(p,'locFStart'))&&!/Can dig from|Start work by/.test(await txt(p,'locForm')||''),'Edit of a renewed ticket: no start lines');
  await p.click('#locCancel');await p.waitForTimeout(250);
  await p.click('#locEdit_'+A);await p.waitForTimeout(400);
  ok(await has(p,'locFDig')&&await has(p,'locFStart'),'Edit of a new ticket: start lines stay');
  await p.click('#locCancel');await p.waitForTimeout(250);

  // ---- Renew by, per state: every state Tommy listed, and the ones the sources name
  const all=Object.assign({},NAMED,MORE);
  for(const c of Object.keys(all)){
    await state(p,c);const k=all[c];
    const eA=before(J(26),k),eB=before(J(19),k),eK=before(J(5),k);
    const gA=await txt(p,'loc_'+A+'Rb'),gB=await txt(p,'loc_'+B+'Rb'),gK=await txt(p,'loc_'+K+'Rb');
    ok(gA===dayW(eA)&&gB===dayW(eB)&&gK===dayW(eK),c+' ('+k+' working days'+(NAMED[c]?', Tommy’s list':'')+'): Renew by '+gA+' / '+gB+' / '+gK+' for expiries Jun 26 / Jun 19 / Jun 5');
    if(c==='OK'){ok(gA==='Thu Jun 18','Oklahoma, expires Fri Jun 26: Renew by Thu Jun 18 (4 business days, Juneteenth skipped, one day to spare)');
      ok(/Renew by/.test(await txt(p,'loc_'+A+'Dates')||'')&&await has(p,'loc_'+A+'Dig')&&!(await p.$('#loc_'+B+'Dig')),'Oklahoma: the new ticket shows 4 dates, the renewed one Renew by + Expires only: '+await txt(p,'loc_'+B+'Dates'));
      const w=await wide(p);ok(!w.scroll&&!w.bad.length,'390 px: nothing runs off the screen with four dates '+JSON.stringify(w));
      await p.screenshot({path:OUT+'/renew_by_ok_390.png',fullPage:true});}
  }
  for(const c of NONE){await state(p,c);ok(!(await p.$('#loc_'+A+'Rb'))&&!(await p.$('#loc_'+B+'Rb')),c+': no Renew-by line (no call-ahead deadline, or no ticket life)');}

  // ---- the tables, and "no lapse": a call on the Renew-by day is good before the old ticket's last day, for a year of expiries
  const tb=await p.evaluate(()=>{const R=window.__debugLocRen,M=window.pbSrMath,codes=M.codes(),bad=[],shown=[];let checks=0;
    const add=(d,n)=>new Date(Date.parse(d+'T12:00:00Z')+n*864e5).toISOString().slice(0,10);
    for(const c of codes){const B=R.rbCode(c);if(!B)continue;shown.push(c+B.n+(B.est?'*':''));const N=M.row(c).notice;
      for(let i=0;i<366;i++){const x=add('2026-06-01',i),by=R.before(x,B.n,c);checks++;
        if(!by||!(by<x)||!M.workDay(by,c,false)){bad.push(c+' '+x+' by '+by);continue;}
        // the app's own first-call math: a call on the Renew-by day, waiting the named days, is diggable before the expiry day
        let d=by,k=0;while(k<B.n){d=add(d,1);if(M.workDay(d,c,false))k++;}
        if(!(d<x))bad.push(c+' '+x+' good '+d);
        // and a new first-call ticket called that day is diggable by the expiry day wherever the wait is not longer than the named days
        if(N&&N.unit==='wd'&&N.n<=B.n&&!(M.canDig(by,c)<x))bad.push(c+' '+x+' canDig '+M.canDig(by,c));
        // it is the LAST such day: the next working day would be too late
        let nx=by;do{nx=add(nx,1);}while(!M.workDay(nx,c,false));let e=nx,j=0;while(j<B.n){e=add(e,1);if(M.workDay(e,c,false))j++;}
        if(nx<x&&e<x)bad.push(c+' '+x+' not the last day '+by);}}
    return {bad:bad.slice(0,8),checks,shown:shown.join(' '),rb:Object.keys(R.rb).sort().map(c=>c+R.rb[c]).join(' '),rb0:Object.keys(R.rb0).sort().join(' ')};});
  ok(tb.rb==='AL2 AR2 AZ2 CO2 CT2 DC3 GA3 IA2 ID2 IL2 IN2 KY2 LA3 MA3 MD3 ME3 MI3 MN2 MO2 MS3 NC3 NH3 NJ3 NM2 OK4 OR2 TN3 TX2 UT2 VA3 VT3 WA2 WV2','the named call-ahead table: '+tb.rb);
  ok(tb.rb0==='CA HI NV SC','renew by the last day itself (no line): '+tb.rb0);
  ok(!tb.bad.length&&tb.checks>10000,'no lapse: in '+tb.checks+' state/expiry pairs a call on the Renew-by day is good before the last day, and it is the last such day '+JSON.stringify(tb.bad));
  console.log('     states with a Renew-by line (* = the state’s first-call wait, not named by the center): '+tb.shown);

  // ---- the reminder comes before the Renew-by day (Oklahoma, expires Fri Jun 26, Renew by Thu Jun 18)
  await state(p,'OK');
  const rem=await p.evaluate(()=>{const D=window.__debugLoc28,l={id:'x',job_key:'j-100',job_number:'J-100',called_at:'2026-06-10',expires_at:'2026-06-26',renewed_at:null,renewals:0,closed:false},o={},off=window.__off;
    for(const d of [12,15,16,17,18,22,24,26,27]){window.__off=off+(d-1)*864e5;const s=D.stat(l);o[d]=(s.lv||'-')+'|'+s.text;}window.__off=off;return o;});
  ok(/^-\|/.test(rem[15])&&rem[16]==='amber|Renew by Thu Jun 18'&&rem[17]==='amber|Renew by Thu Jun 18','reminder: nothing on Jun 15, amber "Renew by Thu Jun 18" from Jun 16 (2 days before; the old rule would wait until Jun 19): '+rem[15]+' → '+rem[16]);
  ok(rem[18]==='red|Renew today'&&rem[22]==='red|Renew now · 4 days left','on the day: "'+rem[18]+'"; after it: "'+rem[22]+'"');
  ok(rem[24]==='red|2 days left'&&rem[26]==='red|Expires today'&&/^red\|Expired/.test(rem[27]),'last two days and after: unchanged ("'+rem[24]+'", "'+rem[26]+'", "'+rem[27]+'")');
  // a state with no call-ahead keeps the plain 7-day rule
  await state(p,'CA');
  const ca=await p.evaluate(()=>{const D=window.__debugLoc28,l={id:'x',job_key:'j-100',job_number:'J-100',called_at:'2026-05-10',expires_at:'2026-06-26',renewed_at:'2026-05-29',renewals:1,closed:false},o={},off=window.__off;
    for(const d of [18,19,24]){window.__off=off+(d-1)*864e5;const s=D.stat(l);o[d]=(s.lv||'-')+'|'+s.text;}window.__off=off;return o;});
  ok(ca[18]==='-|8 days left'&&ca[19]==='amber|7 days left'&&ca[24]==='red|2 days left','California (no call-ahead): 7-day and 2-day reminders as before: '+JSON.stringify(ca));
  // Home: the foreman's card names the Renew-by day
  await state(p,'OK');
  const home=await p.evaluate(()=>{const off=window.__off;window.__off=off+15*864e5;let h=null;try{h=window.pbLocHomeAttention();}catch(e){h={html:'ERR '+e.message};}window.__off=off;return h?h.html.replace(/<[^>]+>/g,' '):null;});
  ok(/RB-NEW expires in 10 days \(Jun 26\) — renew by Jun 18/.test(home||''),'Home card on Jun 16 (Oklahoma, expires Jun 26, 10 days out): '+String(home).slice(0,330));
  await state(p,'TN');

  // ---- the state rows confirmed Nov 20, and the rule sheet
  const rows=await p.evaluate(()=>{const M=window.pbSrMath,g=(c)=>{const r=M.row(c);return {life:r.life&&(r.life.n+r.life.unit+'/'+r.life.from),notice:r.notice&&(r.notice.n+r.notice.unit),renew:r.renew,checked:r.checked,src:r.sources[0].what};};
    return {AR:g('AR'),LA:g('LA'),MO:g('MO'),SD:g('SD'),WV:g('WV'),MS:g('MS'),NV:g('NV'),MD:g('MD'),MI:g('MI'),IA:g('IA'),GA:g('GA'),ga:JSON.stringify(window.__debugLocRen.table.GA)};});
  ok(rows.AR.life==='20wd/call'&&rows.AR.notice==='2wd'&&rows.LA.life==='20cd/call'&&rows.LA.notice==='3wd','Arkansas 20 working days, Louisiana 20 calendar days: '+rows.AR.life+', '+rows.LA.life);
  ok(rows.MO.life==='21cd/dig'&&rows.SD.life==='21cd/dig'&&rows.WV.life==='15wd/call','Missouri 21 days, South Dakota 21 days, West Virginia 15 business days: '+rows.MO.life+', '+rows.SD.life+', '+rows.WV.life);
  ok(rows.MS.life==='20cd/call'&&/3 working days/.test(rows.MS.renew)&&/84 days/.test(rows.NV.renew)&&/keep digging on the old ticket/.test(rows.NV.renew),'Mississippi stays 20 days and gains its renew line; Nevada’s line: '+rows.NV.renew);
  ok(/Repeat the notice/.test(rows.MD.renew)&&/180-day/.test(rows.MI.renew)&&/request a new ticket/.test(rows.IA.renew),'Maryland / Michigan / Iowa renew lines reworded');
  ok(['AR','LA','MO','SD','WV','MS','NV'].every(c=>rows[c].checked==='2026-11-20'),'changed rows carry the day they were checked (Nov 20)');
  ok(rows.ga==='{"no":1}'&&rows.GA.checked==='2026-11-19','Georgia: untouched (no limit on renewals in the app; row not changed)');
  await p.click('#locRule_'+A);await p.waitForTimeout(350);
  let sheet=await txt(p,'pbLocRuleCard');
  ok(/“Renew by” on the ticket is 3 working days before it expires, with one day to spare\./.test(sheet),'Tennessee rule sheet says what Renew by is: '+(await txt(p,'pbLocRule_renew')));
  await p.click('#pbLocRuleClose');await p.waitForTimeout(200);
  ok(!p.errs.length,'no page errors (boot 1) '+p.errs.join(' | '));
  await b.close();

  // ================= boot 2: Nevada, tickets on their last extension =================
  // all called in long ago, each renewed twice. E expires Tue Jun 2, D Mon Jun 8, G Sat Jun 13, C Sun Jun 28. H: one renewal, expires Jun 13.
  ({b,p}=await boot([['1e','NV-E',-70,1,-27,2],['1d','NV-D',-75,7,-21,2],['1g','NV-G',-70,12,-16,2],['1c','NV-C',-60,27,-1,2],['1h','NV-H',-45,12,-16,1]]));
  const E=ID('1e'),D=ID('1d'),G=ID('1g'),C=ID('1c'),H=ID('1h');
  await state(p,'NV');
  // D: 7 days before the last extension runs out
  let t=await txt(p,'locLast_'+D);
  ok(t==='Call in a new ticket now — this ticket can’t be renewed again. Latest: Wed Jun 3, or digging stops when this one runs out. You can keep digging on this one until Mon Jun 8.','7 days before expiry: "'+t+'"');
  ok(await txt(p,'loc_'+D+'Rb')==='Wed Jun 3'&&/New ticket by/.test(await txt(p,'loc_'+D+'Dates')||'')&&!/Renew by|Can dig from|Start work by/.test(await txt(p,'loc_'+D+'Dates')||''),'its dates: "New ticket by Wed Jun 3" + Expires: '+await txt(p,'loc_'+D+'Dates'));
  ok(await txt(p,'locChip_'+D)==='New ticket by Wed Jun 3'&&await p.evaluate(id=>document.getElementById('locT_'+id).classList.contains('amber'),D),'its chip: '+await txt(p,'locChip_'+D)+' (amber)');
  // G: 12 days out: the extra week of notice (a once-renewed ticket with the same expiry has no alert yet)
  ok(await p.evaluate(id=>document.getElementById('locT_'+id).classList.contains('amber'),G)&&/^Call in a new ticket now — this ticket can’t be renewed again\. Latest: Wed Jun 10/.test(await txt(p,'locLast_'+G)||''),'12 days before expiry, last extension: already reminding: '+await txt(p,'locLast_'+G));
  ok(await p.evaluate(id=>{const c=document.getElementById('locT_'+id).classList;return !c.contains('amber')&&!c.contains('red');},H)&&!(await p.$('#locLast_'+H))&&!(await p.$('#loc_'+H+'Rb'))&&await txt(p,'locChip_'+H)==='12 days left','12 days before expiry, one renewal used: no alert, no note, no Renew-by line: '+await txt(p,'locChip_'+H));
  // C: far off: told once, quietly
  t=await txt(p,'locLast_'+C);
  ok(t==='This ticket can’t be renewed again. Call in a new ticket by Wed Jun 24. You can keep digging on this one until it runs out.'&&await p.evaluate(id=>{const e=document.getElementById('locLast_'+id),c=document.getElementById('locT_'+id).classList;return !e.classList.contains('pbp-err')&&!c.contains('amber')&&!c.contains('red');},C),'27 days out: "'+t+'" (no alert colour)');
  // E: expires tomorrow, no new ticket: a gap
  t=await txt(p,'locLast_'+E);
  ok(t==='Call in a new ticket now — this ticket can’t be renewed again. A ticket called in today can’t be dug on until Wed Jun 3. Stop digging when this one runs out (Tue Jun 2) until then.'&&await p.evaluate(id=>{const e=document.getElementById('locLast_'+id);return e.classList.contains('pbp-err')&&e.getAttribute('role')==='alert';},E),'too late for no gap: "'+t+'" (red, alert)');
  // Renew on a last-extension ticket is still refused
  await p.click('#locRenew_'+D);await p.waitForTimeout(350);
  ok(/Nevada allows two renewals on a ticket, and this one has had both\. Call in a new ticket at least 2 working days before this one runs out, and add it here\./.test(await modal(p)||''),'Renew on it: '+await modal(p));
  await modalOk(p);await p.waitForTimeout(250);
  // Home card
  const hm=await p.evaluate(()=>{let h=null;try{h=window.pbLocHomeAttention();}catch(e){h={html:'ERR '+e.message};}return h?h.html.replace(/<[^>]+>/g,' '):null;});
  ok(/NV-D expires in 7 days \(Jun 8\) — it can’t be renewed again: call in a new ticket by Jun 3/.test(hm||'')&&/NV-E expires tomorrow \(Jun 2\) — call in a new ticket now; stop digging when it runs out until the new one is good/.test(hm||''),'Home card: '+String(hm).slice(0,420));
  { const w=await wide(p);ok(!w.scroll&&!w.bad.length,'390 px: nothing runs off the screen '+JSON.stringify(w)); }
  await p.screenshot({path:OUT+'/nevada_last_390.png',fullPage:true});
  // the day the "New ticket by" day has passed but a ticket called today would still be good in time is not possible with one day to spare
  // on a Monday; walk the clock instead: D on Thu Jun 4 (after Wed Jun 3): a ticket called Thu is good Mon Jun 8 = the last day: no gap, but late
  const walk=await p.evaluate((id)=>{const R=window.__debugLocRen,l={id:id,job_key:'j-100',job_number:'J-100',called_at:'2026-03-18',expires_at:'2026-06-08',renewed_at:'2026-05-11',renewals:2,closed:false},off=window.__off,o={};
    for(const d of [3,4,5,8]){window.__off=off+(d-1)*864e5;const I=R.lastInfo(l),N=R.lastNote(l),s=window.__debugLoc28.stat(l);o[d]={gap:I.gap,late:I.late,dig:I.dig,bad:N.bad,text:N.text,chip:s.text,lv:s.lv};}window.__off=off;return o;},'zz');
  ok(!walk[3].gap&&!walk[3].late&&walk[3].chip==='New ticket today'&&walk[3].lv==='red','on the "New ticket by" day (Wed Jun 3): chip "'+walk[3].chip+'", red, no gap yet');
  ok(!walk[4].gap&&walk[4].late&&walk[4].bad&&/Called in today it is good from Mon Jun 8\. You can keep digging on this one until Mon Jun 8\./.test(walk[4].text),'a day late (Thu Jun 4): "'+walk[4].text+'"');
  ok(walk[5].gap&&walk[5].dig==='2026-06-09'&&/can’t be dug on until Tue Jun 9\. Stop digging when this one runs out \(Mon Jun 8\) until then\./.test(walk[5].text),'two days late (Fri Jun 5): a gap: "'+walk[5].text+'"');
  ok(walk[8].gap&&/Stop digging when this one runs out \(Mon Jun 8\)/.test(walk[8].text),'on the last day (Mon Jun 8): still says when to stop');

  // ---- the new ticket is called in today and added: no gap for D, a one-day gap for E
  await p.evaluate(()=>{const S=window.__srv,t={id:'aaaaaaaa-0000-4000-8000-00000000001n',job_key:'j-100',job_number:'J-100',ticket_no:'NV-NEW',called_at:S.day(0),expires_at:S.day(28),note:null,closed:false,closed_at:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),version:1,by:'Maria Office',renewed_at:null,renewals:0};S.tickets.push(t);
    S.log.push({id:++S.seq,locate_id:t.id,action:'on_file',at:t.updated_at,by_name:t.by,ticket_no:t.ticket_no,called_at:t.called_at,expires_at:t.expires_at,renewed_at:null,closed:false,expires_was:null,changes:{}});});
  await p.evaluate(()=>window.pbLocLoad());await p.waitForTimeout(1200);
  const NN=ID('1n');
  ok(await has(p,'loc_'+NN+'Dig')&&await txt(p,'loc_'+NN+'Dig')==='Wed Jun 3'&&!(await p.$('#loc_'+NN+'Rb'))&&!(await p.$('#locLast_'+NN)),'the new Nevada ticket: Can dig from Wed Jun 3, no Renew-by line, no note');
  t=await txt(p,'locLast_'+D);
  ok(t==='This ticket can’t be renewed again. New ticket NV-NEW is on file, good from Wed Jun 3. Keep digging on this one until it runs out.'&&await p.evaluate(id=>!document.getElementById('locLast_'+id).classList.contains('pbp-err'),D),'new ticket in time: no gap: "'+t+'"');
  ok(await txt(p,'locChip_'+D)==='7 days left'&&!(await p.$('#locLast_'+NN)),'its chip goes back to the plain countdown: '+await txt(p,'locChip_'+D));
  t=await txt(p,'locLast_'+E);
  ok(t==='Stop digging when this ticket runs out (Tue Jun 2). New ticket NV-NEW can’t be dug on until Wed Jun 3. Wait for every utility to respond.'&&await p.evaluate(id=>document.getElementById('locLast_'+id).classList.contains('pbp-err'),E),'new ticket too late for E: the gap is spelled out: "'+t+'"');
  ok(await p.evaluate(id=>{const c=document.getElementById('locT_'+id).classList;return !c.contains('amber')&&!c.contains('red');},G),'G (12 days out) stops reminding once the new ticket is on file');
  await p.screenshot({path:OUT+'/nevada_new_on_file_390.png',fullPage:true});
  // the Nevada rule sheet
  await p.click('#locRule_'+D);await p.waitForTimeout(350);
  sheet=await txt(p,'pbLocRule_renew');
  ok(/Two renewals at most \(84 days\), then a new ticket: call it in at least 2 working days before the last renewal runs out\. You can keep digging on the old ticket until it runs out\./.test(sheet)&&/shows “New ticket by”/.test(sheet),'Nevada rule sheet: '+sheet);
  await p.click('#pbLocRuleClose');await p.waitForTimeout(200);
  // Georgia: a ticket renewed twice still opens the Renew form (not touched)
  await state(p,'GA');
  ok(!(await p.$('#locLast_'+D))&&/Renew by/.test(await txt(p,'loc_'+D+'Dates')||''),'Georgia, ticket renewed twice: no "can’t be renewed" note, plain Renew by');
  await p.click('#locRenew_'+D);await p.waitForTimeout(400);
  ok(await has(p,'locForm')&&!(await modal(p)),'Georgia: the third renewal still opens the Renew form (left as it is)');
  await p.click('#locCancel');await p.waitForTimeout(200);
  ok(!p.errs.length,'no page errors (boot 2) '+p.errs.join(' | '));
  await b.close();
  console.log(fails?('FAILED '+fails+'/'+n):('ALL PASS '+n+'/'+n));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
