// declutter: Home per role, before (r17.10) vs after (patched). Nothing removed; order by role; empty cards short;
// one notice at a time; Start work rows distinct; New job once on a computer; text >= 14 px.
const L=require('./_lib');const {ok}=L;
const cur=(p)=>p.evaluate(()=>{const s=[...document.querySelectorAll('.pb-screen.active')][0];return s?s.id:'none'});
const ids=(p)=>p.evaluate(()=>[...document.querySelectorAll('#screen-home [id]')].filter(e=>e.matches('button,a,[role=button]')&&e.getClientRects().length&&!e.closest('[inert]')).map(e=>e.id).sort());
const top=(p,id)=>p.evaluate((id)=>{const e=document.getElementById(id);return e&&e.getClientRects().length?Math.round(e.getBoundingClientRect().top+scrollY):null},id);
const hgt=(p,id)=>p.evaluate((id)=>{const e=document.getElementById(id);return e&&e.getClientRects().length?Math.round(e.getBoundingClientRect().height):null},id);
const vis=(p,id)=>p.evaluate((id)=>{const e=document.getElementById(id);return !!(e&&e.getClientRects().length)},id);
const home=async(p)=>{await p.evaluate(()=>{try{pbNewSheetClose()}catch(e){};pbGoto('home')});await p.waitForTimeout(500);};
const NOTE=(n)=>`;(function(){const mk=(id,t,info)=>()=>({id:id,info:info,html:'<span class="t">'+t+'</span>Body text.'});
 ${n>=1?"window.pbSpHomeAttention=mk('spoils','Spoils near the limit',true);":''}${n>=2?"window.pbR95HomeAttention=mk('dailyMiss','2 daily reports not signed',true);":''}${n>=3?"window.pbDocsSpecHomeAttention=mk('docsSpec','Add your spec books',true);":''}
 ${n>=4?"window.pbLocHomeAttention=mk('locates','Dig ticket expires tomorrow',true);":''}})();`;
const T={};
(async()=>{
 const table=[];
 for(const role of ['pl','fm','pm','owner']){
  const A=await L.start(L.BASE,L.ROLES[role]);const mb=await L.measure(A.p,'home');const ib=await ids(A.p);
  const startB=await top(A.p,'homeTileNewRun'),mineB=await top(A.p,'homeMine');
  const subB=await A.p.evaluate(()=>document.getElementById('homeTileNewSub').textContent);
  await A.p.setViewportSize({width:1440,height:900});await A.p.waitForTimeout(900);const db=await L.measure(A.p,'home');const idb=await ids(A.p);
  const njB=await A.p.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length&&/^\s*New job\s*$/.test(b.textContent)).length);
  await A.b.close();
  const B=await L.start(L.CUR,L.ROLES[role]);const p=B.p;const ma=await L.measure(p,'home');const ia=await ids(p);
  table.push([role+' phone',mb,ma]);
  const gone=ib.filter(x=>!ia.includes(x));ok(gone.length===0,role+': every button on Home before is still on Home ('+ib.length+' before, '+ia.length+' after)'+(gone.length?' MISSING '+gone:''));
  ok(ma.under14<=1&&(ma.smallList.every(x=>/^11:The/.test(x))),role+': text on Home is 14 px or more (only the "The" of the name mark is smaller); before '+mb.under14+' pieces under 14, after '+ma.under14);
  ok(await vis(p,'pbFeedbackBtn')||await p.evaluate(()=>[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&b.textContent.trim()==='Feedback')),role+': Feedback button still on Home');
  ok(p.errs.length===0,role+': no page errors '+p.errs.slice(0,2));
  if(role==='pl'){
   const s=await top(p,'homeTileNewRun'),m=await top(p,'homeMine');
   ok(s<m&&startB>mineB,'pipelayer: Start work is above his own rows (New Run at '+startB+' px before, '+s+' after)');
   ok(s+60<ma.navTop,'pipelayer: New Run is on the first screen');
   ok(await p.evaluate(()=>[...document.querySelectorAll('#homeStart>.pb-home-tile')].filter(e=>e.getClientRects().length).map(e=>e.id).join())==='homeTileNewRun,homeTileQuickRun,homeTileNewPermit,homeTileNew','pipelayer: Start work order is New Run, Quick Run, permit, New record');
  }
  if(role==='fm'){
   const order=await p.evaluate(()=>['homeCurrentJob','homeDxBar','homeFmPulse','homeMine','homeStart','homeShortcuts'].map(id=>Math.round(document.getElementById(id).getBoundingClientRect().top)));
   ok(order.every((v,i)=>i===0||v>order[i-1]),'foreman: job, Add note / Daily report, crew cards, crew + production rows, then Start work, then shortcuts '+order);
   ok(await p.evaluate(()=>[...document.querySelectorAll('#homeMine>.pb-home-tile')].filter(e=>e.getClientRects().length).map(e=>e.id).join())==='homeCrewView,homeProdMine,homeInspMine','foreman: Crew runs today is the first of his rows');
   ok(await p.evaluate(()=>[...document.querySelectorAll('#homeStart>.pb-home-tile')].filter(e=>e.getClientRects().length).map(e=>e.id).join())==='homeTileNewPermit,homeTileNew,homeTileNoRun,homeTileNewRun,homeTileQuickRun','foreman: Start work = permit, New record, work without a run, then New Run, Quick Run (New Run is NOT moved to the top)');
   ok((await top(p,'homeTileNewRun'))>(await top(p,'homeFmPulse')),'foreman: New Run stays below the crew cards');
   // empty cards
   ok(await p.evaluate(()=>document.getElementById('homeFmClosed').classList.contains('dc-zero'))&&(await hgt(p,'homeFmClosed'))<=64,'foreman: "Permits closed" with no number is one short line ('+(await hgt(p,'homeFmClosed'))+' px)');
   ok(await p.evaluate(()=>!document.getElementById('homeFmWait').classList.contains('dc-zero'))&&(await hgt(p,'homeFmWait'))>=100,'foreman: "Run reports to approve: 2" stays a big card');
   const lh=await hgt(p,'homeFmLive');ok(lh<=70,'foreman: "My crew now" with nothing active is short ('+lh+' px)');
   await p.evaluate(()=>{document.querySelector('#homeFmClosed .pbx-num').textContent='3';});await p.waitForTimeout(100);
   ok(await p.evaluate(()=>!document.getElementById('homeFmClosed').classList.contains('dc-zero')),'foreman: a card that gets a number becomes a big card again');
   await p.evaluate(()=>{document.getElementById('homeFmLive').classList.add('emerg');});await p.waitForTimeout(100);
   ok(await p.evaluate(()=>!document.getElementById('homeFmLive').classList.contains('dc-zero')),'foreman: an EMERGENCY crew card is never shortened');
   // Start work rows: no duplicate
   ok(/Work without a run/.test(subB),'before: the "New" row repeats "Work without a run" ('+subB+')');
   const sub=await p.evaluate(()=>document.getElementById('homeTileNewSub').textContent);const nm=await p.evaluate(()=>document.querySelector('#homeTileNew .name').textContent);
   ok(nm==='New record'&&!/Work without a run/.test(sub)&&/Field ticket/.test(sub),'after: the row is "New record" and lists '+sub);
   await p.click('#homeTileNew');await p.waitForTimeout(500);
   ok(await vis(p,'archiveTicketsBtn')&&!(await vis(p,'archiveNoRunBtn')),'New record sheet: Field ticket there, "Work without a run" not listed a second time');
   await p.evaluate(()=>pbNewSheetClose());await p.click('#homeTileNoRun');await p.waitForTimeout(900);ok((await cur(p))==='screen-prodNoRun','Log Work Without a Run still opens ('+(await cur(p))+')');
   // every row still opens
   for(const [id,want] of [['homeTileNewRun',/input|runJob|screen-/],['homeTileQuickRun',/quickrun/],['homeTileNewPermit',/confined/],['homeProdMine',/prod/i],['homeCrewView',/.+/],['homeFmClosed',/.+/],['homeFmWait',/.+/],['homeDxDaily',/daily/i]]){
    await home(p);await p.click('#'+id);await p.waitForTimeout(900);const c=await cur(p);const sheet=await p.evaluate(()=>!!document.querySelector('.rpf-sheet:not([hidden]),.pb-modal-overlay.active,[role=dialog]:not([hidden])'));
    ok((c!=='screen-home'&&want.test(c))||sheet,'foreman: '+id+' opens ('+c+(sheet?' / sheet':'')+')');await p.evaluate(()=>{document.querySelectorAll('.pb-modal-overlay.active .pb-btn.ghost').forEach(b=>b.click());});await p.keyboard.press('Escape');}
  }
  if(role==='owner'||role==='pm'){
   ok((await p.evaluate(()=>document.getElementById('homeCoToolsHead').textContent))==='Tools'&&await p.evaluate(()=>{const g=document.getElementById('homeCoToolsGroup');return ['homeCxNewRec','homeCxDash','archiveInspCoBtn','homeCoTools'].every(id=>g.contains(document.getElementById(id)))}),role+': New record, Company production, inspections and Field tools are one "Tools" group');
   const z=await p.evaluate(()=>[...document.querySelectorAll('#homeCxPulse .pbx-act')].map(e=>e.classList.contains('dc-zero')+':'+Math.round(e.getBoundingClientRect().height)));
   ok(z.every(x=>/^true:(\d+)$/.test(x)&&+x.split(':')[1]<=92),role+': company cards with no number are short lines '+z);
   table.push([role+' phone cards block',{height:mb.cardIds.length},{height:ma.cardIds.length}]);
   await p.click('#homeCoTools');await p.waitForTimeout(400);ok(await vis(p,'homeTileNewRun'),role+': Field tools still opens New Run / Quick Run / permits');
   if(role==='owner'){await p.click('#homeCxNewRec');await p.waitForTimeout(500);ok(await vis(p,'archiveTicketsBtn'),'owner: New record opens its sheet');await p.evaluate(()=>pbNewSheetClose());}
   await p.click('#homeCoTools');await p.waitForTimeout(300);
   ok(await vis(p,'homeCxNew'),role+': phone keeps New job beside Jobs');
  }
  // computer
  await home(p);await p.setViewportSize({width:1440,height:900});await p.waitForTimeout(900);const da=await L.measure(p,'home');const ida=await ids(p);table.push([role+' computer',db,da]);
  const goneD=idb.filter(x=>!ida.includes(x)&&x!=='homeCxNew');ok(goneD.length===0,role+' computer: nothing else left Home '+goneD);
  if(role==='owner'||role==='pm'){
   const nj=await p.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length&&/^\s*New job\s*$/.test(b.textContent)).map(b=>b.id+':'+getComputedStyle(b).backgroundColor));
   ok(njB===2&&nj.length===1&&/pbxSideNew/.test(nj[0])&&!/rgba\(0, 0, 0, 0\)|239, 239, 239/.test(nj[0]),role+' computer: "New job" on screen '+njB+' times before, once after, and it is the yellow button ('+nj+')');
   await p.click('#pbxSideNew');await p.waitForTimeout(700);const dlg=await p.evaluate(()=>{const e=[...document.querySelectorAll('input')].find(i=>i.getClientRects().length&&/job/i.test(i.id+i.placeholder+(i.getAttribute('aria-label')||'')));return e?e.id:''});ok(!!dlg,role+' computer: New job opens the new-job form ('+dlg+')');
  }
  await B.b.close();
 }
 // notices: at most one optional notice; the rest in one "Also" line; dig tickets and unsaved work never folded
 for(const role of ['fm','owner']){
  const B=await L.start(L.BASE,L.ROLES[role]);await B.p.evaluate(NOTE(3)+';pbRenderHome()');await B.p.waitForTimeout(300);const nb=await B.p.evaluate(()=>[...document.querySelectorAll('#homeAttentionList .pb-home-att')].filter(e=>e.getClientRects().length).length);await B.b.close();
  const {b,p}=await L.start(L.CUR,L.ROLES[role]);await p.evaluate(NOTE(3)+';pbRenderHome()');await p.waitForTimeout(300);
  const st=()=>p.evaluate(()=>({shown:[...document.querySelectorAll('#homeAttentionList .pb-home-att')].filter(e=>e.getClientRects().length).map(e=>e.id),also:(document.getElementById('dcAlso')&&!document.getElementById('dcAlso').hidden)?document.getElementById('dcAlso').innerText.replace(/\s+/g,' '):''}));
  let s=await st();ok(nb===3&&s.shown.length===1&&s.shown[0]==='homeAttention_spoils',role+': 3 notices before; after, one shows ('+s.shown+')');
  ok(/Also: 2 daily reports not signed · Add your spec books/.test(s.also),role+': the other two are named on one line: "'+s.also+'"');
  await p.click('#dcAlso');await p.waitForTimeout(200);s=await st();ok(s.shown.length===3&&!s.also,role+': tapping the line shows all three');
  await b.close();
  const C=await L.start(L.CUR,L.ROLES[role]);await C.p.evaluate(NOTE(4)+';pbRenderHome()');await C.p.waitForTimeout(300);s=await C.p.evaluate(()=>[...document.querySelectorAll('#homeAttentionList .pb-home-att')].filter(e=>e.getClientRects().length).map(e=>e.id));
  ok(s.includes('homeAttention_locates')&&s.length===1,role+': a dig-ticket notice is never folded away ('+s+')');
  await C.b.close();
 }
 console.log('\n| Home | height px | buttons on first screen | crew / company cards end at | Jobs heading at | New Run at | text under 14 px | smallest text (not the name mark) |');console.log('|---|---|---|---|---|---|---|---|');
 const sm=(m)=>{const l=(m.smallList||[]).filter(x=>!/^11:The/.test(x)).map(x=>parseFloat(x));return l.length?Math.min(...l):14;};
 for(const [k,a,b] of table){if(!a.cardIds)continue;console.log(`| ${k} | ${a.height} → ${b.height} | ${a.tapsFold} → ${b.tapsFold} | ${a.y.crewEnd||a.y.coEnd||'-'} → ${b.y.crewEnd||b.y.coEnd||'-'} | ${a.y.jobs||'-'} → ${b.y.jobs||'-'} | ${a.y.newRun||'(in Field tools)'} → ${b.y.newRun||'(in Field tools)'} | ${a.under14} → ${b.under14} | ${sm(a)} → ${sm(b)} |`);}
 L.done();
})();
