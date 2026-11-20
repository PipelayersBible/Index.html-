// Shared helpers for the Spanish tests: open the app in a given state ("scenario") in English or Spanish.
const {chromium}=require('playwright');const fs=require('fs');const path=require('path');
const T=path.resolve(__dirname,'../../..');            // tests/
const BASE=process.env.PB_URL||'http://127.0.0.1:9300/cur.html';
const bootOb=require(T+'/boot_ob');
const FAKESB=fs.readFileSync(T+'/rig/fakesb.js','utf8');
const E=require(T+'/rig/env');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36';
const LANG=(lang)=>lang==='es'?"try{localStorage.setItem('pbLang','es');}catch(e){}":(lang==='en'?"try{localStorage.setItem('pbLang','en');}catch(e){}":'');
const PL=require(T+'/rig/co_pl'), CO=require(T+'/rig/co');
// plain rig (signed in as the rig's user); init = extra init script
async function plain(b,q,init,o={}){
  const ctx=await b.newContext({viewport:{width:o.w||390,height:844},serviceWorkers:'block',userAgent:o.ua||undefined,locale:o.locale||'en-US'});
  await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:FAKESB}));
  await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
  await ctx.addInitScript(LANG(o.lang)+(init||''));
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
  await p.goto(BASE+(q||''),{waitUntil:'load'});await p.waitForTimeout(o.wait||2500);return p;}
async function ob(b,hash,o={}){ // onboarding rig (signed out unless o.user)
  const srv=o.srv||require(T+'/obsrv')({paid:5,interval:'year'});
  const r=await bootOb(b,BASE+(hash||''),srv,{ua:o.ua||AND,signedOut:!o.user,user:o.user,standalone:o.standalone,clip:o.clip,wait:o.wait||4000,init:LANG(o.lang)+(o.init||'')});
  r.p.srv=srv;return r.p;}
const SC={};
SC.login=async(b,o)=>{const p=await ob(b,'',o);await p.evaluate(()=>pbGoto('login'));await p.waitForTimeout(600);return p;};
SC.login_forgot=async(b,o)=>{const p=await SC.login(b,o);await p.click('#forgotPwLink');await p.waitForTimeout(500);return p;};
SC.login_bad=async(b,o)=>{const p=await SC.login(b,o);await p.click('#loginSubmitBtn');await p.waitForTimeout(800);return p;};
SC.home_out=async(b,o)=>{const p=await ob(b,'',o);return p;};
SC.join=async(b,o)=>{const srv=require(T+'/obsrv')({paid:5,interval:'year'});const mk=srv.call('pb_onboard_link_make',srv.OFFICE,{p_role:'pipelayer',p_name:'Luis'});
  return ob(b,'#join='+mk.token,Object.assign({srv,ua:AND,wait:5000},o));};
SC.join_ios=async(b,o)=>{const srv=require(T+'/obsrv')({paid:5,interval:'year'});const mk=srv.call('pb_onboard_link_make',srv.OFFICE,{p_role:'pipelayer',p_name:'Luis'});
  return ob(b,'#join='+mk.token,Object.assign({srv,ua:IOS,wait:5000},o));};
SC.join_code=async(b,o)=>{const p=await SC.login(b,o);await p.click('#loginJoinBtn');await p.waitForTimeout(800);return p;};
const CREW="window.__rpcOverride=Object.assign(window.__rpcOverride||{},{pb_terms_accept:()=>({ok:true}),pb_notice_ack:()=>({ok:true}),pb_prod_access:()=>({member:true,company_id:'d01a4a5f-312a-418f-9172-ea9aec9784b5',manager:false,role:'pipelayer',server_at:new Date().toISOString()})});";
SC.taplink=async(b,o)=>plain(b,'?token_hash=pkce_abcDEF0123456789&type=invite',CREW,o);
SC.setpw=async(b,o)=>{const p=await SC.taplink(b,o);await p.click('#pbTapLinkGo');await p.waitForTimeout(4000);return p;};
SC.setpw_err=async(b,o)=>{const p=await SC.setpw(b,o);await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');await p.waitForTimeout(1200);return p;};
SC.a2hs_ios=async(b,o)=>{const p=await SC.setpw(b,Object.assign({ua:IOS},o));await p.check('#setPwTerms');await p.fill('#setPwNew','NewPass1234');await p.fill('#setPwConfirm','NewPass1234');await p.click('#setPwBtn');
  try{await p.waitForFunction(()=>{const d=document.getElementById('pbObSheet');return !!d&&d.dataset.step==='a2hs';},null,{timeout:15000});}catch(e){}await p.waitForTimeout(500);return p;};
SC.a2hs_and=async(b,o)=>SC.a2hs_ios(b,Object.assign({ua:AND},o));
SC.home_pl=async(b,o)=>plain(b,'',PL,Object.assign({wait:3500},o));
SC.home_fm=async(b,o)=>plain(b,'',CO,Object.assign({wait:3500},o));
SC.settings=async(b,o)=>{const p=await SC.home_pl(b,o);await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(700);return p;};
// what the screen shows, as the engine keys it: [{k, kind, hit}]
const scan=(p,sel)=>p.evaluate((sel)=>window.pbI18nScan(sel?document.querySelector(sel):null),sel||null);
const fits=(p)=>p.evaluate(()=>{const W=innerWidth;const bad=[];if(document.documentElement.scrollWidth>W)bad.push('page scrollWidth '+document.documentElement.scrollWidth);
  document.querySelectorAll('button,a,label,p,h1,h2,h3,li,span,div,summary,td,th,option').forEach(e=>{if(!e.getClientRects().length)return;const cs=getComputedStyle(e);if(cs.visibility==='hidden')return;const r=e.getBoundingClientRect();
    if(r.width<3||r.height<3)return;const key=e.tagName+'#'+e.id+'.'+String(e.className).slice(0,40)+' ';let own=false;for(const c of e.childNodes)if(c.nodeType===3&&c.data.trim()){own=true;break;}if(!own)return;
    // hidden by a scroller on purpose? only count what the page itself cannot show
    let sc=e.parentElement,inScroll=false;while(sc&&sc!==document.body){const o=getComputedStyle(sc).overflowX;if((o==='auto'||o==='scroll')&&sc.scrollWidth>sc.clientWidth+1){inScroll=true;break;}sc=sc.parentElement;}
    if(inScroll)return;
    if(r.right>W+0.5||r.left<-0.5)bad.push('off-screen: '+key+' "'+e.textContent.trim().slice(0,40)+'" '+Math.round(r.left)+'..'+Math.round(r.right));
    else if(e.scrollWidth>e.clientWidth+1&&cs.overflowX!=='visible'&&cs.textOverflow!=='ellipsis'&&e.tagName!=='DIV')bad.push('clipped: '+key+' "'+e.textContent.trim().slice(0,40)+'"');
    else if(cs.textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1)bad.push('cut with …: '+key+' "'+e.textContent.trim().slice(0,40)+'"');
  });return bad;});
// ---- daily pipelayer screens ----
const mkrun=require(T+'/rig/mkrun');
const modalClick=async(p,txt)=>{const ok=await p.evaluate(t=>{const d=document.getElementById('pbModalOverlay');if(!d||getComputedStyle(d).display==='none')return false;const b=[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===t);if(!b)return false;b.click();return true;},txt);await p.waitForTimeout(700);return ok;};
const modalText=(p)=>p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');return d&&getComputedStyle(d).display!=='none'?d.innerText.replace(/\s+/g,' '):'';});
SC.run_setup=async(b,o)=>{const p=await SC.home_pl(b,o);await p.evaluate(()=>{const x=[...document.querySelectorAll('#screen-home button,#screen-home a,#screen-home [role=button]')].find(e=>/^New Run/.test(e.textContent.trim()));x.click();});await p.waitForTimeout(1500);return p;};
SC.run_review=async(b,o)=>{const p=await SC.home_pl(b,o);await p.evaluate(()=>pbGoto('input'));await p.waitForTimeout(1200);
  await p.evaluate(()=>{const lr=[...document.querySelectorAll('#screen-input button')].find(b=>b.textContent.trim()==="Engineer's Rod");lr&&lr.click();});
  const f=async(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[id,String(v)]);
  await f('runBedding',0.5);await f('runTrenchWidth',3);await f('runWT',0.08);
  await p.evaluate(()=>{const e=document.getElementById('runIdSel');e.value=[...e.options].find(o=>o.text.trim()==='8"').value;e.dispatchEvent(new Event('change',{bubbles:true}));});
  await f('startStakeElev',100);await f('startCutFillVal',5);await f('startStakeReading',4.8);await f('endStakeElev',99);await f('endCutFillVal',5);await f('endStakeReading',5.8);await f('totalDist',100);await f('interval',10);
  await p.waitForTimeout(500);await p.evaluate(()=>{const x=[...document.querySelectorAll('#screen-input button')].find(b=>b.textContent.trim()==='Review & Calculate');x.click();});await p.waitForTimeout(1500);return p;};
SC.run_lockask=async(b,o)=>{const p=await SC.run_review(b,o);await p.evaluate(()=>{const x=[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()==='Lock This Run');x.click();});await p.waitForTimeout(900);return p;};
const btns=(p)=>p.evaluate(()=>[...document.querySelectorAll('#pbModalOverlay button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()));
// answer the questions a lock asks; o.onStep(p,label) lets a caller look at each one first
async function answer(p,o,tag,prefer){for(let i=0;i<6;i++){const t=await modalText(p);if(!t)break;if(o&&o.onStep)await o.onStep(p,tag+'_q'+i);const bt=await btns(p);
  const pick=bt.find(x=>prefer.some(r=>r.test(x)))||bt[bt.length-1];(p.mods=p.mods||[]).push(t.slice(0,160)+' :: '+bt.join('|')+' -> '+pick);await modalClick(p,pick);await p.waitForTimeout(500);}}
SC.run_locked=async(b,o)=>{const p=await SC.run_lockask(b,o);await answer(p,o,'lock',[/^Job \d/,/^Lock Without It$/,/^I Checked Them$/,/^Lock Anyway$/,/^Lock/]);await p.waitForTimeout(1500);return p;};
SC.laid_modal=async(b,o)=>{const p=await SC.run_locked(b,o);const dists=await p.evaluate(()=>[...document.querySelectorAll('#screen-results [aria-label^="Distance "]')].map(e=>e.getAttribute('aria-label').split(' ')[1]));
  await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},dists[2]);await p.waitForTimeout(700);return p;};
SC.laid_done=async(b,o)=>{const p=await SC.laid_modal(b,o);await modalClick(p,'Mark laid to here (and the rows before)');await p.waitForTimeout(1200);return p;};
SC.quick_run=async(b,o)=>{const p=await SC.home_pl(b,o);await p.evaluate(()=>{const x=[...document.querySelectorAll('#screen-home button,#screen-home a,#screen-home [role=button]')].find(e=>/^Quick Run/.test(e.textContent.trim()));x.click();});await p.waitForTimeout(1200);return p;};
// ---- confined space permit (rig foreman; the Active Permit screen is what the crew is shown) ----
const hm=(d)=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
SC.permit_form=async(b,o)=>{const p=await SC.home_fm(b,o);await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);return p;};
SC.permit_ack=async(b,o)=>{const p=await SC.permit_form(b,o);const now=new Date();const ymd=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const vals={cpJobsite:'Test Job',cpJobNumber:'1',cpAddress:'1 Main St',cpSpace:'MH1',cpPurpose:'Inspect',cpDate:ymd,cpStart:hm(new Date(now-600000)),cpEnd:hm(new Date(+now+3*3600000)),cpSupervisor:'Tom',cpSupervisorInitials:'TF',cpAttendant:'Brandon Jones',cpComms:'Radio',cpHazards:'None',cpControls:'Vent',cpVentFail:'Monitor',cpRescue:'911',cpCommInterval:'',cpAtmoInterval:''};
  for(const k in vals){try{await p.fill('#'+k,vals[k]);}catch(e){p.fillErr=(p.fillErr||[]).concat([k]);}}
  await p.evaluate(()=>pbLockConfinedPermit());await p.waitForTimeout(1500);return p;};
SC.permit_active=async(b,o)=>{const p=await SC.permit_ack(b,o);await modalClick(p,'I Understand');await p.waitForTimeout(1500);return p;};
SC.permit_addperson=async(b,o)=>{const p=await SC.permit_active(b,o);await p.evaluate(()=>pbOpenRosterAddForm());await p.waitForTimeout(500);return p;};
const addPerson=async(p,name,role)=>{await p.evaluate(()=>pbOpenRosterAddForm());await p.fill('#cpRosterName',name);await p.selectOption('#cpRosterRole',role);await p.evaluate(()=>pbAddRosterPerson());await p.waitForTimeout(1200);};
SC.permit_roster=async(b,o)=>{const p=await SC.permit_active(b,o);await addPerson(p,'Luis Ramos','Entrant');return p;};
SC.permit_noair=async(b,o)=>{const p=await SC.permit_roster(b,o);await p.evaluate(()=>pbToggleRosterStatus(0));await p.waitForTimeout(1200);return p;}; // check in with no air test: the app's warning
SC.permit_airform=async(b,o)=>{const p=await SC.permit_roster(b,o);await p.evaluate(()=>pbQuickAddAtmoTest());await p.waitForTimeout(600);return p;};
SC.permit_airbad=async(b,o)=>{const p=await SC.permit_airform(b,o);await p.fill('#cpAtmoO2','18.9');await p.fill('#cpAtmoLEL','12');await p.fill('#cpAtmoTester','Tom');await p.evaluate(()=>pbSaveAtmoReading());await p.waitForTimeout(1500);return p;};
SC.permit_airok=async(b,o)=>{const p=await SC.permit_airform(b,o);await p.fill('#cpAtmoO2','20.9');await p.fill('#cpAtmoLEL','0');await p.fill('#cpAtmoTester','Tom');await p.evaluate(()=>pbSaveAtmoReading());await p.waitForTimeout(1500);return p;};
SC.permit_checkin=async(b,o)=>{const p=await SC.permit_airok(b,o);for(let i=0;i<4;i++){const t=await modalText(p);if(!t)break;const bt=await p.evaluate(()=>[...document.querySelectorAll('#pbModalButtons button')].map(b=>b.textContent.trim()));await modalClick(p,bt[bt.length-1]);}
  await p.evaluate(()=>pbToggleRosterStatus(0));await p.waitForTimeout(1500);return p;};
SC.permit_in=async(b,o)=>{const p=await SC.permit_checkin(b,o);for(let i=0;i<4;i++){const t=await modalText(p);if(!t)break;const bt=await p.evaluate(()=>[...document.querySelectorAll('#pbModalButtons button')].map(b=>b.textContent.trim()));(p.mods=p.mods||[]).push(t.slice(0,300)+' :: '+bt.join('|'));await modalClick(p,bt[bt.length-1]);}return p;};
SC.permit_comm=async(b,o)=>{const p=await SC.permit_roster(b,o);await p.evaluate(()=>pbLogCommCheck());await p.waitForTimeout(700);return p;};
SC.permit_att=async(b,o)=>{const p=await SC.permit_airok(b,o);await p.evaluate(()=>{const i=[...document.querySelectorAll('#screen-confinedActive button')].find(b=>b.offsetParent&&b.textContent.trim()==='Check In');i.click();});await p.waitForTimeout(1200);return p;}; // first row = the attendant: DO NOT ENTER
SC.permit_emergency=async(b,o)=>{const p=await SC.permit_roster(b,o);await p.evaluate(()=>{window.pbNavigateExternal=function(){};});await p.evaluate(()=>pbTriggerEmergency());await p.waitForTimeout(1800);return p;};
SC.permit_em_enter=async(b,o)=>{const p=await SC.permit_emergency(b,o);await p.evaluate(()=>{const rows=[...document.querySelectorAll('#screen-confinedActive button')].filter(b=>b.offsetParent&&b.textContent.trim()==='Check In');rows[rows.length-1].click();});await p.waitForTimeout(1200);return p;};
SC.permit_close=async(b,o)=>{const p=await SC.permit_roster(b,o);await p.evaluate(()=>pbCloseConfinedPermit());await p.waitForTimeout(1200);return p;};
module.exports={modalClick,modalText,addPerson,chromium,BASE,SC,scan,fits,plain,ob,IOS,AND,T,E,LANG,PL,CO};
