// Copy of tests/t127_billing0.js with the two plan reading wording checks updated for the pricing build (v2). The lead: make the same two changes in tests/t127_billing0.js.
// t127 billing Phase 0 (feat/billing0, on r16.96): Beta Accounts > Make Paid form, Billing due, Past Due / Paid / Read-Only /
// Cancel, Plan Reading, Hand Over (owner only), and a paused paid plan behaving like the ended beta (records wait on the phone).
// Fake Supabase (rig). The fake server below keeps the same shapes as sql/01-03 (pb_owner_billing etc.).
// Usage: node t127_billing0.js [page]   (page default cur.html on PB_URL or http://127.0.0.1:8880/)
const {chromium}=require('playwright');const fs=require('fs');
const co=require(__dirname+'/../../../rig/co');
const BASE=process.env.PB_URL||('http://127.0.0.1:8880/'+(process.argv[2]||'cur.html'));
const SHOTS=process.env.SHOTS||'/tmp/claude-0/feat/billing0/shots';try{fs.mkdirSync(SHOTS,{recursive:true});}catch(e){}
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('PASS',m);}else{fail++;console.log('FAIL',m);}};
async function boot(init,dark){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:dark?'dark':'light',serviceWorkers:'block'});
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/../../../rig/fakesb.js','utf8')}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 await ctx.addInitScript(init);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
 await p.goto(BASE,{waitUntil:'load'});await p.waitForTimeout(3500);return {b,p};}
const modal=(p)=>p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');return d&&d.style.display==='flex'?d.innerText.replace(/\s+/g,' '):null;});
const modalClick=async(p,t)=>{await p.evaluate((t)=>{const d=document.getElementById('pbModalOverlay');const b=d&&d.style.display==='flex'&&[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===t);if(!b)throw new Error('no modal button '+t);b.click();},t);await p.waitForTimeout(500);};
const txt=(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText.replace(/\s+/g,' ').trim():'';},sel);
const card=(p,id)=>txt(p,'#pbOwnList .pb-own-co[data-id="'+id+'"]');
const clickAct=async(p,id,act)=>{await p.evaluate(([id,act])=>document.querySelector('#pbOwnList .pb-own-co[data-id="'+id+'"] [data-act="'+act+'"]').click(),[id,act]);await p.waitForTimeout(500);};
const overflow=(p)=>p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('.pb-fb *').forEach(e=>{if(!e.offsetParent)return;const r=e.getBoundingClientRect();if(r.width>0&&(r.right>w+1||r.left<-1))bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.right));});return bad.slice(0,5);});
const rpcs=(p,n)=>p.evaluate((n)=>(window.__rpcArgs||[]).filter(x=>x[0]===n).map(x=>x[1]),n);

// the fake server: companies C (beta, 10 days left, 5 members + 1 invite), E (beta ended), DIG (paid, no billing row), P (paid, account active)
const SERVER=`;(function(){
 const today=new Date(),iso=(d)=>d.toISOString().slice(0,10),addM=(d,m)=>{const x=new Date(d);x.setMonth(x.getMonth()+m);return x;};
 const set={seller_legal_name:null,base_cents:9900,base_seats:5,seat_cents:1200,yearly_months:10,grace_days:7,founder_months:12,plan_reading_cents:null,invoice_ahead_days:7};
 const amount=(a,s)=>(a.base_cents+Math.max(0,s-a.base_seats)*a.seat_cents+(a.plan_reading?(a.plan_reading_cents||0):0))*(a.interval==='year'?a.yearly_months:1);
 const people=(n)=>Array.from({length:n},(_,i)=>({user_id:'u'+i+'-0000-4000-8000-000000000000',email:'crew'+i+'@acme.test',role:i===0?'foreman':'pipelayer',title:null}));
 const S=window.__srv={companies:[
  {id:'c0000000-0000-4000-8000-00000000000c',name:'Acme Pipeline',plan:'trial',trial_ends_at:new Date(Date.now()+10*864e5).toISOString(),owner_login:'super@acme.test',seats_used:6,members:5,founder_ok:true,people:people(5),account:null},
  {id:'e0000000-0000-4000-8000-00000000000e',name:'Ended Co',plan:'trial',trial_ends_at:new Date(Date.now()-5*864e5).toISOString(),owner_login:'boss@ended.test',seats_used:2,members:2,founder_ok:false,people:people(2),account:null},
  {id:'d0000000-0000-4000-8000-00000000000d',name:'DIG Civil',plan:'paid',trial_ends_at:null,owner_login:'dig@dig.test',seats_used:3,members:3,founder_ok:false,people:people(3),account:null},
  {id:'f0000000-0000-4000-8000-00000000000f',name:'Paid Pipe',plan:'paid',trial_ends_at:null,owner_login:'own@paid.test',seats_used:6,members:6,founder_ok:false,people:people(6),
   account:{legal_name:'Paid Pipe LLC',billing_email:'ap@paid.test',stored_state:'active',interval:'month',yearly_months:10,base_cents:9900,base_seats:5,seat_cents:1200,plan_reading:false,plan_reading_cents:null,grace_days:7,
    founder_until:iso(addM(today,11)),founder_set_by:'tommy@admin.test',founder_set_at:iso(addM(today,-1)),order_signed_by:'Pat Paid, Owner',period_start:iso(addM(today,-1)),paid_through:iso(new Date(Date.now()+3*864e5)),seats_paid:6}},
  {id:'a0000000-0000-4000-8000-00000000000a',name:'Late Co',plan:'paid',trial_ends_at:null,owner_login:'own@late.test',seats_used:4,members:4,founder_ok:false,people:people(4),
   account:{legal_name:'Late Co Inc',billing_email:'ap@late.test',stored_state:'active',interval:'month',yearly_months:10,base_cents:9900,base_seats:5,seat_cents:1200,plan_reading:false,plan_reading_cents:null,grace_days:7,
    founder_until:null,order_signed_by:'Lee Late',period_start:iso(addM(today,-2)),paid_through:iso(new Date(Date.now()-2*864e5)),seats_paid:4}},
  {id:'b0000000-0000-4000-8000-00000000000b',name:'Year Co',plan:'paid',trial_ends_at:null,owner_login:'own@year.test',seats_used:7,members:7,founder_ok:false,people:people(7),
   account:{legal_name:'Year Co LLC',billing_email:'ap@year.test',stored_state:'active',interval:'year',yearly_months:10,base_cents:9900,base_seats:5,seat_cents:1200,plan_reading:false,plan_reading_cents:null,grace_days:7,
    founder_until:null,order_signed_by:'Yan Year',period_start:iso(addM(today,-3)),paid_through:iso(addM(today,9)),seats_paid:6}}]};
 const D0=()=>iso(new Date()),dd=(a,b)=>Math.round((new Date(a+'T12:00:00')-new Date(b+'T12:00:00'))/864e5);
 const next=(c)=>{const a=c.account,from=a.paid_through,to=iso(addM(new Date(from+'T12:00:00'),a.interval==='year'?12:1)),s=c.seats_used,t=D0();
  const lock=iso(new Date(new Date(from+'T12:00:00').getTime()+a.grace_days*864e5));
  a.state=a.stored_state==='canceled'?'canceled':a.stored_state==='read_only'?'read_only':t>=lock?'read_only':t>=from?'past_due':'active';
  a.read_only=a.state==='read_only';a.lock_on=lock;a.days_to_lock=a.state==='past_due'?dd(lock,t):null;a.seats_used=c.seats_used;a.seats_capacity=Math.max(a.seats_paid,a.base_seats);
  a.extra=Math.max(0,c.seats_used-a.seats_capacity);const months=Math.max(0,Math.ceil(dd(a.paid_through,t)/30.44));
  a.catchup={people:a.interval==='year'?a.extra:0,months,cents:a.interval==='year'&&a.state==='active'?a.extra*a.seat_cents*months:0,monthly_next_invoice:a.interval==='month'?a.extra:0};
  a.next={from,to,seats:s,amount_cents:amount(a,s),founder:!!a.founder_until&&from<a.founder_until,due:a.state!=='canceled'&&(a.state!=='active'||a.catchup.cents>0||new Date(from+'T00:00:00')<=new Date(Date.now()+7*864e5))};return a;};
 const view=()=>{S.companies.forEach(c=>{if(c.account)next(c);});return {ok:true,settings:set,companies:JSON.parse(JSON.stringify(S.companies)),
  due:S.companies.filter(c=>c.account&&c.account.next.due).map(c=>Object.assign({company_id:c.id,name:c.name},c.account.next,{legal_name:c.account.legal_name,billing_email:c.account.billing_email,interval:c.account.interval,state:c.account.state,tax_state:'CA',plan_reading_price_missing:c.account.plan_reading&&c.account.plan_reading_cents==null,
   lock_on:c.account.lock_on,days_to_lock:c.account.days_to_lock,paid_through:c.account.paid_through,seats_paid:c.account.seats_paid,extra:c.account.extra,catchup:c.account.catchup})).sort((x,y)=>(x.state==='active')-(y.state==='active'))};};
 const by=(id)=>S.companies.find(c=>c.id===id);
 Object.assign(window.__rpcOverride,{
  pb_support_is_admin:()=>true,
  pb_owner_overview:()=>({ok:true,totals:null,companies:S.companies.map(c=>({id:c.id,name:c.name,plan:c.plan,trial_ends_at:c.trial_ends_at,users:c.members+1,active_7d:1,active_days:3,laid_ft:100,laid_ft_30:50,runs:2,photos:1,reports_30:1,ai:{},ai_usd:0,events:{},plan_sets:0,plan_sheets:0,feedback:0}))}),
  pb_owner_plan_requests:()=>({ok:true,requests:[]}),
  pb_owner_billing:()=>window.__noBilling?null:view(),
  pb_owner_make_paid:(a)=>{const c=by(a.p_company);if(a.p_founder&&!c.founder_ok)return {ok:false,code:'pb:founder_late'};
   c.account={legal_name:a.p_legal_name,billing_email:a.p_billing_email.toLowerCase(),stored_state:'active',grace_days:7,interval:a.p_interval,yearly_months:10,base_cents:9900,base_seats:5,seat_cents:1200,plan_reading:!!a.p_plan_reading,plan_reading_cents:null,
    founder_until:a.p_founder?iso(addM(today,12)):null,founder_set_by:a.p_founder?'tommy@admin.test':null,founder_set_at:a.p_founder?iso(today):null,order_signed_by:a.p_signed_by,period_start:iso(today),paid_through:iso(addM(today,a.p_interval==='year'?12:1)),seats_paid:c.seats_used};
   c.plan='paid';c.trial_ends_at=null;return {ok:true,account:next(c),owner_login:c.owner_login,individual_plans_to_stop:[{user_id:c.people[1].user_id,email:c.people[1].email}]};},
  pb_owner_billing_state:(a)=>{const c=by(a.p_company);if(!['active','read_only','canceled'].includes(a.p_state))return {ok:false,code:'pb:bad_state'};c.account.stored_state=a.p_state;return {ok:true,account:next(c)};},
  pb_owner_billing_paid:(a)=>{const c=by(a.p_company);const n=next(c).next;if(a.p_from!==c.account.paid_through)return {ok:false,code:'pb:period_changed'};c.account.paid_through=n.to;c.account.seats_paid=a.p_seats==null?c.seats_used:a.p_seats;if(c.account.stored_state==='read_only')c.account.stored_state='active';return {ok:true,account:next(c)};},
  pb_owner_billing_catchup_paid:(a)=>{const c=by(a.p_company);c.account.seats_paid=a.p_seats;return {ok:true,account:next(c)};},
  pb_owner_plan_reading_set:(a)=>{const c=by(a.p_company);c.account.plan_reading=a.p_on;return {ok:true,sets:0,account:next(c)};},
  pb_owner_individual_off:()=>({ok:true}),
  pb_owner_company_handover:(a)=>{const c=by(a.p_company);const w=c.people.find(x=>x.user_id===a.p_new_owner);const old=c.owner_login;c.owner_login=w.email;c.people=c.people.filter(x=>x!==w).concat([{user_id:'old',email:old,role:'pm',title:a.p_old_owner_title}]);return {ok:true,from_email:old,to_email:w.email,new_owner_was:w.role,old_owner_title:a.p_old_owner_title};},
 });})();`;

(async()=>{
 // ---------- A: the app owner (light) ----------
 let {b,p}=await boot(co+SERVER,false);
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1200);
 const C='c0000000-0000-4000-8000-00000000000c',E='e0000000-0000-4000-8000-00000000000e',DIG='d0000000-0000-4000-8000-00000000000d',P='f0000000-0000-4000-8000-00000000000f';
 const due=await txt(p,'#pbBillDue');console.log('  billing due:',due);
 ok(/Billing due/.test(due)&&/Paid Pipe LLC/.test(due)&&/\$111\.00/.test(due)&&/6 people/.test(due)&&/ap@paid\.test/.test(due)&&/founder price/.test(due),'Billing due lists who to invoice: legal name, period, people, amount, email');
 ok(/Late Co Inc Past due · 5 days left/.test(due)&&/Locks \(read-only\) on/.test(due)&&due.indexOf('Late Co Inc')<due.indexOf('Paid Pipe LLC'),'Billing due warns first: past-due company with days left and its lock date (automatic, no button)');
 ok(/Year Co LLC/.test(due)&&/Catch-up now: 1 above the paid seats × 9 months × \$12\.00 = \$108\.00/.test(due),'Billing due shows a yearly catch-up (1 extra × 9 months × $12)');
 ok(/Seller on invoices: not set yet/.test(due),'seller name is a setting (not set yet), not hard-coded');
 const cC=await card(p,C);console.log('  beta card:',cC);
 ok(/Add 30 Days/.test(cC)&&/Make Paid/.test(cC)&&/Hand Over/.test(cC)&&/6 people counted/.test(cC)&&/super@acme\.test/.test(cC),'beta card: Add 30 Days / Make Paid / Hand Over, people counted, company login');
 const cD=await card(p,DIG);ok(/No billing record/.test(cD)&&/Make Paid/.test(cD)&&!/Past Due/.test(cD),'legacy paid company: no billing record, Make Paid offered, no state buttons');
 const cP=await card(p,P);console.log('  paid card:',cP);
 ok(/Paid Pipe LLC/.test(cP)&&/Paid through/.test(cP)&&/next invoice/.test(cP)&&/\$111\.00 a month/.test(cP)&&/Paid seats: 6 · people now: 6/.test(cP)&&/Founder price locked until/.test(cP)&&/tommy@admin\.test/.test(cP)&&/Plan reading add-on: off/.test(cP),'paid card: paid through, next invoice, paid seats, founder lock (who, until), plan reading off');
 ok(['Paid','Read-Only Now','Cancel Plan','Plan Reading On','Hand Over'].every(t=>cP.includes(t))&&!/Past Due/.test(cP)&&!/Catch-up Paid/.test(cP),'paid card: Paid / Read-Only Now / Cancel Plan / Plan Reading On / Hand Over (no Past Due button)');
 const cL=await card(p,'a0000000-0000-4000-8000-00000000000a');ok(/Past due · 5 days left/.test(cL)&&/Not paid for the next period/.test(cL)&&/Goes read-only on/.test(cL),'past-due card: chip with days left and the lock date');
 const cY=await card(p,'b0000000-0000-4000-8000-00000000000b');ok(/Catch-up: 1 above the paid seats/.test(cY)&&/Catch-up Paid/.test(cY),'yearly card: catch-up line and Catch-up Paid');
 await p.screenshot({path:SHOTS+'/owner_list_light.png',fullPage:false});
 // Make Paid form on the beta
 await clickAct(p,C,'paid');
 const f=await txt(p,'#pbMakePaid');console.log('  form:',f.slice(0,500));
 ok(/Company legal name/.test(f)&&/Billing email/.test(f)&&/6 counted now/.test(f)&&/Monthly/.test(f)&&/Yearly/.test(f)&&/Founder price, locked until/.test(f)&&/Plan reading add-on \(\$1 a sheet, charged once when read\)\. Leave it off for customers until Billing shows sheets read/.test(f)&&/Signed by/.test(f),'form fields: legal name, email, people now, monthly/yearly, founder lock + date, plan reading, signer');
 ok(/\$111\.00 a month/.test(await txt(p,'#pbMpPrice')),'price shown: $111.00 a month for 6 people');
 ok(await p.evaluate(()=>!document.getElementById('pbMpFounder').disabled),'founder lock offered while the beta is on');
 await p.click('#pbMakePaid [data-iv="year"]');await p.click('#pbMpFounder');await p.waitForTimeout(200);
 const pr=await txt(p,'#pbMpPrice');console.log('  price yearly:',pr);
 ok(/\$1,110\.00 a year \(10 months of \$111\.00\)/.test(pr)&&/Founder price locked until/.test(pr),'yearly = 10 months shown; founder lock date shown');
 ok((await overflow(p)).length===0,'form fits 390 px (no sideways overflow) '+JSON.stringify(await overflow(p)));
 await p.screenshot({path:SHOTS+'/makepaid_light.png'});
 await p.click('#pbMpGo');await p.waitForTimeout(300);
 ok(/Type the billing email/.test(await txt(p,'#pbMpSt'))&&(await rpcs(p,'pb_owner_make_paid')).length===0,'missing billing email is caught before sending');
 await p.fill('#pbMpName','Acme Pipeline Inc');await p.fill('#pbMpEmail','AP@acme.test');await p.fill('#pbMpSigner','Olive Owner, President');
 await p.click('#pbMpGo');await p.waitForTimeout(800);
 const mp=(await rpcs(p,'pb_owner_make_paid'))[0]||{};console.log('  make_paid args:',JSON.stringify(mp));
 ok(mp.p_company===C&&mp.p_legal_name==='Acme Pipeline Inc'&&mp.p_billing_email==='AP@acme.test'&&mp.p_seats===null&&mp.p_interval==='year'&&mp.p_founder===true&&mp.p_plan_reading===false&&mp.p_signed_by==='Olive Owner, President','pb_owner_make_paid called with the form (seats counted by the server, yearly, founder, no plan reading, signer)');
 const res=await txt(p,'#pbMakePaid');console.log('  result:',res.slice(0,400));
 ok(/is paid/.test(res)&&/First invoice/.test(res)&&/\$1,110\.00/.test(res)&&/super@acme\.test/.test(res)&&/Hand Over/.test(res)&&/crew1@acme\.test/.test(res),'result: first invoice, company login with the hand-over hint, people still on their own plan');
 await p.evaluate(()=>document.querySelector('#pbMakePaid [data-off]').click());await p.waitForTimeout(400);
 ok((await rpcs(p,'pb_owner_individual_off')).length===1&&/turned off/.test(await txt(p,'#pbMakePaid')),'Turn Off Their Plan calls pb_owner_individual_off');
 await p.click('#pbMpDone');await p.waitForTimeout(800);
 ok(/Acme Pipeline Inc/.test(await card(p,C))&&/Read-Only Now/.test(await card(p,C)),'list reloaded: Acme now shows its deal and the paid buttons');
 // founder lock not offered for an ended beta
 await clickAct(p,E,'paid');
 ok(await p.evaluate(()=>document.getElementById('pbMpFounder').disabled)&&/not offered: the beta has ended/.test(await txt(p,'#pbMakePaid')),'ended beta: founder lock not offered');
 await p.evaluate(()=>document.querySelector('#pbMakePaid .pb-fb-x').click());await p.waitForTimeout(300);
 // Paid on the past-due company: moves paid-through one period; Read-Only Now; Catch-up Paid
 const L='a0000000-0000-4000-8000-00000000000a',Y='b0000000-0000-4000-8000-00000000000b';
 const ptL=await p.evaluate(()=>window.__srv.companies.find(c=>c.name==='Late Co').account.paid_through);
 await clickAct(p,L,'b_paid');const m2=await modal(p);console.log('  paid modal:',m2);
 await modalClick(p,'Paid');await p.waitForTimeout(800);
 const pd=(await rpcs(p,'pb_owner_billing_paid')).pop()||{};
 ok(/\$99\.00/.test(m2||'')&&/Paid through moves to/.test(m2||'')&&pd.p_company===L&&pd.p_from===ptL&&pd.p_seats===4&&pd.p_amount_cents===9900&&!/Past due/.test(await card(p,L)),'Paid sends the current paid-through date and seats; the past due clears');
 await clickAct(p,P,'b_ro');const m1=await modal(p);await modalClick(p,'Read-Only Now');await p.waitForTimeout(800);
 ok(/read-only now/i.test(m1||'')&&JSON.stringify((await rpcs(p,'pb_owner_billing_state')).pop())===JSON.stringify({p_company:P,p_state:'read_only'})&&/Read-only \(you set it\)/.test(await card(p,P))&&/Not Read-Only/.test(await card(p,P)),'Read-Only Now recorded; card says you set it, undo offered');
 await clickAct(p,P,'b_active');await p.waitForTimeout(800);ok(/Read-Only Now/.test(await card(p,P)),'Not Read-Only undoes it');
 await clickAct(p,Y,'b_catch');const m7=await modal(p);await modalClick(p,'Catch-up Paid');await p.waitForTimeout(800);
 const cu=(await rpcs(p,'pb_owner_billing_catchup_paid')).pop()||{};
 ok(/\$108\.00/.test(m7||'')&&cu.p_company===Y&&cu.p_seats===7&&cu.p_amount_cents===10800&&!/Catch-up Paid/.test(await card(p,Y))&&/Paid seats: 7/.test(await card(p,Y)),'Catch-up Paid sets the paid seats to the people now');
 await clickAct(p,P,'b_cancel');const m3=await modal(p);await modalClick(p,'Cancel Plan');await p.waitForTimeout(800);
 ok(/stays open/.test(m3||'')&&(await rpcs(p,'pb_owner_billing_state')).pop().p_state==='canceled'&&/Canceled/.test(await card(p,P))&&/Make Paid/.test(await card(p,P)),'Cancel Plan asks, records canceled, then offers Make Paid again');
 // plan reading on for Acme (now paid)
 await clickAct(p,C,'pr_on');const m4=await modal(p);await modalClick(p,'Turn On');await p.waitForTimeout(800);
 ok(/\(\$1 a sheet, charged once when read\. Billing doesn’t show sheets read yet/.test(m4||'')&&/a sheet, charged once when read/.test(await card(p,C))&&(await rpcs(p,'pb_owner_plan_reading_set')).pop().p_on===true&&/Plan reading add-on: on/.test(await card(p,C)),'Plan Reading On (paid company): the confirm and the card say $1 a sheet, and that Billing does not show sheets read yet');
 // Hand Over on the beta-turned-paid company
 await clickAct(p,C,'handover');const h=await txt(p,'#pbHandOver');console.log('  hand over:',h.slice(0,300));
 ok(/super@acme\.test/.test(h)&&/Superintendent/.test(h)&&/Project manager/.test(h)&&/crew0@acme\.test · Foreman/.test(h),'Hand Over lists the members and the old owner\'s new role');
 ok((await overflow(p)).length===0,'hand-over sheet fits 390 px');
 await p.click('#pbHoGo');await p.waitForTimeout(200);ok(/Pick the new owner/.test(await txt(p,'#pbHoSt')),'Hand Over needs a pick');
 await p.evaluate(()=>document.querySelector('#pbHandOver input[type=radio]').click());await p.click('#pbHoGo');await p.waitForTimeout(400);
 const m5=await modal(p);await modalClick(p,'Hand Over');await p.waitForTimeout(800);
 const ho=(await rpcs(p,'pb_owner_company_handover')).pop()||{};
 ok(/stays in the company as Superintendent/.test(m5||'')&&ho.p_company===C&&ho.p_new_owner==='u0-0000-4000-8000-000000000000'&&ho.p_old_owner_title==='superintendent'&&/now holds the company login/.test(await txt(p,'#pbHandOver')),'Hand Over: confirm, pb_owner_company_handover(new owner, superintendent), done');
 ok(!(await rpcs(p,'pb_owner_company_set')).some(a=>a.p_plan==='paid'),'the old one-tap company_set(paid) is never called');
 ok(p.errs.length===0,'no page errors '+JSON.stringify(p.errs));
 await b.close();
 // ---------- A2: dark mode screenshots + overflow ----------
 ({b,p}=await boot(co+SERVER,true));
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1200);await p.screenshot({path:SHOTS+'/owner_list_dark.png'});
 await clickAct(p,'c0000000-0000-4000-8000-00000000000c','paid');await p.waitForTimeout(300);
 const darkBg=await p.evaluate(()=>getComputedStyle(document.querySelector('#pbMakePaid .pb-fb-card')).backgroundColor);
 await p.screenshot({path:SHOTS+'/makepaid_dark.png'});
 ok(!/255, 255, 255/.test(darkBg)&&(await overflow(p)).length===0,'dark mode: form uses the dark surface ('+darkBg+') and fits 390 px');
 ok(p.errs.length===0,'dark: no page errors');await b.close();
 // ---------- A3: server not migrated yet ----------
 ({b,p}=await boot(co+SERVER+';window.__noBilling=true;',false));
 await p.evaluate(()=>window.pbOwnerOpen());await p.waitForTimeout(1200);
 const cC2=await card(p,'c0000000-0000-4000-8000-00000000000c');
 await clickAct(p,'c0000000-0000-4000-8000-00000000000c','paid');const m6=await modal(p);
 ok(!/Hand Over/.test(cC2)&&/billing server isn’t set up yet/.test(m6||'')&&!(await rpcs(p,'pb_owner_company_set')).length&&!(await txt(p,'#pbBillDue')),'billing server missing: Make Paid says so and changes nothing (no old switch)');
 await b.close();
 // ---------- B: a foreman of a paid company that went read-only (past due, grace over) ----------
 const UID='00000000-0000-4000-8000-000000000001',CO='11111111-1111-4111-8111-111111111111';
 const rep={cid:'dr-b0-1',jobNumber:'24-017',jobsite:'Test Sewer',workDate:'2026-11-16',snapshot:{v:1,job_number:'24-017',work_date:'2026-11-16',sections:{}},sha:'a'.repeat(64),signedName:'Test Foreman',signedAt:Date.now()-3600e3,tz:'America/Los_Angeles',signature:null,state:'waiting',why:'',clockOk:true,co:CO,version:1};
 const initB=co+`;try{localStorage.setItem('${UID}:foremanDaily',JSON.stringify({v:1,checks:[],reports:[${JSON.stringify(rep)}],items:{},weather:{},co:'${CO}'}));}catch(e){}
  window.__subs=0;window.__paused=true;
  window.__rpcOverride.pb_daily_submit=(a)=>{window.__subs++;return window.__paused?{ok:false,code:'pb:beta_ended'}:{ok:true,id:'srv1',version:1,received_at:new Date().toISOString()};};
  window.__rpcOverride.pb_my_plan=()=>window.__paused?({ok:true,plan:'paid',paused:true,closed:true,expired:false,individual:false,requested:false,trial_ends_at:null,days_left:null}):({ok:true,plan:'paid',paused:false,closed:false,expired:false,individual:false,requested:false,trial_ends_at:null,days_left:null});`;
 ({b,p}=await boot(initB,false));await p.waitForTimeout(2500);
 const state=()=>p.evaluate((k)=>{try{const o=JSON.parse(localStorage.getItem(k));return o.reports.map(r=>r.state+' | '+(r.why||'')).join(' ; ');}catch(e){return 'ERR '+e.message;}},UID+':foremanDaily');
 const line=await txt(p,'#pbBetaLine');console.log('  home line:',line);
 ok(/Plan paused/.test(line)&&/wait on this phone/.test(line)&&/Nothing is deleted/.test(line),'Home: "Plan paused", records wait on this phone, nothing deleted');
 await p.screenshot({path:SHOTS+'/home_paused_light.png'});
 await p.evaluate(()=>window.pbOpenDailyReport());await p.waitForTimeout(4000);
 const s1=await state();console.log('  report after a paused answer:',s1,'| submits',await p.evaluate(()=>window.__subs));
 ok(/^waiting \| Your company’s plan is paused\. It waits on this phone/.test(s1)&&(await p.evaluate(()=>window.__subs))>=1,'signed report refused with pb:beta_ended stays WAITING on the phone with plan wording (like the ended beta)');
 await p.evaluate(()=>{window.__paused=false;window.dispatchEvent(new Event('online'));});await p.waitForTimeout(6000);
 await p.evaluate(()=>window.pbGotoTab('home'));await p.waitForTimeout(500);await p.evaluate(()=>window.pbOpenDailyReport());await p.waitForTimeout(4000);
 const s2=await state();console.log('  after Paid:',s2);
 ok(/^sent/.test(s2),'once the plan is paid again the report sends by itself');
 ok(p.errs.length===0,'foreman: no page errors '+JSON.stringify(p.errs));
 await b.close();
 console.log(`t127 done: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);
})();
