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
   ok(await p.evaluate(()=>[...document.querySelectorAll('#homeStart>.pb-home-tile')].filter(e=>e.getClientRects().length).map(e=>e.id).join())==='homeTileNew,homeTileNoRun,homeTileNewPermit,homeTileQuickRun,homeTileNewRun','foreman: Start work = New record, Log Work Without a Run, Confined Space Permit, Quick Run, New Run (Tommy, Nov 19)');
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
 // notices: always-show ones are full cards; the optional ones are one sideways row (swipe, arrows, dots, moves by itself)
 const NOTES=(n,dig)=>`;(function(){const mk=(id,t,info,extra)=>()=>({id:id,info:info,html:'<span class="t">'+t+'</span>Body text. '+(extra||'')+'<button type="button" class="pb-btn small" id="tb_'+id+'" onclick="window.__clicked=(window.__clicked||\\'\\')+\\''+id+',\\'">Open '+id+'</button>'});
  ${n>=1?"window.pbSpHomeAttention=mk('spoils','Spoils near the limit',true);":''}${n>=2?"window.pbR95HomeAttention=mk('dailyMiss','2 daily reports not signed',true,'A longer body so this card is taller than the others. It runs on for a few more lines to check that the row keeps one height. ');":''}${n>=3?"window.pbDocsSpecHomeAttention=mk('docsSpec','Add your spec books',true);":''}
  ${dig?"window.pbLocHomeAttention=mk('locates','Dig ticket expires tomorrow',true);":''}})();`;
 const st=(p)=>p.evaluate(()=>{const row=document.getElementById('dcRow'),rr=row.getBoundingClientRect();const sl=[...row.querySelectorAll(':scope > * > *')];
  return {s:pbDcNotices.state(),always:[...document.querySelectorAll('#dcAlwaysList > .pb-home-att')].filter(e=>e.getClientRects().length).map(e=>e.id),slides:sl.map(e=>e.id),
   showing:sl.filter(e=>{const r=e.getBoundingClientRect();return r.left>=rr.left-3&&r.right<=rr.right+3}).map(e=>e.id),heights:sl.map(e=>Math.round(e.getBoundingClientRect().height)),rowH:Math.round(rr.height),homeH:document.getElementById('screen-home').scrollHeight,
   dots:[...document.querySelectorAll('#dcNav .dc-dot')].map(d=>d.getAttribute('aria-current')).join(),navOn:!document.getElementById('dcNav').hidden,wrapOn:!document.getElementById('dcRowWrap').hidden,label:row.getAttribute('aria-label'),role:row.getAttribute('role'),hiddenToSR:sl.some(e=>e.closest('[aria-hidden=true],[inert]'))};});
 const settle=(p)=>p.waitForTimeout(700);
 for(const role of ['fm','owner']){
  const B=await L.start(L.BASE,L.ROLES[role]);await B.p.evaluate(NOTES(3,true)+';pbRenderHome()');await B.p.waitForTimeout(300);
  const nb=await B.p.evaluate(()=>({n:[...document.querySelectorAll('#homeAttentionList .pb-home-att')].filter(e=>e.getClientRects().length).length,h:document.getElementById('homeAttentionList').offsetHeight}));await B.b.close();
  // rotation off for the manual part (a long interval), so the checks are not racing it
  const {b,p}=await L.start(L.CUR,'window.__dcRotateMs=600000;'+L.ROLES[role]);await p.evaluate(NOTES(3,true)+';pbRenderHome()');await p.waitForTimeout(400);
  let s=await st(p);const h0=await p.evaluate(()=>document.getElementById('homeAttentionList').offsetHeight);
  ok(nb.n===4&&s.always.join()==='homeAttention_locates'&&!s.slides.includes('homeAttention_locates'),role+': the dig-ticket notice is a full card above the row, never in it ('+s.always+')');
  ok(s.slides.join()==='homeAttention_spoils,homeAttention_dailyMiss,homeAttention_docsSpec'&&s.showing.join()==='homeAttention_spoils',role+': the 3 optional notices are one row, one card showing ('+s.showing+'); notices block '+nb.h+' px before, '+h0+' px after');
  ok(new Set(s.heights).size===1&&s.heights[0]===s.rowH,role+': every card in the row is the same height ('+s.heights+'), the row is '+s.rowH+' px');
  ok(s.navOn&&s.dots==='true,false,false',role+': 3 dots, the first one marked ('+s.dots+')');
  ok(s.role==='region'&&/Notices: 1 of 3/.test(s.label)&&!s.hiddenToSR&&await p.evaluate(()=>['dcPrev','dcNext'].every(id=>document.getElementById(id).getAttribute('aria-label'))&&[...document.querySelectorAll('#dcNav .dc-dot')].every(d=>/Notice \d of 3/.test(d.getAttribute('aria-label')))),role+': screen readers: the row is named "'+s.label+'", every notice stays in the page, arrows and dots have names');
  await p.click('#tb_spoils');ok((await p.evaluate(()=>window.__clicked))==='spoils,',role+': the showing notice\'s own button works');
  await p.click('#dcNext');await settle(p);s=await st(p);const hA=s.homeH;ok(s.showing.join()==='homeAttention_dailyMiss'&&s.dots==='false,true,false',role+': the right arrow shows the next notice ('+s.showing+')');
  await p.click('#tb_dailyMiss');ok(/dailyMiss,/.test(await p.evaluate(()=>window.__clicked)),role+': the second notice\'s own button works in the row');
  await p.click('#dcNav .dc-dot[data-i="2"]');await settle(p);s=await st(p);ok(s.showing.join()==='homeAttention_docsSpec'&&s.dots==='false,false,true',role+': tapping a dot goes to that notice');
  await p.click('#dcNext');await settle(p);s=await st(p);ok(s.showing.join()==='homeAttention_spoils',role+': past the last one it goes back to the first');
  await p.click('#dcPrev');await settle(p);s=await st(p);ok(s.showing.join()==='homeAttention_docsSpec'&&s.homeH===hA,role+': the left arrow goes back; Home is the same height on every notice ('+hA+' = '+s.homeH+')');
  // a swipe (the row scrolled by hand) moves the dots
  await p.evaluate(()=>{const r=document.getElementById('dcRow');const sl=r.querySelectorAll(':scope > * > *');r.scrollTo({left:sl[1].offsetLeft-sl[0].offsetLeft,behavior:'auto'});});await settle(p);s=await st(p);
  ok(s.showing.join()==='homeAttention_dailyMiss'&&s.dots==='false,true,false',role+': swiping the row moves the dots too');
  await p.focus('#dcRow');await p.keyboard.press('ArrowRight');await settle(p);s=await st(p);ok(s.showing.join()==='homeAttention_docsSpec',role+': keyboard arrows work on the row');
  // the "remind later" menu on a notice still opens
  if(await p.evaluate(()=>!!document.getElementById('homeNgDots_docsSpec'))){await p.click('#homeNgDots_docsSpec');await p.waitForTimeout(500);const m=await p.evaluate(()=>{const o=document.getElementById('pbModalOverlay');return o&&o.getClientRects().length?o.innerText.replace(/\s+/g,' ').slice(0,60):''});ok(!!m,role+': a notice\'s "remind later" menu still opens ('+m+')');await p.evaluate(()=>{const o=document.getElementById('pbModalOverlay');const x=o&&[...o.querySelectorAll('button')].find(b=>b.textContent.trim()==='Close');if(x)x.click();});}
  await b.close();
 }
 { // moves by itself; stops while touched, typing, off Home; never with "reduce motion"
  const {b,p}=await L.start(L.CUR,'window.__dcRotateMs=700;'+L.ROLES.fm);await p.evaluate(NOTES(3,false)+';pbRenderHome()');await p.waitForTimeout(300);
  await p.mouse.move(5,5);const seen=new Set();let hs=new Set();for(let i=0;i<9;i++){await p.waitForTimeout(400);const s=await st(p);seen.add(s.s.i);hs.add(s.homeH);}
  ok(seen.size===3,'by itself: with nobody touching, all 3 notices come round in turn (seen '+[...seen].sort()+')');
  ok(hs.size===1,'by itself: Home never changes height as it turns ('+[...hs]+' px)');
  await p.evaluate(()=>{const i=document.createElement('input');i.id='dcTestBox';i.style.cssText='position:fixed;top:0;left:0;z-index:99999';document.body.appendChild(i);i.focus();});
  let a=(await st(p)).s;await p.waitForTimeout(2300);let c=(await st(p)).s;ok(a.paused&&c.i===a.i,'stops while a text box has the cursor (stayed on '+c.i+')');
  await p.evaluate(()=>{document.getElementById('dcTestBox').remove();});
  await p.evaluate(()=>document.getElementById('dcRow').dispatchEvent(new Event('touchstart',{bubbles:true})));a=(await st(p)).s;await p.waitForTimeout(2300);c=(await st(p)).s;
  ok(a.paused&&c.i===a.i,'stops while a finger is on it (stayed on '+c.i+')');
  await p.evaluate(()=>window.dispatchEvent(new Event('touchend')));ok((await st(p)).s.paused,'stays put for a moment after the finger lifts');
  await p.waitForTimeout(2600);
  await p.evaluate(()=>pbGoto('tools'));await p.waitForTimeout(500);a=(await st(p)).s;await p.waitForTimeout(1800);c=(await st(p)).s;ok(a.paused&&c.i===a.i,'stops when Home is not the screen showing');
  await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(400);
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(300);a=(await st(p)).s;await p.waitForTimeout(2500);c=(await st(p)).s;
  ok(a.reduce&&c.i===a.i,'"reduce motion": never moves by itself (stayed on '+c.i+')');
  await p.click('#dcNext');await settle(p);const d=(await st(p));ok(d.s.i===(c.i+1)%3&&d.showing.length===1,'"reduce motion": arrows and dots still work');
  await b.close();
 }
 { // one optional notice: no dots; none: no row; the notifications offer is a card in the row; a red card stays above
  const {b,p}=await L.start(L.CUR,'window.__dcRotateMs=600000;'+L.ROLES.fm);let s=await st(p);ok(!s.wrapOn&&s.slides.length===0,'no optional notice: no row on Home');
  await p.evaluate(NOTES(1,false)+';pbRenderHome()');await p.waitForTimeout(300);s=await st(p);ok(s.wrapOn&&!s.navOn&&s.showing.join()==='homeAttention_spoils','one optional notice: a plain card, no arrows or dots');
  await p.evaluate(()=>{window.pbPushCardHtml=()=>'<div class="pb-home-att info push" id="homeAttention_pushCard"><span class="t">Turn on notifications</span>Text.<div class="pb-pc-act"><button type="button" class="pb-btn small" id="tb_push" onclick="window.__push=1">Turn On</button></div></div>';
   window.pbCoTzHomeAttention=()=>({id:'redOne',html:'<span class="t">3 records not saved yet</span>Keep the app open.'});pbRenderHome();});await p.waitForTimeout(300);s=await st(p);
  ok(s.slides.join()==='homeAttention_spoils,homeAttention_pushCard'&&s.navOn,'the "Turn on notifications" offer is the last card in the row ('+s.slides+')');
  ok(s.always.includes('homeAttention_redOne')&&!s.slides.includes('homeAttention_redOne'),'a red (unsaved work) card is a full card above the row');
  await p.click('#dcNext');await settle(p);await p.click('#tb_push');ok((await p.evaluate(()=>window.__push))===1,'the offer\'s own button works in the row');
  ok(p.errs.length===0,'notices: no page errors '+p.errs.slice(0,2));await b.close();
 }
 console.log('\n| Home | height px | buttons on first screen | crew / company cards end at | Jobs heading at | New Run at | text under 14 px | smallest text (not the name mark) |');console.log('|---|---|---|---|---|---|---|---|');
 const sm=(m)=>{const l=(m.smallList||[]).filter(x=>!/^11:The/.test(x)).map(x=>parseFloat(x));return l.length?Math.min(...l):14;};
 for(const [k,a,b] of table){if(!a.cardIds)continue;console.log(`| ${k} | ${a.height} → ${b.height} | ${a.tapsFold} → ${b.tapsFold} | ${a.y.crewEnd||a.y.coEnd||'-'} → ${b.y.crewEnd||b.y.coEnd||'-'} | ${a.y.jobs||'-'} → ${b.y.jobs||'-'} | ${a.y.newRun||'(in Field tools)'} → ${b.y.newRun||'(in Field tools)'} | ${a.under14} → ${b.under14} | ${sm(a)} → ${sm(b)} |`);}
 L.done();
})();
