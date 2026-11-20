// shared bits for the simplify tests. PB_URL = patched page, PB_BASE = the page before (r17.10 _src/index.html).
const R=__dirname+'/../../../rig/';const boot=require(R+'boot');const co=require(R+'co');const F=require(R+'flow');const mkrun=require(R+'mkrun');
const CUR=process.env.PB_URL||'http://127.0.0.1:9050/cur.html', BASE=process.env.PB_BASE||'http://127.0.0.1:9050/base.html';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const start=async(url,init)=>{const {b,p}=await boot(url,{init:init||co});await p.setViewportSize({width:390,height:844});return {b,p,H:F(p)};};
const lockedRun=async(p,H,job)=>{await mkrun(p,100);await p.evaluate(()=>pbGoto('input'));await p.waitForTimeout(500);await H.f('saJobNumber',job||'24-017');await H.f('saJobsite','Test Sewer');
 await H.click('Review & Calculate');await p.waitForTimeout(1200);await p.getByText('Lock This Run',{exact:true}).click();await p.waitForTimeout(1500);};
module.exports={R,boot,co,F,mkrun,CUR,BASE,ok,start,lockedRun,done:(b)=>{console.log(fails?fails+' FAILED':'ALL PASS');return b.close().then(()=>process.exit(fails?1:0));}};
