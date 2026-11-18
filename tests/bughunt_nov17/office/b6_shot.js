const L=require('./lib');
const init=L.co+`;window.__rpcOverride.pb_my_plan=()=>({ok:true,plan:'trial',days_left:20,expired:false,trial_ends_at:new Date(Date.now()+20*864e5).toISOString()});`;
(async()=>{const {b,p}=await L.boot(L.URL,{init,wait:6000});
 await p.click('#pbFbPill');await p.waitForTimeout(600);
 const c=await p.evaluate(()=>{const s=document.getElementById('pbFbSheet');const pts=[[195,790],[60,770],[330,770],[195,400],[20,20]];return pts.map(([x,y])=>{const e=document.elementFromPoint(x,y);return s.contains(e);});});
 console.log('sheet covers points (tab bar included):',JSON.stringify(c));
 await p.screenshot({path:'/tmp/claude-0/bughunt/office/shots/b6_feedback_sheet.png'});await b.close();})();
