// t128 Beta Results (staged, tests/staged/betasummary): the one-page summary of a company's own records that the super
// hands to the owner. Fake Supabase (rig) with a pb_company_beta_summary stub shaped like sql/01_beta_summary.sql.
// Covers: company account and PM/super see it (Home near/after the end, Settings always), foreman and pipelayer don't,
// ended beta still works, notes printed in the PDF (pdftotext), one page, footer states the source and range, the
// server-not-set-up message, 390 px light + dark, Beta Accounts card, no page errors.
// Usage: node t128_betaresults.js   (page: PB_URL, default http://127.0.0.1:8843/cur.html)
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const cp=require('child_process');
const RIG=fs.existsSync(__dirname+'/rig/co.js')?__dirname+'/rig':path.resolve(__dirname,'../../../rig');
const co=require(RIG+'/co'),co_pl=require(RIG+'/co_pl'),mgr=require(RIG+'/mgr');
const BASE=process.env.PB_URL||'http://127.0.0.1:8843/cur.html';
const OUT=(()=>{const d=process.env.PB_OUT||'/tmp/claude-0/bs/out';try{fs.mkdirSync(d,{recursive:true});}catch(e){}return d;})();
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('PASS',m);}else{fail++;console.log('FAIL',m);}};
const allErrs=[];
async function boot(init,dark){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:dark?'dark':'light',serviceWorkers:'block'});
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(RIG+'/fakesb.js','utf8')}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 await ctx.addInitScript(init);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>{p.errs.push(e.message);allErrs.push(e.message);});
 await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(4500);
 await p.evaluate(()=>{const J=window.jspdf&&window.jspdf.jsPDF;if(J)J.API.save=function(n){window.__pdfs=(window.__pdfs||[]).concat([{n,d:this.output('datauristring')}]);return this;};}); // before any PDF is made: jsPDF copies its API onto each new document
 return {b,p};}
const txt=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText.replace(/\s+/g,' ').trim():'';},sel);
const shown=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return !!(e&&e.offsetParent&&getComputedStyle(e).visibility!=='hidden');},sel);
const rpcs=(p,n)=>p.evaluate((n)=>(window.__rpcArgs||[]).filter(x=>x[0]===n).map(x=>x[1]),n);
const overflow=(p,root)=>p.evaluate((root)=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll(root+' *').forEach(e=>{if(!e.offsetParent)return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>w+1||r.left<-1))bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.right));});return bad.slice(0,5);},root);

// the stub: what sql/01_beta_summary.sql returns (numbers from its live rolled-back test)
const SUMMARY=(o)=>`(function(){const day=(n)=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
 const ended=${o.ended?'true':'false'},left=${o.left==null?5:o.left};
 window.__summary={ok:true,as:'${o.as||'owner'}',company:{id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',name:'Acme Pipeline',plan:'trial',status:'active',trial_ends_at:new Date(Date.now()+(ended?-4:left)*864e5).toISOString(),beta_ended:ended,closed:ended},
  window:{kind:'beta',from:day(-27),to:day(ended?-4:0),days:ended?24:28,tz:'America/Los_Angeles'},
  footage:{laid_ft:260.5,pipe_logged_lf:200,runs_locked:4,days_worked:6},crew:{members:5,foremen:2,pipelayers:2,managers:1,active:4},
  caught:{check_shots:4,check_shots_off:2,warn_hi:2,warn_backflow:1,warn_low_slope:1,warn_other:1,delays:2,delay_hours:2.25,utility_conflicts:1,utility_damaged:1,rework:1,rework_hours:2,breakdowns:1,breakdown_hours:3,
   daily_delays:2,daily_delay_hours:5,extra_work:1,extra_work_hours:2.5,inspections:3,inspections_failed:1,inspections_partial:1,permit_readings:4,permit_readings_out:2},
  paperwork:{runs_sent:2,runs_reviewed:1,daily_signed:2,permits_closed:0,permits_backed_up:0,photos_runs:7,photos_daily:4,sealed_copies:2},use:{days_used:3,stake_reads:7},generated_at:new Date().toISOString()};
 window.__rpcOverride=Object.assign(window.__rpcOverride||{},{
  pb_my_plan:()=>({ok:true,plan:'trial',trial_ends_at:window.__summary.company.trial_ends_at,expired:ended,closed:ended,days_left:ended?0:left,limits:{seats:7}}),
  ${o.missing?'':"pb_company_beta_summary:()=>window.__summary,"}
 });})();`;
// the company account (owns the company; no member row), a PM/superintendent member
const COMPANY=co+mgr+`;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{companies:{name:'Acme Pipeline',status:'active'}});
 window.__rpcOverride.pb_report_access=()=>({member:false,manager:true,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'});})();`;
const SUPER=co+`;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{company_members:{company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',role:'pm',title:'superintendent',companies:{name:'Acme Pipeline',status:'active'}}});
 const now=()=>new Date().toISOString();window.__rpcOverride.pb_prod_access=()=>({member:true,company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',manager:true,role:'pm',server_at:now()});
 window.__rpcOverride.pb_report_access=()=>({member:true,company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',manager:true,managed_company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5'});})();`;
const FOREMAN=co+`;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{company_members:{company_id:'11111111-1111-4111-8111-111111111111',role:'foreman',title:'project_manager',companies:{name:'Acme Pipeline',status:'active'}}});})();`;
const PIPELAYER=co_pl+`;(function(){window.__tableOne=Object.assign(window.__tableOne||{},{company_members:{company_id:'11111111-1111-4111-8111-111111111111',role:'pipelayer',title:'project_manager',companies:{name:'Acme Pipeline',status:'active'}}});})();`;
const toSettings=async(p)=>{await p.evaluate(()=>window.pbGoto('settings'));await p.waitForTimeout(1500);};
async function pdfText(p,file){
 for(let i=0;i<40;i++){const ready=await p.evaluate(()=>{const b=document.getElementById('pdfvShare');const d=document.getElementById('pdfvDownload');return !!(d&&(!b||!b.disabled||b.style.display==='none'));});if(ready)break;await p.waitForTimeout(250);}
 await p.waitForTimeout(1500);
 await p.evaluate(()=>window.pbPdfViewDownload());await p.waitForTimeout(2000);
 const got=await p.evaluate(()=>(window.__pdfs||[]).slice(-1)[0]||null);if(!got)return {name:null,text:'',pages:0};
 const buf=Buffer.from(got.d.split(',')[1],'base64');fs.writeFileSync(OUT+'/'+file,buf);
 const text=cp.execSync('pdftotext -layout '+OUT+'/'+file+' -').toString();const pages=Number((/Pages:\s+(\d+)/.exec(cp.execSync('pdfinfo '+OUT+'/'+file).toString())||[])[1]||0);
 return {name:got.n,text,pages};}

(async()=>{
 // ---------- A: company account, beta 5 days left, light ----------
 let {b,p}=await boot(COMPANY+SUMMARY({left:5}),false);
 const line=await txt(p,'#pbBetaLine');console.log('  home line:',line);
 ok(await shown(p,'#pbBetaLine [data-bres]'),'company account, 5 days left: Home shows Beta Results');
 ok(await p.evaluate(()=>window.pbBresCanSee()),'company account can see it');
 await p.click('#pbBetaLine [data-bres]');await p.waitForTimeout(1200);
 const sh=await txt(p,'#pbBresSheet');console.log('  sheet:',sh.slice(0,900));
 ok((await rpcs(p,'pb_company_beta_summary')).length===1&&JSON.stringify((await rpcs(p,'pb_company_beta_summary'))[0])==='{}','calls pb_company_beta_summary for the caller\'s own company (no id)');
 ok(/Acme Pipeline/.test(sh)&&/260\.5 ft laid/.test(sh)&&/Beta · 5 days left/.test(sh),'sheet: company, footage, beta days left');
 ok(/Runs locked 4/.test(sh)&&/Days with work logged 6/.test(sh)&&/Crew on the app 4 of 5 active \(2 foremen, 2 pipelayers, 1 PM or super\)/.test(sh),'sheet: the work rows');
 ok(/Check shots taken on laid pipe 4, 2 off grade by more than 0\.02 ft/.test(sh)&&/HI discrepancies flagged 2/.test(sh)&&/Delays logged on runs 2, 2\.3 hours/.test(sh)&&/Utility conflicts logged 1, 1 damaged/.test(sh)&&/Inspections recorded 3 \(1 failed, 1 partial\)/.test(sh)&&/Permit air readings outside the permit limits 2 of 4 readings/.test(sh),'sheet: caught and logged, plain labels with hours');
 ok(/Run reports sent to the office 2/.test(sh)&&/Daily reports signed 2/.test(sh)&&/Sealed run report copies stored 2/.test(sh)&&!/Confined-space permits closed/.test(sh),'sheet: paperwork; zero rows left out');
 ok(!/saved \d|hours saved|time saved:/i.test(sh.replace(/estimate of time saved/,'')),'no time-saved number from the app');
 ok(!/—/.test(sh),'no em-dash in the sheet');
 ok((await overflow(p,'#pbBresSheet')).length===0,'390 px light: nothing runs off the side '+JSON.stringify(await overflow(p,'#pbBresSheet')));
 await p.screenshot({path:OUT+'/sheet_light.png'});
 const NOTE='Crew says grade checks saved a dig-up on MH-4. My estimate: about 1 hour a day on paperwork per foreman.';
 await p.fill('#pbBresNotes',NOTE);await p.waitForTimeout(200);
 ok(/\d+ \/ 600/.test(await txt(p,'#pbBresCount')),'notes counter shown');
 await p.click('#pbBresPdf');await p.waitForTimeout(2500);
 ok(await p.evaluate(()=>/\bactive\b/.test(document.getElementById('screen-pdfView').className))&&!(await p.evaluate(()=>!!document.getElementById('pbBresSheet'))),'Make PDF opens the PDF viewer (sheet closed)');
 const P1=await pdfText(p,'beta_results_company.pdf');console.log('  pdf name:',P1.name,'pages',P1.pages);console.log(P1.text.split('\n').slice(0,70).join('\n'));
 const flat=P1.text.replace(/\s+/g,' ');
 ok(P1.pages===1,'PDF is one page');
 ok(/^beta-results-Acme_Pipeline-\d{4}-\d{2}-\d{2}\.pdf$/.test(P1.name||''),'file name beta-results-<company>-<date>.pdf');
 ok(/Beta Results/.test(flat)&&/Acme Pipeline/.test(flat)&&/260\.5 FT OF PIPE LAID · 4 RUNS LOCKED/.test(flat),'PDF: title, company, banner');
 ok(/Check shots taken on laid pipe/.test(flat)&&/Delays logged on runs/.test(flat)&&/2, 2\.3 hours/.test(flat)&&/Run reports sent to the office/.test(flat),'PDF: the same rows as the sheet');
 ok(flat.includes('dig-up on MH-4')&&flat.includes('about 1 hour a day on paperwork per foreman'),'PDF: the notes, as typed');
 ok(/Notes/.test(flat)&&/in their own words\. Any estimate here is theirs, not counted by the app/.test(flat),'PDF: notes labelled as his own words and estimate');
 ok(/from Acme Pipeline.s own records in The Pipelayer.s Bible, \w{3} \d+, \d{4} to \w{3} \d+, \d{4}/.test(flat)&&/does not estimate time or money saved/.test(flat),'PDF footer statement: own records, date range, no estimate');
 ok(!/—/.test(P1.text),'PDF: no em-dash');
 await b.close();

 // ---------- B: company account, 20 days left: no Home button, but Settings has the row ----------
 ({b,p}=await boot(COMPANY+SUMMARY({left:20}),false));
 ok(!(await shown(p,'#pbBetaLine [data-bres]')),'20 days left: no Home button');
 await toSettings(p);
 ok(await shown(p,'#settingsBetaResultsBtn'),'Settings > Company: Beta Results row (always)');
 await p.click('#settingsBetaResultsBtn');await p.waitForTimeout(1200);
 ok(/260\.5 ft laid/.test(await txt(p,'#pbBresSheet')),'Settings row opens the sheet');
 await b.close();

 // ---------- C: ended beta (company closed): still works, dark mode ----------
 ({b,p}=await boot(COMPANY+SUMMARY({ended:true}),true));
 const l2=await txt(p,'#pbBetaLine');console.log('  ended home line:',l2);
 ok(/Trial ended/.test(l2)&&await shown(p,'#pbBetaLine [data-bres]'),'ended beta: Home shows Trial ended and Beta Results (firstweek_web_nov22: the chip says Trial)');
 await p.click('#pbBetaLine [data-bres]');await p.waitForTimeout(1200);
 const s2=await txt(p,'#pbBresSheet');
 ok(/Beta ended/.test(s2)&&/24 days/.test(s2)&&/260\.5 ft laid/.test(s2),'ended beta: sheet loads with Beta ended and the beta dates');
 ok((await overflow(p,'#pbBresSheet')).length===0,'390 px dark: nothing runs off the side');
 const dk=await p.evaluate(()=>{const c=getComputedStyle(document.querySelector('#pbBresSheet .pb-fb-card'));const m=c.backgroundColor.match(/\d+/g).map(Number);const t=getComputedStyle(document.querySelector('#pbBresSheet .pb-bres-row .k')).color.match(/\d+/g).map(Number);return {bg:m,fg:t};});
 console.log('  dark colors',JSON.stringify(dk));
 ok(dk.bg[0]+dk.bg[1]+dk.bg[2]<200&&dk.fg[0]+dk.fg[1]+dk.fg[2]>450,'dark mode: dark card, light text');
 await p.screenshot({path:OUT+'/sheet_dark.png'});
 await p.click('#pbBresPdf');await p.waitForTimeout(2500);
 const P2=await pdfText(p,'beta_results_ended.pdf');
 ok(P2.pages===1&&/Beta ended/.test(P2.text)&&/Notes/.test(P2.text),'ended beta: one-page PDF, empty notes box printed for writing in');
 await b.close();

 // ---------- D: PM / superintendent, 3 days left ----------
 ({b,p}=await boot(SUPER+SUMMARY({left:3,as:'pm'}),false));
 ok(await p.evaluate(()=>window.pbBresCanSee()),'superintendent can see it');
 ok(await shown(p,'#pbBetaLine [data-bres]'),'superintendent, 3 days left: Home shows Beta Results');
 await p.click('#pbBetaLine [data-bres]');await p.waitForTimeout(1200);
 const s3=await txt(p,'#pbBresSheet');
 ok(/Superintendent.s notes \(optional\)/.test(s3),'superintendent: notes titled Superintendent\'s notes');
 await p.fill('#pbBresNotes','Saved me two trips to the yard.');
 await p.click('#pbBresPdf');await p.waitForTimeout(2500);
 const P3=await pdfText(p,'beta_results_super.pdf');
 ok(P3.pages===1&&/Superintendent.s notes/.test(P3.text)&&/Saved me two trips to the yard\./.test(P3.text),'superintendent PDF: his notes under Superintendent\'s notes');
 // the longest notes (600 characters, several lines) with every row present: still one page
 await p.evaluate(()=>window.pbBetaResultsOpen());await p.waitForTimeout(1200);
 const LONG=Array.from({length:12},(_,i)=>'Line '+(i+1)+': the crew logged delays and check shots every day without being told.').join('\n').slice(0,600);
 await p.fill('#pbBresNotes',LONG);await p.click('#pbBresPdf');await p.waitForTimeout(2500);
 const P4=await pdfText(p,'beta_results_long.pdf');
 ok(P4.pages===1&&/Line 1: the crew logged/.test(P4.text)&&/Days the crew used the app/.test(P4.text),'600-character notes and every row: still one page');
 await toSettings(p);ok(await shown(p,'#settingsBetaResultsBtn'),'superintendent: Settings row');
 await b.close();

 // ---------- E: foreman and pipelayer: nothing ----------
 for(const [nm,init] of [['foreman',FOREMAN],['pipelayer',PIPELAYER]]){
  ({b,p}=await boot(init+SUMMARY({left:2}),false));
  ok(!(await p.evaluate(()=>window.pbBresCanSee())),nm+': cannot see it');
  ok(!(await shown(p,'#pbBetaLine [data-bres]')),nm+', 2 days left: no Home button');
  await toSettings(p);
  ok(!(await shown(p,'#settingsBetaResultsBtn')),nm+': no Settings row');
  ok((await rpcs(p,'pb_company_beta_summary')).length===0,nm+': the summary is never asked for');
  await b.close();
 }

 // ---------- F: server not set up (the RPC answers nothing) ----------
 ({b,p}=await boot(COMPANY+SUMMARY({left:5,missing:true}),false));
 await p.evaluate(()=>window.pbBetaResultsOpen());await p.waitForTimeout(1200);
 const s4=await txt(p,'#pbBresSheet');console.log('  missing:',s4);
 ok(/Beta Results isn.t set up on the server yet\. Nothing was changed\./.test(s4)&&!(await p.evaluate(()=>!!document.getElementById('pbBresPdf'))),'server not set up: says so plainly, no PDF button');
 await p.evaluate(()=>{window.__rpcOverride.pb_company_beta_summary=()=>{throw Object.assign(new Error('Could not find the function public.pb_company_beta_summary in the schema cache'),{code:'PGRST202'});};});
 await p.evaluate(()=>window.pbBetaResultsOpen());await p.waitForTimeout(1200);
 ok(/isn.t set up on the server yet/.test(await txt(p,'#pbBresSheet')),'PGRST202 error: same message');
 await p.evaluate(()=>{window.__rpcOverride.pb_company_beta_summary=()=>{throw new Error('pb:not_allowed');};});
 await p.evaluate(()=>window.pbBetaResultsOpen());await p.waitForTimeout(1200);
 ok(/for the company account and its PMs and superintendents/.test(await txt(p,'#pbBresSheet')),'refused by the server: plain message');
 await b.close();

 // ---------- G: the app owner's Beta Accounts card ----------
 ({b,p}=await boot(co+SUMMARY({left:5})+`;window.__rpcOverride.pb_support_is_admin=()=>true;window.__rpcOverride.pb_owner_overview=()=>({ok:true,totals:null,companies:[{id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',name:'Acme Pipeline',plan:'trial',trial_ends_at:new Date(Date.now()+5*864e5).toISOString(),users:6,active_7d:3,active_days:9,laid_ft:260,laid_ft_30:260,runs:4,photos:7,reports_30:2,ai:{},ai_usd:0,events:{},plan_sets:0,plan_sheets:0,feedback:0}]});window.__rpcOverride.pb_owner_plan_requests=()=>({ok:true,requests:[]});`,false));
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1500);
 ok(await shown(p,'#pbOwnList .pb-own-co[data-id="d01a4a5f-312a-418f-9172-ea9aec9784b5"] [data-act="bres"]'),'Beta Accounts: Beta Results on the company card');
 await p.click('#pbOwnList .pb-own-co[data-id="d01a4a5f-312a-418f-9172-ea9aec9784b5"] [data-act="bres"]');await p.waitForTimeout(1200);
 const a=(await rpcs(p,'pb_company_beta_summary'))[0]||{};
 ok(a.p_company==='d01a4a5f-312a-418f-9172-ea9aec9784b5'&&/260\.5 ft laid/.test(await txt(p,'#pbBresSheet')),'Beta Accounts: asks for that company by id, sheet on top');
 await b.close();

 ok(allErrs.length===0,'no page errors '+JSON.stringify(allErrs.slice(0,3)));
 console.log('RESULT',pass,'PASS',fail,'FAIL');process.exit(fail?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
