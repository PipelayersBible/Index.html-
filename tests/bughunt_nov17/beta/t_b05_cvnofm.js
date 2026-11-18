// beta audit 05: a pipelayer with no foreman picked sees why Crew runs today is empty (and a way to My production);
// a linked pipelayer keeps the old empty line
const boot=require(__dirname+'/../../rig/boot');const f=process.argv[2]||'cur.html';
const NOTICE=require(__dirname+'/../../rig/env').NOTICE; // the crew-notice version this build shows (was hard-coded '2', a modal then covered the screen)
const base=require(__dirname+'/../../rig/co_pl');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{
 for (const linked of [false,true]) {
  const init=(linked?base:base.replace(/my_foreman:\{[^}]*\}/,'my_foreman:null'))+`;window.__rpcOverride.pb_prod_crew_view_list=()=>({runs:[]});try{localStorage.setItem('pbCrewNotice:00000000-0000-4000-8000-000000000001','${NOTICE}');}catch(e){}`;
  const {b,p}=await boot((process.env.PB_ROOT||'http://127.0.0.1:8843/')+f,{init,wait:7000});await p.setViewportSize({width:390,height:844});
  await p.evaluate(()=>pbCvOpen());await p.waitForTimeout(2000);
  const t=await p.evaluate(()=>{const e=document.getElementById('cvEmpty');return e?e.textContent:'(none)'});
  const btn=await p.evaluate(()=>!!document.getElementById('cvPickFm'));
  if(!linked){ok(/picked your foreman/.test(t)&&btn,'no foreman: '+t);await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/audit/beta/shots')+'/b05_')+f.replace('.html','')+'.png'});
    if(btn){await p.click('#cvPickFm');await p.waitForTimeout(1200);ok((await p.evaluate(()=>{const s=document.getElementById('screen-prodMine');return s&&s.offsetParent!==null?'prodMine':'?'}))==='prodMine','button opens My production');}}
  else ok(/No crew runs today/.test(t)&&!btn,'linked: '+t);
  ok(!p.errs.length,'no errors '+p.errs);await b.close();}
 process.exit(fails?1:0);})();
