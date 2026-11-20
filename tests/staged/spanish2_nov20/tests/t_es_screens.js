// Spanish, phases 1 + 2: every translated screen, in Spanish at 390 px:
//   no page errors, no English left over (except intended terms), nothing off-screen or cut.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:9300/cur.html node t_es_screens.js [scenario,scenario]
const L=require('./lib');const fs=require('fs');const path=require('path');
const SHOTS=process.env.PB_OUT||path.join(__dirname,'../shots');try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
// Intended English / not app wording: the app's name, units and sheet abbreviations, product names, what a person typed
// in the test (names, job, address), dates and clock times (phase 2: date words), codes.
const KEEP=[/^The$/,/^Pipelayer['’]s Bible$/,/^PVC, (Sch 40|Sch 80|C900|SDR 35)$/,/^Lenker$/,/^Español$|^English$/,
  /^(Tommy|Luis Ramos|Luis|Brandon Jones|Tom|Test Job|Test Foreman|Job 1|Tommy Fontaine|MH1|Inspect|Vent|Monitor|Radio|None|DIG Civil Construction|1 Main St|Wildomar Ridge|Sundance Sewer Improvement)$/,
  /^Test Job · #1 · 1 Main St$/,/^e\.pipelayersbible\.com\/$/,/^\?[A-Z0-9-]+$/,/^"I'm calling about a confined space emergency/,/^[A-Z0-9]{3} [A-Z0-9]{3}$/,/^tester@example\.com$/,/^[\d:]+ [AP]M — Tom$/];
const UNITS=/\b(ft|yd³|yd|in|ppm|BOP|INV|TOP|HI|ID|OD|O2|LEL|H2S|CO|PM|AM|PST|PDT|MH|C|F|s|min|h|PVC|SDR|HDPE|OSHA|NIOSH|IA|PDF|Safari|Chrome|Anthropic|lb|GPM|CFM|ACH|LF|EA|PSI|psi|gal|t|CLSM|PPE|LOTO|GPS|JSON|CE|mm|Sch|Est|Contractor|Slump|Sub|Supabase|iPhone|iPad|App|PVC|Manning|NFPA|IFSTA|Lenker|Cal|WAC|Northing|Easting|TG|FG|TC|BM|SD|CL|CB|rim|Allegro|Industries|MIT|Garrison|Erig|Washington|Fresno|Elm|St|Main|rd|John|Smith|Springfield|IL|City|Acme|Testing|Labs|PG|E|T|M|x|n|d|P|A|B|vs)\b/g;
const DATES=/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|America\/Los_Angeles)\b/g;
const left=(r)=>{const out=[];const seen=new Set();for(const x of r){if(x.hit)continue;if(x.kind==='mixed')continue; // a sentence with bold words: its parts are listed on their own
  const k=x.k;if(KEEP.some(re=>re.test(k)))continue;const rest=k.replace(/yd³/g,'').replace(UNITS,'').replace(DATES,'');if(!/[A-Za-z]{2,}/.test(rest))continue;if(seen.has(k))continue;seen.add(k);out.push('['+x.kind+'] '+k.slice(0,110));}return out;};
// screen -> the part of the page that is in phase 1 (null = whole page)
const P1={login:null,login_forgot:null,login_bad:null,join:null,join_ios:null,join_code:null,taplink:'#pbTapLink, #pbTapLinkGo',setpw:'#screen-setPassword',setpw_err:'#screen-setPassword',
  a2hs_ios:'#pbObSheet',a2hs_and:'#pbObSheet',home_pl:null,run_setup:null,run_review:null,run_lockask:'#pbModalOverlay',run_locked:null,laid_modal:'#pbModalOverlay',laid_done:null,quick_run:null,
  permit_active:null,permit_addperson:null,permit_noair:'#pbModalOverlay',permit_airform:null,permit_airbad:null,permit_att:'#pbModalOverlay',permit_checkin:null,permit_comm:null,permit_emergency:null,permit_em_enter:'#pbModalOverlay'};
// phase 2 screens: the screen itself (not the tab bar / header chrome of other screens)
const P2={home_fm:null};for(const n of ['settings','notifications','dailyReport','tickets','ticketForm','crewMembers','prodMine','prodNoRun','jobs','stats','jobSummary','reportIssue','appProblem','shortcutsEdit','tools','calcHub','confinedHub','confinedPermit','cutsheetImport','reportsAll','myReports','companyPermits'])P2['fm_'+n]='#screen-'+n;
for(const n of ['crewView','prodMine','settings'])P2['pl_'+n]='#screen-'+n;
for(const n of ['rodElevCalc','slopeConvCalc','fracCalc','constCalc','trenchCalc','liftCalc','bedShadeCalc','volumeCalc','beddingCalc','pipeWeightCalc','bendCalc','manningCalc','flowCalc','manholeDepthCalc','ventCalc'])P2['calc_'+n]='#screen-'+n;
Object.assign(P2,{fm_daily_filled:'#screen-dailyReport',fm_daily_hours:'#screen-dailyReport',run_delay:null,run_utility:null,run_endask:null,pl_records:null,fm_records:null,permit_closeask:'#pbModalOverlay',permit_closed:null});
const SCREENS=Object.assign({},P1,P2);const SETS={p1:Object.keys(P1),p2:Object.keys(P2),p2a:Object.keys(P2).slice(0,14),p2b:Object.keys(P2).slice(14,28),p2c:Object.keys(P2).slice(28,40),p2d:Object.keys(P2).slice(40)};
(async()=>{const b=await L.chromium.launch();const want=process.argv[2]?(SETS[process.argv[2]]||process.argv[2].split(',')):Object.keys(SCREENS);let total=0,hit=0;
 for(const name of want){let p;try{p=await L.SC[name](b,{lang:'es'});}catch(e){ok(false,name+': the screen opens ('+String(e).slice(0,160)+')');continue;}
  const sel=SCREENS[name];let root=null;if(sel){root=await p.evaluate((s)=>{const e=[...document.querySelectorAll(s)].find(x=>x.getClientRects().length);if(!e)return null;e.setAttribute('data-es-root','1');return '[data-es-root]';},sel);if(!root){ok(false,name+': '+sel+' is on screen');await p.context().close();continue;}}
  const r=await L.scan(p,root);const lf=left(r);total+=r.filter(x=>x.kind!=='mixed'||x.hit).length;hit+=r.filter(x=>x.hit).length;
  ok(await p.evaluate(()=>document.documentElement.lang)==='es'&&r.some(x=>x.hit),name+': shown in Spanish ('+r.filter(x=>x.hit).length+' Spanish pieces)');
  ok(lf.length===0,name+': no English left over'+(lf.length?' ('+lf.length+'):\n      '+lf.join('\n      '):''));
  let bad=await L.fits(p);if(bad.length){const q=await L.SC[name](b,{lang:'en'});const base=new Set((await L.fits(q)).map(x=>x.split(' "')[0]));await q.context().close();bad=bad.filter(x=>!base.has(x.split(' "')[0]));} // only what English does not already do
  ok(bad.length===0,name+': fits 390 px'+(bad.length?':\n      '+bad.slice(0,12).join('\n      '):''));
  if(sel==='#pbModalOverlay'){const m=await p.evaluate(()=>{const m=document.getElementById('pbModalMessage');return [m.scrollHeight,m.clientHeight];});ok(m[0]<=m[1]+1,name+': the whole message shows without scrolling on a 390 x 844 phone ('+m.join(' / ')+')');}
  ok(p.errs.length===0,name+': no page errors'+(p.errs.length?' '+p.errs.join(' | ').slice(0,200):''));
  await p.screenshot({path:SHOTS+'/es_'+name+'.png',fullPage:!sel});
  await p.context().close();}
 console.log('pieces on these screens: '+total+', in Spanish: '+hit);
 await b.close();console.log(fails?'FAILED '+fails:'ALL PASS');process.exit(fails?1:0);})();
