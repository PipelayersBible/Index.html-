// billing_yearly_nov20 (from pricing_build_nov20/t_price_app.js): Monthly / Yearly pick, sheets read on Billing.
// pricing_nov20: the price shown in the app (beta line, beta ended, removed, no plan, Settings, Crew Members, owner Billing),
// the individual plan request wording, and the "limit reached" messages. Fake server (boot_ob + obsrv + __rpcOverride).
// Run: (serve the patched page as cur.html)  PB_URL=http://127.0.0.1:9850/cur.html NODE_PATH=/opt/npm-tools/node_modules node t_price_app.js
const {chromium}=require('playwright');const boot=require('./boot_ob');
const BASE=(process.env.PB_URL||'http://127.0.0.1:9850/cur.html');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const OFFICE={id:'00000000-0000-4000-8000-000000000001',email:'office@example.com',user_metadata:{full_name:'Test Office'},app_metadata:{}};
const FOREMAN={id:'00000000-0000-4000-8000-0000000000f1',email:'ray@example.com',user_metadata:{full_name:'Ray'},app_metadata:{}};
const NOBODY={id:'00000000-0000-4000-8000-0000000000aa',email:'solo@example.com',user_metadata:{full_name:'Solo'},app_metadata:{}};
const PR={base_cents:9900,base_seats:5,seat_cents:1200,yearly_months:10,founder_months:12,individual_cents:1500,individual_year_cents:14400,plan_sheet_cents:100,plan_reading_cents:null};
const C='d01a4a5f-312a-418f-9172-ea9aec9784b5';
const MEMBER=`window.__tableOne={subscriptions:{tier:'none',status:'inactive'},company_members:{company_id:'${C}',role:'foreman',companies:{name:'DIG Civil Construction',status:'active'}}};`;
const CO=`window.__tableOne={subscriptions:{tier:'none',status:'inactive'},company_members:null,companies:{name:'DIG Civil Construction',status:'active'}};window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_report_access:()=>({manager:true,managed_company_id:'${C}'})});`;
const NONE=`window.__tableOne={subscriptions:{tier:'none',status:'inactive'},company_members:null};`;
const plan=(o)=>`window.__plan=${JSON.stringify(o)};window.__reqs=[];window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_my_plan:()=>window.__plan,pb_terms_status:()=>({terms:'1.0',privacy:'1.0',at:new Date().toISOString()}),pb_plan_request:(a)=>{window.__reqs.push(a.p_kind);window.__plan=Object.assign({},window.__plan,{requested:true});return {ok:true};}});`;
const days=(n)=>new Date(Date.now()+n*864e5).toISOString();
const line=(p)=>p.evaluate(()=>{const l=document.getElementById('pbBetaLine');return l&&!l.hidden?l.innerText.replace(/\s+/g,' ').trim():'';});
const noSide=(p)=>p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);
(async()=>{
 const b=await chromium.launch();
 const open=async(user,init,extra={})=>{const srv=require('./obsrv')({plan:extra.srvPlan||'trial'});const r=await boot(b,BASE,srv,Object.assign({user,init,wait:5200},extra));return r.p;};
 let p,t;

 // 1. company account, beta running
 p=await open(OFFICE,CO+plan({ok:true,plan:'trial',trial_ends_at:days(28),expired:false,closed:false,individual:false,paused:false,requested:false,days_left:28,limits:{seats:7},prices:PR}));
 t=await line(p);console.log('  1:',t);
 ok(/Beta 28 days left/.test(t)&&t.includes('After the beta: $99 a month for your company and 5 people, $12 a month for each extra person, plus applicable tax.'),'1a beta, company account: the price after the beta');
 ok(t.includes('Start your plan before the beta ends and this price is locked for 12 months.'),'1b founder lock said');
 ok(await noSide(p),'1c no sideways scroll at 390');
 await p.screenshot({path:__dirname+'/../shots/1_beta_company.png'});
 await p.evaluate(()=>pbOpenCrewMembers());await p.waitForTimeout(1500);
 t=await p.evaluate(()=>document.getElementById('crSeats').textContent);console.log('  crew:',t);
 ok(/1 of 6 people in the beta \(plus the company account\) · After the beta: \$99 a month for 1 person, plus tax/.test(t),'1d Crew Members: what the people cost after the beta');
 ok(p.errs.length===0,'1e no page errors '+JSON.stringify(p.errs));await p.context().close();

 // 2. company account, beta ended
 p=await open(OFFICE,CO+plan({ok:true,plan:'trial',trial_ends_at:days(-1),expired:true,closed:false,individual:false,requested:false,days_left:0,limits:{seats:7},prices:PR}));
 t=await line(p);console.log('  2:',t);
 ok(/Beta ended/.test(t)&&t.includes('The company plan is $99 a month for your company and 5 people, $12 a month for each extra person, plus applicable tax.')&&/Start Company Plan/.test(t),'2a beta ended: price next to Start Company Plan');
 await p.click('#pbBetaLine [data-plan="company"]');await p.waitForTimeout(700);t=await line(p);console.log('  2 after:',t);
 ok(t.includes('Request sent. You’ll get an email with the invoice: $99 a month for your company and 5 people, $12 a month for each extra person, plus applicable tax.')&&!/be contacted/.test(t),'2b after the request: the price, not "you’ll be contacted"');
 ok(JSON.stringify(await p.evaluate(()=>window.__reqs))==='["company"]','2c the same request as before (pb_plan_request company)');
 ok(await noSide(p),'2d no sideways scroll');await p.screenshot({path:__dirname+'/../shots/2_ended_company_sent.png'});
 ok(p.errs.length===0,'2e no page errors '+JSON.stringify(p.errs));await p.context().close();

 // 3. a foreman, beta ended: own plan price; the request wording survives a refresh
 p=await open(FOREMAN,MEMBER+plan({ok:true,plan:'trial',trial_ends_at:days(-1),expired:true,closed:false,individual:false,requested:false,days_left:0,limits:{seats:7},prices:PR}));
 t=await line(p);console.log('  3:',t);
 ok(t.includes('Your own plan is $15 a month, or $144 for a year ($12 a month, save $36), plus applicable tax.')&&/Company Plan/.test(t)&&t.includes('My Own Plan: Monthly $15')&&t.includes('My Own Plan: Yearly $144, save $36'),'3a member: Company Plan, or their own plan Monthly $15 / Yearly $144 save $36');
 ok(await noSide(p),'3a2 no sideways scroll with three buttons');await p.screenshot({path:__dirname+'/../shots/3_ended_member_pick.png'});
 await p.click('#pbBetaLine [data-plan="individual:year"]');await p.waitForTimeout(700);t=await line(p);console.log('  3 after:',t);
 ok(t.includes('Request sent: yearly, $144 a year ($12 a month), plus applicable tax. You’ll get an email with how to pay.'),'3b after Yearly: the yearly price said back');
 ok(JSON.stringify(await p.evaluate(()=>window.__reqs))==='["individual:year"]','3b2 the request carries the pick (individual:year)');
 await p.evaluate(()=>{window.pbAccountLoadHooks.forEach(f=>{try{f();}catch(e){}});});await p.waitForTimeout(3200);t=await line(p);
 ok(t.includes('Request sent: yearly, $144 a year'),'3c same wording after the plan is read again');
 await p.context().close();

 // 4. the server's prices win (a later price change shows without a new app build)
 p=await open(OFFICE,CO+plan({ok:true,plan:'trial',trial_ends_at:days(5),expired:false,closed:false,individual:false,requested:false,days_left:5,limits:{seats:7},prices:Object.assign({},PR,{base_cents:10900,seat_cents:1350,individual_cents:1800,individual_year_cents:18000})}));
 t=await line(p);ok(t.includes('$109 a month for your company and 5 people, $13.50 a month for each extra person'),'4a line follows the server price');
 t=await p.evaluate(()=>document.getElementById('settingsPlanHelp').textContent.replace(/\s+/g,' '));console.log('  settings:',t.slice(0,200));
 ok(t.includes('Company plan: $109 a month for your company and 5 people. $13.50 a month for each extra person.')&&t.includes('Individual plan: $18 a month, or $15 a month billed yearly ($180 a year, save $36)'),'4b Settings follows the server price');
 await p.context().close();

 // 5. Settings > What each plan includes (default prices), and a signed-in person with no plan
 p=await open(NOBODY,NONE+plan({ok:true,plan:null,individual:false,requested:false,prices:PR}),{srvPlan:'paid'});
 t=await line(p);console.log('  5:',t);
 ok(/No plan yet/.test(t)&&t.includes('Your own plan is $15 a month, or $144 for a year ($12 a month, save $36), plus applicable tax')&&t.includes('Monthly $15')&&t.includes('Yearly $144, save $36')&&!/Get My Own Plan/.test(t),'5a no plan: Monthly $15 / Yearly $144 save $36');
 await p.screenshot({path:__dirname+'/../shots/5_no_plan_pick.png'});
 await p.click('#pbBetaLine [data-plan="individual:month"]');await p.waitForTimeout(700);t=await line(p);
 ok(t.includes('Request sent: monthly, $15 a month, plus applicable tax. You’ll get an email with how to pay.')&&JSON.stringify(await p.evaluate(()=>window.__reqs))==='["individual:month"]','5b Monthly: request carries the pick, price said back');
 await p.screenshot({path:__dirname+'/../shots/5_no_plan_sent.png'});
 t=await p.evaluate(()=>document.getElementById('settingsPlanHelp').textContent.replace(/\s+/g,' '));
 ok(t.includes('Company plan: $99 a month for your company and 5 people. $12 a month for each extra person. Pay for the year and get 12 months for the price of 10.')&&t.includes('The company account is free and doesn’t count.'),'5c Settings: company plan price and who counts');
 ok(t.includes('Individual plan: $15 a month, or $12 a month billed yearly ($144 a year, save $36)')&&t.includes('plus applicable tax')&&t.includes('There is no free plan')&&!/Contractor plan/.test(t),'5d Settings: individual price, tax, no free plan');
 ok(/daily reports/.test(t)&&/tickets/.test(t)&&/Ask/.test(t)&&/25 a day/.test(t)&&/5 a day/.test(t)&&/15 a day, 50 a month/.test(t)&&/shares 60 a month/.test(t),'5e Settings: the real feature list and the limits');
 ok(t.includes('Plan reading (add-on for company plans): $1 a sheet, charged once when the sheet is read. Questions about your plans after that count as normal Ask requests.')&&/isn’t turned on yet/.test(t),'5e2 Settings: the plan reading price ($1 a sheet, once) and that it is not on yet');
 await p.evaluate(()=>{pbGoto('settings');const d=document.getElementById('settingsPlanMore');d.open=true;d.scrollIntoView();});await p.waitForTimeout(500);
 ok(await noSide(p),'5f Settings: no sideways scroll');await p.screenshot({path:__dirname+'/../shots/5_settings_plans.png'});
 ok(p.errs.length===0,'5g no page errors '+JSON.stringify(p.errs));await p.context().close();
 // an older server (no "individual" in the answer): nothing new is shown
 p=await open(NOBODY,NONE+plan({ok:true,plan:null}),{srvPlan:'paid'});
 ok((await line(p))==='','5h server not updated yet: no "No plan" card');await p.context().close();
 // a price list from before the yearly price was added: the built-in $144 is used
 p=await open(NOBODY,NONE+plan({ok:true,plan:null,individual:false,requested:false,prices:{base_cents:9900,base_seats:5,seat_cents:1200,yearly_months:10,founder_months:12,individual_cents:1500}}),{srvPlan:'paid'});
 t=await line(p);ok(t.includes('Your own plan is $15 a month, or $144 for a year ($12 a month, save $36), plus applicable tax'),'5i a price list without the yearly price: built-in $144');await p.context().close();

 // 6. removed from a company
 p=await open(NOBODY,NONE+plan({ok:true,plan:null,removed:{company:'DIG Civil',at:days(-1)},individual:false,requested:false,prices:PR}),{srvPlan:'paid'});
 t=await line(p);console.log('  6:',t);
 ok(t.includes('no longer part of DIG Civil')&&t.includes('Would you like your own plan? It’s $15 a month, or $144 for a year ($12 a month, save $36), plus applicable tax.')&&t.includes('Monthly $15')&&t.includes('Yearly $144, save $36')&&/Not Now/.test(t),'6a removed: Monthly / Yearly / Not Now');
 await p.click('#pbBetaLine [data-own="individual:year"]');await p.waitForTimeout(700);t=await line(p);
 ok(t.includes('Request sent: yearly, $144 a year ($12 a month)')&&JSON.stringify(await p.evaluate(()=>window.__reqs))==='["individual:year"]','6b removed: Yearly request sent with the pick');await p.context().close();

 // 7. a limit was reached: which one, and when it resets
 p=await open(FOREMAN,MEMBER+plan({ok:true,plan:'paid',expired:false,closed:false,individual:false,paused:false,requested:false,prices:PR}),{srvPlan:'paid'});
 await p.route(/functions\/v1\/ai/,r=>r.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:'daily_limit',message:'x',limit:20})}));
 const ask=async(lim)=>{await p.evaluate((l)=>{window.__rpcOverride.pb_my_limits=l===undefined?undefined:(a)=>{window.__limArgs=a;return l;};if(l===undefined)delete window.__rpcOverride.pb_my_limits;},lim);
   await p.fill('#aiAskBox','What slope for 8 inch sewer '+(++qn)+'?');await p.click('#aiAskBtn');await p.waitForTimeout(1300);
   const m=await p.evaluate(()=>document.getElementById('aiAskStatus').innerText.replace(/\s+/g,' ').trim());return {code:'daily_limit',message:m};};
 let qn=0;await p.evaluate(()=>{try{localStorage.setItem('pbAiPrivacyAck','1');}catch(e){}pbGoto('aiAsk');});await p.waitForTimeout(900);
 const L=(reached,who)=>({ok:true,who:who||'member',reached,day:{used:25,limit:who==='owner'?5:25},month:{used:150,limit:150},company_day:{used:60,limit:60},company_month:{used:300,limit:300},people:5});
 let r=await ask(L('person_day'));console.log('  7:',JSON.stringify(r));
 ok(r.message.includes('You’ve used today’s 25 AI requests. It resets tomorrow.'),'7a person, day');
 ok((await p.evaluate(()=>window.__limArgs.p_feature))==='teacher','7b asks the server about the same feature');
 r=await ask(L('feature_day'));ok(r.message.includes('You’ve used today’s limit for this. It resets tomorrow.'),'7c this feature, day');
 r=await ask(L('person_month'));ok(r.message.includes('You’ve used this month’s 150 AI requests. It resets on the 1st.'),'7d person, month');
 r=await ask(L('company_day'));ok(r.message.includes('Your company has used today’s 60 AI requests. It resets tomorrow.'),'7e company, day');
 r=await ask(L('company_month'));ok(r.message.includes('Your company has used this month’s 300 AI requests. It resets on the 1st.'),'7f company, month');
 r=await ask(L('budget'));ok(r.message.includes('This month’s AI allowance is used up. It resets on the 1st. Everything else still works.'),'7g the dollar stop');
 r=await ask(L('plan'));ok(r.message.includes('Your plan isn’t active, so AI is off. Everything else on this phone still works.'),'7h plan not active');
 r=await ask(L('person_day','owner'));ok(r.message.includes('You’ve used today’s 5 AI requests. It resets tomorrow. The company account has a small allowance. People on your plan have more.'),'7i the company account');
 r=await ask(undefined);ok(r.message.includes('You’ve hit today’s limit. It resets tomorrow.'),'7j server not updated yet: the old message');
 ok(p.errs.length===0,'7k no page errors '+JSON.stringify(p.errs));await p.context().close();

 // 8. the app owner's Billing: the individual price and an individual plan that is due
 const iso=(d)=>d.toISOString().slice(0,10),pt=iso(new Date(Date.now()-2*864e5));
 const OWN=`window.__ind=[{user_id:'u-1',email:'solo@example.com',cents:1500,year_cents:14400,interval:'month',paid_through:'${pt}',lock_on:'${iso(new Date(Date.now()+5*864e5))}',state:'past_due',next:{from:'${pt}',to:'${iso(new Date(Date.now()+28*864e5))}',amount_cents:1500,due:true}}];
  Object.assign(window.__rpcOverride,{pb_support_is_admin:()=>true,pb_owner_overview:()=>({ok:true,totals:null,companies:[{id:'${C}',name:'DIG Civil Construction',plan:'paid',users:3,active_7d:2,active_days:9,laid_ft:100,laid_ft_30:100,runs:2,photos:3,reports_30:1,plan_sets:3,plan_sheets:75,ai:{},events:{}}]}),
   pb_owner_plan_requests:()=>({ok:true,requests:[{user_id:'u-2',kind:'individual',interval:'year',who:'yr@example.com',email:'yr@example.com'},{user_id:'u-3',kind:'individual',interval:null,who:'old@example.com',email:'old@example.com'}]}),
   pb_owner_individual_on:(a)=>{(window.__onArgs=window.__onArgs||[]).push(a);return {ok:true,interval:a.p_interval||'month'};},
   pb_owner_sheets_read:window.__noSR?undefined:()=>({ok:true,sheet_cents:100,companies:[{company_id:'${C}',month:54,last_month:3,total:57,usd_month:15.07}],individuals:[],all:{month:54,last_month:3,total:57}}),
   pb_owner_billing:()=>({ok:true,settings:{seller_legal_name:null,base_cents:9900,base_seats:5,seat_cents:1200,yearly_months:10,invoice_ahead_days:7,individual_cents:1500,individual_year_cents:14400,plan_sheet_cents:100},companies:[],due:[],individuals:window.__ind}),
   pb_owner_individual_paid:(a)=>{window.__paidArgs=a;window.__ind[0]=Object.assign({},window.__ind[0],{paid_through:window.__ind[0].next.to,state:'active',interval:a.p_interval||window.__ind[0].interval});return {ok:true,individuals:window.__ind};}});
  if(window.__noSR)delete window.__rpcOverride.pb_owner_sheets_read;`;
 p=await open(OFFICE,CO+plan({ok:true,plan:null})+OWN,{srvPlan:'paid'});
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1500);
 t=await p.evaluate(()=>{const d=document.getElementById('pbBillDue');return d?d.innerText.replace(/\s+/g,' '):'';});console.log('  8:',t);
 ok(t.includes('$99.00 a month includes 5 people, $12.00 each extra · yearly = 10 months · individual $15.00 a month or $144.00 a year · plan reading $1.00 a sheet'),'8a Billing: the price rule with the individual prices and the plan reading price');
 ok(!/Nothing to invoice/.test(t)&&t.includes('solo@example.com · individual, monthly')&&/Past due/.test(t)&&t.includes('next: $15.00 for the month')&&t.includes('Paid for a Year Instead ($144.00)'),'8b Billing: the individual plan that is due, monthly, with Paid for a Year Instead');
 ok(t.includes('Plan sheets read, everyone: 54 this month · 3 last month · 57 in all · $1 a sheet when plan reading is on'),'8b2 Billing due: sheets read, everyone');
 const card=await p.evaluate((c)=>{const d=document.querySelector('#pbOwnList .pb-own-co[data-id="'+c+'"]');return d?d.innerText.replace(/\s+/g,' '):'';},C);console.log('  8 card:',card);
 ok(card.includes('Plan sheets read: 54 this month · 3 last month · 57 in all'),'8b3 the company card: sheets read this month, last month, in all');
 const rq=await p.evaluate(()=>{const d=[...document.querySelectorAll('#pbOwnList .pb-own-co')].find(x=>/Plan requests/.test(x.innerText));return d?d.innerText.replace(/\s+/g,' '):'';});console.log('  8 requests:',rq);
 ok(rq.includes('yr@example.com wants their own plan, yearly ($144.00 a year)')&&rq.includes('old@example.com wants their own plan Turn On Monthly'),'8b4 requests: the pick is shown (none for an old request)');
 const solid=await p.evaluate(()=>[...document.querySelectorAll('[data-uid] [data-on]')].map(b=>b.closest('[data-uid]').dataset.uid+':'+b.dataset.on+':'+(b.classList.contains('ghost')?'ghost':'solid')).join(','));
 ok(solid==='u-2:month:ghost,u-2:year:solid,u-3:month:solid,u-3:year:ghost','8b5 Turn On Monthly / Yearly: the person\'s pick is the solid one ('+solid+')');
 await p.click('[data-uid="u-2"] [data-on="year"]');await p.waitForTimeout(900);
 ok(JSON.stringify(await p.evaluate(()=>window.__onArgs))==='[{"p_user":"u-2","p_interval":"year"}]','8b6 Turn On Yearly sends p_interval year');
 await p.click('[data-indpaid="u-1"][data-iv="year"]');await p.waitForTimeout(600);
 const pa=await p.evaluate(()=>window.__paidArgs);t=await p.evaluate(()=>document.querySelector('[data-ind="u-1"]').innerText.replace(/\s+/g,' '));
 ok(pa&&pa.p_user==='u-1'&&pa.p_from===pt&&pa.p_interval==='year'&&/Marked paid for the year\. Paid through/.test(t)&&!/Past due/.test(t),'8c Paid for a Year Instead sends year and the period it saw; the row says so ('+t+')');
 ok(await noSide(p),'8d no sideways scroll');await p.screenshot({path:__dirname+'/../shots/8_owner_billing.png',fullPage:true});ok(p.errs.length===0,'8e no page errors '+JSON.stringify(p.errs));await p.context().close();
 // 8f: an old server: no pb_owner_sheets_read, Turn On without p_interval; plain Paid still sends month
 p=await open(OFFICE,CO+plan({ok:true,plan:null})+'window.__noSR=1;'+OWN,{srvPlan:'paid'});
 await p.evaluate(()=>{window.__rpcErr={pb_owner_individual_on:(a)=>a&&a.p_interval?{message:'Could not find the function public.pb_owner_individual_on(p_interval, p_user) in the schema cache',code:'PGRST202'}:null};});
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1500);
 t=await p.evaluate(()=>document.getElementById('pbOwnList').innerText.replace(/\s+/g,' '));
 ok(!/Plan sheets read/.test(t),'8f old server: no sheets line');
 await p.click('[data-uid="u-2"] [data-on="year"]');await p.waitForTimeout(700);
 ok(/Yearly needs the billing server update first/.test(await p.evaluate(()=>document.body.innerText))&&!(await p.evaluate(()=>window.__onArgs)),'8g old server: Turn On Yearly refuses plainly, nothing sent');
 await p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');const b=d&&[...d.querySelectorAll('button')][0];if(b)b.click();});await p.waitForTimeout(300);
 await p.click('[data-uid="u-3"] [data-on="month"]');await p.waitForTimeout(900);
 ok(JSON.stringify(await p.evaluate(()=>window.__onArgs))==='[{"p_user":"u-3"}]','8h old server: Turn On Monthly falls back to the old call');
 await p.click('[data-indpaid="u-1"][data-iv="month"]');await p.waitForTimeout(600);
 ok((await p.evaluate(()=>window.__paidArgs)).p_interval==='month','8i plain Paid sends the current period (month)');
 ok(p.errs.length===0,'8j no page errors '+JSON.stringify(p.errs));await p.context().close();

 // 9. dark mode: the ended card with the price is readable (text is not the same colour as its background)
 p=await open(OFFICE,CO+plan({ok:true,plan:'trial',trial_ends_at:days(-1),expired:true,closed:false,individual:false,requested:false,days_left:0,limits:{seats:7},prices:PR}),{dark:true});
 const col=await p.evaluate(()=>{const l=document.getElementById('pbBetaLine'),s=l.querySelector('.pb-beta-price');return {fg:getComputedStyle(s).color,bg:getComputedStyle(l).backgroundColor};});
 ok(col.fg!==col.bg,'9a dark: price text '+col.fg+' on '+col.bg);await p.screenshot({path:__dirname+'/../shots/9_ended_dark.png'});await p.context().close();

 await b.close();
 console.log('t_price_app done: '+(fails?fails+' FAIL':'all pass'));process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
