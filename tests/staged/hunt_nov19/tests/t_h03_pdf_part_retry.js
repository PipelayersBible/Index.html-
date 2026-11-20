// hunt_nov19 03: the jsPDF part (pbx/...) isn't on the phone when the first PDF is asked for and can't be fetched (no
// signal): the app says "PDF library didn't load - check your connection and try again". When the part can be fetched
// again, Save PDF must work in the same app session (it never did: the loader tried once, ever).
// Needs a page with its parts in pbx/ files, as the release build makes it: python3 mkparts.py in.html <dir> b.html
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:<port>/b.html node t_h03_pdf_part_retry.js
const {chromium}=require('playwright');const fs=require('fs');const R=require('path').resolve(__dirname,'../../../rig')+'/';
const co=require(R+'co.js');const mkrun=require(R+'mkrun.js');const F=require(R+'flow.js');
const URL=process.env.PB_URL||'http://127.0.0.1:9000/b.html';
(async()=>{let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(R+'fakesb.js','utf8')}));
await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
let block=true,asked=0;await ctx.route(/\/pbx\//,r=>{asked++;return block?r.abort('internetdisconnected'):r.continue();});
await ctx.addInitScript(co);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));const H=F(p);
await p.goto(URL,{waitUntil:'load'});await p.waitForTimeout(3000);
await mkrun(p,100);await p.getByText('Lock This Run',{exact:true}).click();await p.waitForTimeout(1200);
for(let i=0;i<6;i++){const m=await H.modal();if(!m)break;if(/Which Job/.test(m)){await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog]')].find(x=>x.offsetParent);const i=d.querySelector('input');i.value='24-017';i.dispatchEvent(new Event('input',{bubbles:true}));});await H.modalClick('Use It');}else{const bs=await H.modalBtns();await H.modalClick(bs[bs.length-1]);}await p.waitForTimeout(900);}
// 1) no signal for the part: Save PDF
const dl1=p.waitForEvent('download',{timeout:6000}).catch(()=>null);
await H.click('Save PDF');const d1=await dl1;const m1=await H.modal();
console.log('no part: download',!!d1,'| modal:',m1&&m1.slice(0,160),'| part requests',asked);
ok(!d1,'with the part unreachable no PDF is made (expected)');
ok(!!m1,'and the app says so (a message, not nothing)');
if(m1){const bs=await H.modalBtns();await H.modalClick(bs[bs.length-1]).catch(()=>{});}
// 2) signal is back: Save PDF again, same app session
block=false;await p.waitForTimeout(500);
const dl2=p.waitForEvent('download',{timeout:15000}).catch(()=>null);
await H.click('Save PDF');const d2=await dl2;const m2=await H.modal();
console.log('part reachable again: download',!!d2,'| modal:',m2&&m2.slice(0,160));
ok(!!d2,'once the part can be read again, Save PDF works without restarting the app');
console.log('errs',JSON.stringify(p.errs.slice(0,4)));
console.log(fails?'RESULT: '+fails+' failed':'RESULT: all passed');await b.close();process.exit(fails?1:0);})().catch(e=>{console.log('EXC',e.stack||e);process.exit(1);});
