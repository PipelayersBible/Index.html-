// declutter: More tab and Account & Settings, before vs after. Same rows, fewer / clearer groups, nothing deeper.
const L=require('./_lib');const {ok}=L;
const cur=(p)=>p.evaluate(()=>{const s=[...document.querySelectorAll('.pb-screen.active')][0];return s?s.id:'none'});
const snap=(p,scr)=>p.evaluate((scr)=>{const s=document.getElementById('screen-'+scr);const v=e=>e.getClientRects().length>0;
 return {ids:[...s.querySelectorAll('[id]')].filter(e=>e.matches('button,a,input,select,textarea,summary,details')&&v(e)).map(e=>e.id).sort(),
  rows:[...s.querySelectorAll('.pb-tool-row .name')].filter(v).map(e=>e.textContent.trim()),
  heads:[...s.querySelectorAll('h2,.pb-tag')].filter(e=>v(e)&&e.getBoundingClientRect().width>2).map(e=>e.textContent.trim()),
  cards:[...s.querySelectorAll('.pb-section')].filter(e=>v(e)&&getComputedStyle(e).boxShadow!=='none'||v(e)&&parseFloat(getComputedStyle(e).borderTopWidth)>0).length,height:s.scrollHeight};},scr);
(async()=>{
 for(const role of ['fm','owner']){
  const A=await L.start(L.BASE,L.ROLES[role]);await A.p.evaluate(()=>pbGoto('tools'));await A.p.waitForTimeout(600);const mb=await snap(A.p,'tools');const fb=await L.measure(A.p,'tools');
  await A.p.evaluate(()=>pbGoto('settings'));await A.p.waitForTimeout(900);const sb=await snap(A.p,'settings');const gb=await L.measure(A.p,'settings');await A.b.close();
  const {b,p}=await L.start(L.CUR,L.ROLES[role]);await p.evaluate(()=>pbGoto('tools'));await p.waitForTimeout(600);const ma=await snap(p,'tools');const fa=await L.measure(p,'tools');
  ok(mb.rows.every(r=>ma.rows.includes(r))&&ma.rows.length===mb.rows.length+1&&ma.rows.includes('Account & Settings'),role+' More: every row kept, plus Account & Settings ('+ma.rows.join(', ')+')');
  ok(mb.heads.join()==='Learn,Production'&&ma.heads.join()==='On the job,Learn',role+' More: groups "'+mb.heads+'" → "'+ma.heads+'"');
  const grp=await p.evaluate(()=>[...document.querySelectorAll('#toolsAllList section')].map(s=>(s.getAttribute('aria-label'))+': '+[...s.querySelectorAll('.name')].map(n=>n.textContent).join(' / ')));
  ok(/On the job: .*Plans/.test(grp[0])&&/Toolbox Talks/.test(grp[0])&&/Stats/.test(grp[0])&&/^Learn: Education & Reference \/ Confined Space Reference$/.test(grp[1]),role+' More: '+grp.join(' | '));
  ok(fa.under14===0||fa.smallList.every(x=>/^11:/.test(x)),role+' More: text 14 px or more');
  await p.click('#toolsOpenSettings');await p.waitForTimeout(800);ok((await cur(p))==='screen-settings',role+' More: Account & Settings opens Settings');
  const sa=await snap(p,'settings');const ga=await L.measure(p,'settings');
  const gone=sb.ids.filter(x=>!sa.ids.includes(x));ok(gone.length===0,role+' Settings: every control kept ('+sb.ids.length+')'+gone);
  ok(sb.cards-sa.cards===2,role+' Settings: cards '+sb.cards+' → '+sa.cards+', height '+sb.height+' → '+sa.height+' px');
  ok(ga.under14===0||ga.smallList.every(x=>/^11:/.test(x)),role+' Settings: text under 14 px '+gb.under14+' → '+ga.under14+' (the page-name eyebrow aside)');
  // the merged card still works
  await p.click('#textSizeToggle button[data-val="120"]');await p.waitForTimeout(300);ok(await p.evaluate(()=>document.querySelector('#textSizeToggle button[data-val="120"]').getAttribute('aria-pressed')==='true'),role+' Settings: Text size Large still sets');
  await p.click('#textSizeToggle button[data-val="100"]');
  const c0=await p.evaluate(()=>document.getElementById('crashReportsToggle').checked);await p.evaluate(()=>document.getElementById('crashReportsToggle').click());await p.waitForTimeout(200);
  ok((await p.evaluate(()=>document.getElementById('crashReportsToggle').checked))!==c0,role+' Settings: crash reports switch still switches');await p.evaluate(()=>document.getElementById('crashReportsToggle').click());
  await p.click('#settingsNotifBtn');await p.waitForTimeout(700);ok((await cur(p))==='screen-notifications'||(await cur(p))!=='screen-settings',role+' Settings: Push notifications opens ('+(await cur(p))+')');
  if(role==='owner'){await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(300);await p.click('#pbProfileBtn');await p.waitForTimeout(700);await p.click('#settingsCrewBtn');await p.waitForTimeout(900);ok((await cur(p))==='screen-crewMembers','owner: Crew members is 2 taps from Home (person button, Crew members): '+(await cur(p)));}
  ok(p.errs.length===0,role+': no page errors '+p.errs.slice(0,2));
  await b.close();
 }
 L.done();
})();
