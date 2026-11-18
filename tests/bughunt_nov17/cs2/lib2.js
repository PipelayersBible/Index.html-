// lib2: lib.js + nav capture (tel:/sms:/mailto:), reload, offline, D()
const {chromium}=require('playwright');const fs=require('fs');const co=require(__dirname+'/../../rig/co');const F=require(__dirname+'/../../rig/flow');
const NAV=`(()=>{window.__nav=window.__nav||[];const oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){const h=this.getAttribute('href')||'';if(/^(tel|sms|mailto):/i.test(h)){(window.__nav=window.__nav||[]).push({h,t:Date.now()});try{const a=JSON.parse(sessionStorage.getItem('__nav')||'[]');a.push({h,t:Date.now()});sessionStorage.setItem('__nav',JSON.stringify(a));}catch(e){}return;}return oc.call(this);};})();`;
module.exports=async function(opts={}){
 const b=await chromium.launch();
 const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:(opts.dark||process.env.DARK?'dark':'light'),serviceWorkers:'block',permissions:opts.perms||[],geolocation:opts.geo||undefined,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'});await require(__dirname+'/../../rig/env').applyClock(ctx);
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/../../rig/fakesb.js','utf8')}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 await ctx.addInitScript((opts.init||co)+(opts.extra||'')+NAV);
 const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>{p.errs.push('DIALOG '+d.type()+' '+d.message());d.accept();});
 const url=(process.env.PB_ROOT||'http://127.0.0.1:8843/')+(opts.file||process.env.FILE||'cur.html');
 await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(opts.wait||3000);
 const H=F(p);H.ctx=ctx;H.b=b;
 H.D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 H.nav=()=>p.evaluate(()=>window.__nav||[]);
 H.reload=async(w=3500)=>{await p.reload({waitUntil:'load'});await p.waitForTimeout(w);};
 H.restart=async(w=3500)=>{ // phone restart: new page in same context (storage kept, memory gone)
   await p.close({runBeforeUnload:false});const np=await ctx.newPage();np.errs=p.errs;np.on('pageerror',e=>np.errs.push(e.message));np.on('dialog',d=>{np.errs.push('DIALOG '+d.message());d.accept();});await np.goto(url,{waitUntil:'load'});await np.waitForTimeout(w);return np;};
 H.offline=async(on)=>{await ctx.setOffline(on);await p.evaluate(on=>window.dispatchEvent(new Event(on?'offline':'online')),on);};
 H.closeModals=async(max=6)=>{const seen=[];for(let i=0;i<max;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();seen.push([m.slice(0,160),bt]);const pick=bt.find(x=>/^(OK|I Understand|Close)$/i.test(x))||bt[bt.length-1];await H.modalClick(pick);await p.waitForTimeout(300);}return seen;};
 H.lock=async(over={})=>{
  await p.evaluate(()=>pbGoto('confinedPermit'));await p.waitForTimeout(800);
  const d=new Date();const pad=n=>String(n).padStart(2,'0');const date=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const vals=Object.assign({cpJobsite:'Test Sewer',cpAddress:'1 Main St',cpSpace:'MH-4',cpPurpose:'Inspect',cpDate:date,cpStart:'00:01',cpEnd:'23:59',cpHazards:'H2S',cpControls:'Vent',cpVentFail:'Flag',cpRescue:'911',cpComms:'Voice',cpSupervisor:'Sam Sup',cpSupervisorInitials:'SS',cpAttendant:'Al Att'},over);
  await p.evaluate(v=>{for(const k in v){const el=document.getElementById(k);if(!el)throw new Error('no field '+k);el.value=v[k];el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}},vals);
  await p.evaluate(()=>window.pbLockConfinedPermit());await p.waitForTimeout(700);
  const ms=[];for(let i=0;i<6;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();ms.push(m.slice(0,120));const pick=bt.find(x=>/I Understand|OK|Lock|Yes|Continue/i.test(x))||bt[0];await H.modalClick(pick);await p.waitForTimeout(600);}
  return {screen:await H.screen(),modals:ms};
 };
 H.read=async(o2,lel,h2s,co,tester='Tess')=>{
  await p.evaluate(()=>{try{pbCpAtmoFormOpen(true);}catch(e){}});
  await p.evaluate(v=>{const s=(id,x)=>{document.getElementById(id).value=(x===null||x===undefined)?'':String(x);};s('cpAtmoO2',v[0]);s('cpAtmoLEL',v[1]);s('cpAtmoH2S',v[2]);s('cpAtmoCO',v[3]);s('cpAtmoTester',v[4]);},[o2,lel,h2s,co,tester]);
  await p.evaluate(()=>window.pbSaveAtmoReading());await p.waitForTimeout(800);
  const m=await H.modal();let bt=null;if(m){bt=await H.modalBtns();await H.modalClick(bt.find(x=>/^OK$/.test(x))||bt[0]);}
  return {modal:m,bt,banner:await p.evaluate(()=>{const e=document.getElementById('cpUnsafeBanner');return e&&e.offsetParent?e.innerText.slice(0,160):null;})};
 };
 H.addPerson=async(name,role='Entrant')=>{await p.evaluate(([n,r])=>{document.getElementById('cpRosterName').value=n;const s=document.getElementById('cpRosterRole');s.value=r;return pbAddRosterPerson();},[name,role]);await p.waitForTimeout(600);return H.closeModals();};
 H.toggle=async(name)=>{const i=await p.evaluate(n=>confinedRosterIdx(n),name).catch(()=>null);return i;};
 H.idx=(name,role)=>H.D(`confinedRoster.findIndex(r=>r.name===${JSON.stringify(name)}${role?`&&r.role===${JSON.stringify(role)}`:''})`);
 H.checkin=async(name,role)=>{const i=await H.idx(name,role);await p.evaluate(i=>pbToggleRosterStatus(i),i);await p.waitForTimeout(900);const m=await H.modal();return {m,bt:m?await H.modalBtns():null};};
 return {b,p,H,ctx};};
