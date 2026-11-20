// screenshots of the notices row (foreman phone, owner computer): 3 optional notices + a dig ticket
const L=require('./_lib');const SH=__dirname+'/../shots/';
const N=`(function(){const mk=(id,t,b)=>()=>({id:id,info:true,html:'<span class="t">'+t+'</span>'+b+'<button type="button" class="pb-btn small">Open</button>'});
window.pbSpHomeAttention=mk('spoils','Spoils at 80% on Job 26014','The spoils pile is near its limit.');window.pbR95HomeAttention=mk('dailyMiss','2 daily reports not signed','Monday and Tuesday on Job 26043.');window.pbDocsSpecHomeAttention=mk('docsSpec','Add your spec books','So Ask can answer from your agency specs.');window.pbLocHomeAttention=mk('locates','Dig ticket expires tomorrow','Job 26014, ticket A123456.');})();pbRenderHome()`;
(async()=>{for(const [role,vp] of [['fm',{width:390,height:844}],['owner',{width:1440,height:900}]]){
 for(const which of ['before','after']){const {b,p}=await L.start(which==='before'?L.BASE:L.CUR,'window.__dcRotateMs=600000;'+L.ROLES[role],vp);await p.evaluate(N);await p.waitForTimeout(500);
  await p.evaluate(()=>{const e=document.getElementById('homeAttention');if(e)e.scrollIntoView({block:'start'});window.scrollBy(0,-90);});await p.waitForTimeout(300);
  await p.screenshot({path:SH+which+'_'+role+'_notices.png'});
  if(which==='after'){await p.click('#dcNext');await p.waitForTimeout(700);await p.screenshot({path:SH+'after_'+role+'_notices_2.png'});}
  await b.close();}}})();
