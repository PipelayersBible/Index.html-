// feedback_btn_nov19: the Feedback button is on every signed-in screen, in view, on top, and covers nothing.
// Walks every .pb-screen at 4 sizes x 3 scroll positions (top / middle / end). Also: header height vs r17.10 (HEIGHTS file).
// env: PB_URL, MGR=1 (office account), DUMP=file (write header heights, no checks), HEIGHTS=file (compare), VPS="390x844,..."
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const mgr=require(R+'/mgr');const {probe}=require('../t/lib');const fs=require('fs');
const URL=process.env.PB_URL||'http://127.0.0.1:9250/cur.html';
const VPS=(process.env.VPS||'390x844,375x667,430x932,1280x800').split(',').map(s=>s.split('x').map(Number));
const base=process.env.HEIGHTS&&fs.existsSync(process.env.HEIGHTS)?JSON.parse(fs.readFileSync(process.env.HEIGHTS,'utf8')):null;
let pass=0,fail=0;const fails=[];const ok=(c,m)=>{if(c)pass++;else{fail++;fails.push(m);}};
(async()=>{const {b,p}=await boot(URL,{init:process.env.MGR?co+mgr:co,wait:3500});const dump={};
 for(const [VW,VH] of VPS){const vp=VW+'x'+VH;dump[vp]={};await p.setViewportSize({width:VW,height:VH});await p.waitForTimeout(500);
  const ids=await p.evaluate(()=>[...document.querySelectorAll('.pb-screen')].map(x=>x.id.replace('screen-','')));let seen=0,grew=[];
  for(const id of ids){await p.evaluate(s=>{try{pbGoto(s)}catch(e){}},id);await p.waitForTimeout(220);
   const on=await p.evaluate(()=>{const x=[...document.querySelectorAll('.pb-screen')].find(x=>x.offsetParent);return x?x.id.replace('screen-',''):'';});if(on!==id)continue; // this account can't open it
   seen++;const H=await p.evaluate(()=>document.documentElement.scrollHeight-innerHeight);const hs=[];
   for(const y of [0,Math.round(H/2),H]){await p.evaluate(y=>window.scrollTo(0,y),y);await p.waitForTimeout(260);
    const hh=await p.evaluate(()=>{const h=document.querySelector('.pb-screen.active > .pb-header');return h&&getComputedStyle(h).display!=='none'?Math.round(h.getBoundingClientRect().height*10)/10:0;});hs.push(hh);
    if(process.env.DUMP)continue;
    const m=await probe(p);const w=vp+' '+id+' y='+y+': ';
    if(id==='login'||id==='auth'){ok(!m.shown,w+'shown on a signed-out screen');continue;}
    ok(m.shown,w+'button not shown');if(!m.shown)continue;
    ok(m.inView,w+'button not fully in view '+JSON.stringify(m.rect));ok(m.onTop,w+'button is under something');
    ok(!m.covers.length,w+'covers '+JSON.stringify(m.covers));ok(!m.text.length,w+'covers text '+JSON.stringify(m.text.slice(0,3)));
    // the 44 px tap area (4 px wider than the paint) touches no other control
    const near=await p.evaluate(()=>{const fb=document.getElementById('pbFbPill'),r=fb.getBoundingClientRect(),g=4,out=[];for(const e of document.querySelectorAll('button,a[href],select,textarea,input:not([type=hidden]),summary,[role=button]')){if(e===fb||!e.offsetParent)continue;const q=e.getBoundingClientRect();if(q.width<1||q.height<1)continue;if(!(q.right<=r.left-g||q.left>=r.right+g||q.bottom<=r.top-g||q.top>=r.bottom+g)){const t=document.elementFromPoint(Math.min(Math.max(q.left+q.width/2,0),innerWidth-1),Math.min(Math.max(q.top+q.height/2,0),innerHeight-1));if(t&&(t===e||e.contains(t)))out.push((e.textContent||e.id).trim().slice(0,30));}}return out;});
    ok(!near.length,w+'tap area touches '+JSON.stringify(near));
    ok(m.rect.h>=34&&m.rect.w>=60,w+'button too small '+JSON.stringify(m.rect));
   }
   dump[vp][id]=hs;
   if(base&&base[vp]&&base[vp][id]){const d=hs.map((h,i)=>Math.round((h-base[vp][id][i])*10)/10);if(d.some(x=>x>1))grew.push(id+' +'+d.join('/'));}
  }
  console.log(vp,'screens opened',seen,'of',ids.length,base?'| header taller than r17.10 by more than 1 px: '+(grew.length?grew.join(', '):'none'):'');
  if(!process.env.DUMP){ // the button opens the same sheet
   await p.evaluate(()=>{pbGoto('home');window.scrollTo(0,0);});await p.waitForTimeout(300);await p.click('#pbFbPill');await p.waitForTimeout(500);
   const s=await p.evaluate(()=>({open:document.documentElement.classList.contains('pb-fb-open'),card:!!document.querySelector('.pb-fb .pb-fb-card #pbFbText'),top:(()=>{const c=document.querySelector('.pb-fb');const r=document.getElementById('pbFbPill').getBoundingClientRect();const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!(c&&t&&c.contains(t));})()}));
   ok(s.open&&s.card,vp+' tap opens the feedback sheet');ok(s.top,vp+' the open sheet covers the button (no double tap)');
   await p.click('#pbFbX');await p.waitForTimeout(300);ok(await p.evaluate(()=>!document.documentElement.classList.contains('pb-fb-open')),vp+' sheet closes');
  }
 }
 if(process.env.DUMP){fs.writeFileSync(process.env.DUMP,JSON.stringify(dump));console.log('wrote',process.env.DUMP);}
 else{console.log('PASS',pass,'FAIL',fail);fails.slice(0,40).forEach(f=>console.log('  FAIL',f));}
 console.log('errs',p.errs.slice(0,3));await b.close();})();
