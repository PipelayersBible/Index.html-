// beta audit 03: after the beta ends, a stake photo read refused by the server (429) says the beta ended, not "resets tomorrow"
const boot=require('/home/claude/rig/boot');const F=require('/home/claude/rig/flow');
const co=require('/home/claude/rig/co');const f=process.argv[2]||'cur.html';const ended=process.argv[3]!=='live';
const ends=ended?new Date(Date.now()-2*864e5).toISOString():new Date(Date.now()+5*864e5).toISOString();
const init=co+`;window.__rpcOverride.pb_my_plan=()=>({ok:true,plan:'trial',trial_ends_at:'${ends}',expired:${ended},closed:false,individual:false,requested:false,days_left:0});`;
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/'+f,{init,wait:6000});const H=F(p);
 await p.route('**/functions/v1/ai**',r=>r.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:'daily_limit',limit:30})}));
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await p.setInputFiles('#startAiStakePhoto',[H.img('p12')]);await p.waitForTimeout(2500);
 const t=await p.evaluate(()=>[...document.querySelectorAll('#screen-input .pb-alert, #screen-input [role=status]')].filter(e=>e.offsetParent).map(e=>e.innerText).join(' | ').replace(/\s+/g,' '));
 const pass=ended?(/beta has ended/.test(t)&&!/resets tomorrow/.test(t)):/resets tomorrow/.test(t);
 console.log(pass?'PASS':'FAIL',ended?'(ended)':'(live beta)','|',t.slice(0,300),'| errs',p.errs);await b.close();process.exit(pass?0:1);})();
