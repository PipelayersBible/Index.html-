// t130 r17.05 staterules (decisions #33, #64): 811 and trench rules from the job's state, nationwide.
// A) the table (data/state_rules.json and the copy in the page): 51 rows, every row has sources and the checked day,
//    every value is either confirmed (well formed) or null.
// B) the date math per state, hand-checked (see NOTES.md for each count).
// C) the job's state from its address; picked state; company state; California default.
// D) Locates screen at 390 px: header, new-ticket expiry and help lines per state, a state with no ticket life (no date,
//    "Check your state's 811 rules"), Change State, Rules view (light and dark, no sideways scroll), no signal.
// E) old tickets keep their dates; Trench Sloping note (WA 4 ft, CA 5 ft + permit, unknown state); run flag depth.
// Usage: PB_URL=http://127.0.0.1:PORT/cur.html node t130_staterules.js
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const T=path.resolve(__dirname,'../../..');const co=require(T+'/rig/co');
const BASE=process.env.PB_URL||'http://127.0.0.1:8917/cur.html';
const OUT=process.env.PB_OUT||'/tmp/claude-0/sr_out';try{fs.mkdirSync(OUT,{recursive:true});}catch(e){}
const JSONF=path.resolve(__dirname,'../data/state_rules.json');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const LOC=(addr,locates)=>`;window.__rpcOverride.pb_prod_locates=(a)=>({ok:true,job_key:String(a.p_job_number).toLowerCase(),locate_days:28,locates:${JSON.stringify(locates||[])},job:{job_number:a.p_job_number,project_name:'Main St Sewer',address:${JSON.stringify(addr)}},server_at:new Date().toISOString()});`;
async function boot({init='',dark=false,offline=false}={}){
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:dark?'dark':'light',serviceWorkers:'block'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(T+'/rig/fakesb.js','utf8')}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.route(/nominatim|openstreetmap/,r=>r.abort());
  await ctx.addInitScript(co+init);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(3500);
  if(offline){await ctx.setOffline(true);await p.evaluate(()=>window.dispatchEvent(new Event('offline')));}
  return {b,ctx,p};}
const txt=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?e.innerText.replace(/\s+/g,' ').trim():null;},id);
const val=(p,id)=>p.evaluate(i=>{const e=document.getElementById(i);return e?e.value:null;},id);
const wide=(p)=>p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('#pbSrView *, #screen-locates *, #trenchStateNote *').forEach(e=>{if(!e.offsetParent&&getComputedStyle(e).position!=='fixed')return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>w+1||r.left<-1))bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.left)+'-'+Math.round(r.right));});return {sw:document.documentElement.scrollWidth,w,bad:bad.slice(0,5)};});
const rpcs=(p,n)=>p.evaluate(n=>(window.__rpcArgs||[]).filter(x=>x[0]===n).map(x=>x[1]),n);

(async()=>{
  // ---------- A) the table ----------
  const J=JSON.parse(fs.readFileSync(JSONF,'utf8'));
  ok(J.states.length===51,'51 rows (50 states + DC): '+J.states.length);
  const codes=new Set(J.states.map(r=>r.code));ok(codes.size===51&&codes.has('DC'),'51 different codes incl. DC');
  let bad=[];
  for(const r of J.states){
    const e=(m)=>bad.push(r.code+': '+m);
    if(r.checked!=='2026-11-19')e('checked');
    if(!Array.isArray(r.sources)||!r.sources.length||r.sources.some(s=>!/^https:\/\//.test(s.url)||!s.what))e('sources');
    if(!r.centers.length||r.centers.some(c=>!/^https:\/\//.test(c.url)||!c.name))e('centers');
    for(const k of ['notice','start']){const x=r[k];if(x!==null&&!(Number.isInteger(x.n)&&x.n>=0&&['wd','cd'].includes(x.unit)&&x.text))e(k);}
    if(r.life!==null&&!(Number.isInteger(r.life.n)&&r.life.n>0&&['wd','cd'].includes(r.life.unit)&&['call','dig'].includes(r.life.from)&&r.life.text))e('life');
    if(r.tol_in!==null&&!(Number.isInteger(r.tol_in)&&r.tol_in>=12&&r.tol_in<=48))e('tol');
    if(r.white!==null&&!['required','conditional','recommended'].includes(r.white))e('white');
    if(!r.trench||!(r.trench.ft===null||r.trench.ft===4||r.trench.ft===5)||!r.trench.text)e('trench');
    if(!['state','federal','public'].includes(r.osha))e('osha');
    if((r.notice===null||r.life===null)&&!r.note&&r.life===null&&r.renew===null&&r.notice===null)e('null row without a note');
  }
  ok(!bad.length,'every row: checked 2026-11-19, https sources, centers, values well formed or null '+JSON.stringify(bad.slice(0,6)));
  const pri=['CA','AZ','NV','OR','WA','TX','UT','CO','NM','ID'];
  ok(pri.every(c=>{const r=J.states.find(x=>x.code===c);return r.notice&&r.life&&r.tol_in&&r.trench.ft&&r.level==='law';}),'the ten western states: wait, ticket life, tolerance and trench depth all filled, from the law');
  ok(J.states.find(x=>x.code==='WA').trench.ft===4&&J.states.filter(x=>x.trench.ft===4).length===1,'trench depth: Washington 4 ft, no other state below 5');

  // ---------- B) the date math (hand-checked) ----------
  let {b,p}=await boot({init:LOC('100 N Central Ave, Phoenix, AZ 85004')});
  const emb=await p.evaluate(()=>window.PB_STATE_RULES);
  ok(emb&&Object.keys(emb.states).length===51&&JSON.stringify(emb.states.TX)===JSON.stringify(J.states.find(x=>x.code==='TX')),'the page carries the same table (TX row identical)');
  const M=(fn,...a)=>p.evaluate(([fn,a])=>window.pbSrMath[fn](...a),[fn,a]);
  const cases=[
    ['canDig',['2026-11-20','CA'],'2026-11-25','CA: Fri call, Mon + Tue are the 2 working days -> Wed'],
    ['canDig',['2026-11-25','CA'],'2026-12-02','CA: Wed before Thanksgiving (Thu, Fri off) -> Wed Dec 2'],
    ['canDig',['2026-11-21','CA'],'2026-11-30','CA: Saturday call counts from Monday; Tue, Wed, then Thanksgiving + Friday off -> Mon Nov 30'],
    ['expires',['2026-11-20','CA'],'2026-12-18','CA: 28 days'],
    ['startBy',['2026-11-20','CA'],'2026-12-04','CA: start within 14 days'],
    ['canDig',['2026-11-25','AZ'],'2026-12-01','AZ: Thanksgiving and the Friday after are days off for the wait'],
    ['expires',['2026-11-20','AZ'],'2026-12-14','AZ: 15 working days (Thanksgiving off; the Friday after counted as a working day)'],
    ['expires',['2026-12-21','TX'],'2027-01-12','TX: 14 working days across Christmas and New Year'],
    ['canDig',['2026-12-24','TX'],'2026-12-29','TX: Thu Dec 24 call, Fri 25 off -> Tue Dec 29'],
    ['expires',['2026-11-20','CO'],'2026-12-25','CO: 30 calendar days after the due date (Wed Nov 25: the call day does not count)'],
    ['expires',['2026-07-02','NM'],'2026-07-29','NM: wait ends Wed Jul 8 (Jul 3 off, the call day not counted), then 15 working days'],
    ['expires',['2026-11-20','WA'],'2027-01-04','WA: 45 calendar days'],
    ['startBy',['2026-11-20','WA'],'2026-12-07','WA: no more than 10 business days'],
    ['expires',['2026-11-20','NV'],'2026-12-18','NV: 28 calendar days'],
    ['expires',['2026-11-20','OR'],'2026-12-20','OR: 30 calendar days (changed from 45 on Jan 8 2026)'],
    ['expires',['2026-11-20','UT'],'2026-12-11','UT: 21 days'],
    ['expires',['2026-11-20','ID'],'2026-12-18','ID: 4 weeks'],
    ['startBy',['2026-11-20','ID'],'2026-12-11','ID: start within 3 weeks'],
    ['expires',['2026-11-20','IA'],'2026-12-19','IA: 25 days counting the first legal dig day (Wed Nov 25: the 48 hours start Mon 6 AM) as day 1'],
    ['expires',['2026-11-20','DE'],'2026-12-09','DE: 12 business days after it is sent'],
    ['expires',['2026-11-20','MD'],'2026-12-14','MD: 3-day wait to Wed Nov 25, then 12 business days'],
    ['canDig',['2026-11-20','DC'],'2026-11-30','DC: 96 hours = 4 working days (Thanksgiving + Friday off)'],
    ['expires',['2026-11-20','PA'],'','PA: ticket life not confirmed -> no date'],
    ['canDig',['2026-11-20','PA'],'2026-11-25','PA: 3 business days (73 P.S. 180(2.1); r17.13)'],
    ['expires',['2026-11-20','MT'],'','MT: ticket life not confirmed -> no date'],
    ['canDig',['2026-11-20','MT'],'','MT: wait not confirmed -> no date'],
    ['expires',['2026-11-20','ND'],'2026-12-11','ND: 21 days after the planned dig day; wait unknown so counted from the call (never later)'],
    ['expires',['2026-11-20','XX'],'','unknown state -> no date'],
  ];
  for(const [fn,a,want,m] of cases){const got=await M(fn,...a);ok(got===want,m+' ('+fn+' '+a.join(' ')+' = '+got+')');}

  // ---------- C) the state in an address ----------
  const P=[['100 N Central Ave, Phoenix, AZ 85004','AZ'],['Reno, NV','NV'],['500 W Idaho St, Boise, Idaho 83702','ID'],['1 Main St, Washington, DC 20001','DC'],['Seattle, Washington','WA'],
           ['Portland OR 97201','OR'],['12 Elm St, Riverside, CA 92501, USA','CA'],['123 Elm','' ],['Mile 4, ranch road','' ],['55 Oak Ave, Austin, tx 78701','TX'],['9 Pine St, Las Cruces, New Mexico','NM']];
  for(const [a,w] of P){const g=await M('parse',a);ok(g===w,'address "'+a+'" -> '+(g||'(none)'));}

  // ---------- D) Locates screen, Arizona job from its address ----------
  await p.evaluate(()=>window.pbOpenLocates('J-100'));await p.waitForTimeout(1500);
  let h=await txt(p,'locSrText');ok(/^Arizona rules \(from the job address\)\. Call 811: Arizona 811\.$/.test(h||''),'header: '+h);
  await p.evaluate(()=>window.pbLocAdd());await p.waitForTimeout(400);
  let called=await val(p,'locCalled'),exp=await val(p,'locExp');
  ok(exp===await M('expires',called,'AZ')&&exp!=='','new ticket: expiry from Arizona\'s rule ('+called+' -> '+exp+')');
  ok((await txt(p,'locExpHelp'))===''&&/^Arizona rule/.test(await txt(p,'locRuleLink')),'no rule text under the expiry; the "Arizona rule" link is there');
  ok((await txt(p,'locRuleHelp'))==='','no rule text under the dig dates');
  ok((await txt(p,'locFStart'))==='—','Arizona sets no latest start: Start work by shows a dash');
  await p.fill('#locCalled','2026-11-20');await p.dispatchEvent('#locCalled','change');
  ok(await val(p,'locExp')==='2026-12-14','changing the called-in day recomputes Arizona\'s expiry (2026-12-14)');
  await p.evaluate(()=>window.pbLocFormCancel());
  // Change State -> Nevada (no signal needed); the new form uses Nevada
  await p.click('#locSrChange');await p.waitForTimeout(200);
  await p.selectOption('#locSrSel','NV');await p.waitForTimeout(600);
  h=await txt(p,'locSrText');ok(/^Nevada rules \(picked on this phone\)\. Call 811: USA North 811\.$/.test(h||''),'picked Nevada: '+h);
  await p.evaluate(()=>window.pbLocAdd());await p.waitForTimeout(300);
  await p.fill('#locCalled','2026-11-20');await p.dispatchEvent('#locCalled','change');
  ok(await val(p,'locExp')==='2026-12-18'&&(await txt(p,'locFStart'))==='Fri Dec 18','Nevada: 28 days, start within 28 days');
  await p.evaluate(()=>window.pbLocFormCancel());
  // a state with no confirmed ticket life: no date, "Check your state's 811 rules", saving asks for the date
  await p.click('#locSrChange');await p.waitForTimeout(200);await p.selectOption('#locSrSel','MT');await p.waitForTimeout(500);
  await p.evaluate(()=>window.pbLocAdd());await p.waitForTimeout(300);
  ok((await val(p,'locExp'))==='','Montana (nothing confirmed; r17.13: Pennsylvania now has its wait): no expiry filled in');
  ok(/^Enter the expiry on your ticket\.$/.test(await txt(p,'locExpHelp'))&&/^Ask 811 when you can dig\.$/.test(await txt(p,'locRuleHelp')),'Montana: "Enter the expiry on your ticket." and "Ask 811 when you can dig."');
  ok((await txt(p,'locFDig'))==='—','Montana: Can dig from shows a dash');
  await p.fill('#locNo','A-1');await p.click('#locSave');await p.waitForTimeout(300);
  ok(/Pick the day it expires/.test(await txt(p,'locErr')||''),'Montana: Save asks for the expiry date');
  await p.evaluate(()=>window.pbLocFormCancel());
  // back to the address
  await p.click('#locSrChange');await p.waitForTimeout(200);await p.selectOption('#locSrSel','');await p.waitForTimeout(500);
  ok(/^Arizona rules \(from the job address\)/.test(await txt(p,'locSrText')||''),'"From the job address" goes back to Arizona');
  ok((await rpcs(p,'pb_job_state_set')).length>=1,'the pick is offered to the company server (pb_job_state_set) when online');
  // Rules view (light)
  await p.click('#locSrRules');await p.waitForTimeout(300);
  let v=await p.evaluate(()=>({t:document.getElementById('pbSrVTitle')?.textContent,body:document.getElementById('pbSrVBody')?.innerText,src:document.querySelectorAll('#pbSrVSrc a').length,bg:getComputedStyle(document.querySelector('#pbSrView .pbsr-card')).backgroundColor,focus:document.activeElement&&document.activeElement.id}));
  ok(v.t==='Rules for Arizona'&&/Arizona 811/.test(v.body)&&/15 working days/.test(v.body)&&/Checked Nov 19, 2026/.test(v.body),'Rules for Arizona: center, ticket life, checked day');
  ok(v.src>=3,'Rules view lists the sources ('+v.src+' links)');ok(v.focus==='pbSrVClose','Rules view: focus on Close');
  let w=await wide(p);ok(w.sw<=w.w&&!w.bad.length,'Rules view fits 390 px '+JSON.stringify(w));
  await p.screenshot({path:OUT+'/rules_az_light.png'});const lightBg=v.bg;
  await p.selectOption('#pbSrVSel','CA');await p.waitForTimeout(200);
  v=await txt(p,'pbSrVBody');ok(/USA North 811 \(Northern California\)/.test(v)&&/DigAlert \(Southern California\)/.test(v)&&/8 CCR 341/.test(v),'California view: both centers and the Cal/OSHA permit');
  await p.selectOption('#pbSrVSel','MT');await p.waitForTimeout(200);
  v=await txt(p,'pbSrVBody');ok(/Check your state’s 811 rules\./.test(v)&&/Montana 811/.test(v),'Montana (not confirmed): says "Check your state\'s 811 rules"');
  await p.keyboard.press('Escape');await p.waitForTimeout(200);
  ok(!(await p.evaluate(()=>!!document.getElementById('pbSrView'))),'Escape closes the Rules view');
  ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id)==='locSrRules','focus goes back to the Rules button');
  await p.screenshot({path:OUT+'/locates_az_light.png'});
  w=await wide(p);ok(w.sw<=w.w&&!w.bad.length,'Locates screen fits 390 px '+JSON.stringify(w));
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await b.close();

  // ---------- D2) dark mode, no signal, an old ticket keeps its date ----------
  const old=[{id:'aaaaaaaa-0000-4000-8000-000000000001',job_key:'j-200',job_number:'J-200',ticket_no:'OLD-1',called_at:'2026-11-10',expires_at:'2026-12-08',note:null,closed:false,version:1}];
  ({b,p}=await boot({init:LOC('77 Lake St, Reno, NV 89501',old),dark:true}));
  await p.evaluate(()=>window.pbOpenLocates('J-200'));await p.waitForTimeout(1500);
  ok(/^Nevada rules \(from the job address\)/.test(await txt(p,'locSrText')||''),'dark: Nevada job from its address');
  const oc=await txt(p,'locT_aaaaaaaa-0000-4000-8000-000000000001');
  ok(/Dec 8/.test(oc||''),'an old ticket keeps its saved expiry (Dec 8), not recomputed: '+oc);
  await p.click('#locSrRules');await p.waitForTimeout(300);
  const darkBg=await p.evaluate(()=>getComputedStyle(document.querySelector('#pbSrView .pbsr-card')).backgroundColor);
  ok(darkBg!==lightBg&&darkBg!=='rgb(255, 255, 255)','dark Rules view card is dark ('+darkBg+' vs light '+lightBg+')');
  w=await wide(p);ok(w.sw<=w.w&&!w.bad.length,'dark Rules view fits 390 px');
  await p.screenshot({path:OUT+'/rules_nv_dark.png'});
  await p.evaluate(()=>window.pbSrClose());
  await p.screenshot({path:OUT+'/locates_nv_dark.png'});
  // no signal: Change State and Rules still work, nothing is sent
  const ctx=p.context();await ctx.setOffline(true);await p.evaluate(()=>window.dispatchEvent(new Event('offline')));
  const before=(await rpcs(p,'pb_job_state_set')).length+(await rpcs(p,'pb_state_rules_get')).length;
  await p.click('#locSrChange');await p.waitForTimeout(200);await p.selectOption('#locSrSel','UT');await p.waitForTimeout(500);
  ok(/^Utah rules \(picked on this phone\)/.test(await txt(p,'locSrText')||''),'no signal: Utah picked on this phone');
  await p.click('#locSrRules');await p.waitForTimeout(300);
  ok(/Blue Stakes of Utah 811/.test(await txt(p,'pbSrVBody')||''),'no signal: Rules for Utah opens from the page');
  await p.evaluate(()=>window.pbSrClose());
  const after=(await rpcs(p,'pb_job_state_set')).length+(await rpcs(p,'pb_state_rules_get')).length;
  ok(after===before,'no signal: nothing sent to the server');
  const stv=await p.evaluate(()=>JSON.parse(localStorage.getItem('pbSr:00000000-0000-4000-8000-000000000001')||'null'));
  ok(stv&&stv.jobs_local&&stv.jobs_local['j-200']&&stv.jobs_local['j-200'].code==='UT','the pick is kept on the phone for later');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await b.close();

  // ---------- D3) the company server has the update: picks are read from it ----------
  ({b,p}=await boot({init:LOC('Job site, no state')+`;window.__rpcOverride.pb_state_rules_get=()=>({ok:true,company_state:'CO',jobs:{'j-300':'TX'},can_set_company:false});window.__rpcOverride.pb_job_state_set=(a)=>({ok:true,state:a.p_state});`}));
  await p.evaluate(()=>window.pbOpenLocates('J-301'));await p.waitForTimeout(1500);
  ok(/^Colorado rules \(the company’s state\)/.test(await txt(p,'locSrText')||''),'no state in the address: the company\'s state from the server (Colorado)');
  await p.evaluate(()=>window.pbOpenLocates('J-300'));await p.waitForTimeout(1200);
  ok(/^Texas rules \(picked for this job\)\. Call 811: Texas811\.$/.test(await txt(p,'locSrText')||''),'a job picked on the server: Texas');
  await p.click('#locSrChange');await p.waitForTimeout(200);await p.selectOption('#locSrSel','OK');await p.waitForTimeout(800);
  ok(/^Oklahoma rules \(picked for this job\)/.test(await txt(p,'locSrText')||''),'a pick the server accepted shows as picked for this job');
  const sa=await rpcs(p,'pb_job_state_set');ok(sa.length&&sa[sa.length-1].p_state==='OK'&&sa[sa.length-1].p_job_number==='J-300','pb_job_state_set got the job and the state');
  ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await b.close();

  // ---------- E) Trench Sloping note and the run flag depth ----------
  for(const [st,depth,want,shot] of [['WA','4.5',/Washington.*4 ft/,'trench_wa'],['CA','4.5',/California.*5 ft/,'trench_ca'],[null,'5.5',/state isn’t known/,'trench_unknown']]){
    ({b,p}=await boot({init:st?`;localStorage.setItem('pbHereState',JSON.stringify({s:'${st}',at:Date.now()}));`:'',dark:st==='CA'}));
    await p.evaluate(()=>pbGoto('trenchCalc'));await p.fill('#trenchDepth',depth);await p.evaluate(()=>window.pbCalcTrench());await p.waitForTimeout(200);
    const t=await txt(p,'trenchStateNote');ok(want.test(t||''),(st||'unknown')+' '+depth+' ft: '+t);
    const over=await txt(p,'trenchStateOver');
    if(st==='WA')ok(/4\.5 ft is 4 ft or more/.test(over||''),'WA 4.5 ft: protective system needed');
    if(st==='CA'){ok(over===null,'CA 4.5 ft: under 5 ft, no protective-system line');ok(/8 CCR 341/.test(await txt(p,'trenchStatePermit')||''),'CA: permit line (8 CCR 341)');}
    if(!st)ok(/5\.5 ft: a protective system is needed/.test(over||''),'unknown state 5.5 ft: protective system needed');
    w=await wide(p);ok(w.sw<=w.w&&!w.bad.length,'trench note fits 390 px');
    await p.screenshot({path:OUT+'/'+shot+'.png',fullPage:true});
    ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));await b.close();}
  ({b,p}=await boot());
  const ft=await p.evaluate(()=>({WA:window.pbSrMath.row('WA').trench.ft,NV:window.pbSrMath.row('NV').trench.ft,IA:window.pbSrMath.row('IA').trench.ft}));
  ok(ft.WA===4&&ft.NV===5&&ft.IA===null,'run flag depth source: WA 4, NV 5, IA not checked (null -> the federal 5 ft floor; HI got its row in r17.14)');
  await b.close();
  console.log('t130 done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
