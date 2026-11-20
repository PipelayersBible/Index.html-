// node harvest_dyn.js <out.json> [mode]  : dynamic text. mode calc = every calculator with numbers filled in;
// mode explore:<scenario>:<screenId> = tap every button on that screen, look at what opens, cancel it.
const L=require('./lib');const fs=require('fs');
const CALCS=['rodElevCalc','slopeConvCalc','fracCalc','constCalc','trenchCalc','liftCalc','bedShadeCalc','volumeCalc','beddingCalc','pipeWeightCalc','bendCalc','manningCalc','flowCalc','manholeDepthCalc','ventCalc','quickrun'];
const miss=(r)=>{const seen=new Set();const m=[];for(const x of r){if(x.hit||x.kind==='part')continue;const k=x.k;if(seen.has(k))continue;seen.add(k);m.push([x.kind,k]);}return m;};
(async()=>{const b=await L.chromium.launch();const out={};const mode=process.argv[3]||'calc';
 if(mode==='calc'){const p=await L.SC.home_fm(b,{lang:'es'});
  for(const id of CALCS){for(const val of ['5','12.5']){await p.evaluate((id)=>pbGoto(id,false,true),id);await p.waitForTimeout(400);
   await p.evaluate(([id,val])=>{const s=document.getElementById('screen-'+id);s.querySelectorAll('select').forEach((e,i)=>{if(val!=='5'&&e.options.length>1){e.selectedIndex=Math.min(e.options.length-1,2);e.dispatchEvent(new Event('change',{bubbles:true}));}});
     s.querySelectorAll('input').forEach(e=>{if(!e.getClientRects().length)return;const t=e.type;if(t==='checkbox'||t==='radio'||t==='file'||t==='button')return;e.value=val;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));});
     s.querySelectorAll('button').forEach(e=>{if(e.getClientRects().length&&/^(Calculate|\+ Add to List|Convert)/.test(e.textContent.trim()))e.click();});},[id,val]);
   await p.waitForTimeout(500);const r=await p.evaluate((id)=>window.pbI18nScan(document.getElementById('screen-'+id)),id);const mt=await L.modalText(p);
   if(mt){const r2=await L.scan(p,'#pbModalOverlay');r.push(...r2);await p.evaluate(()=>{const bs=[...document.querySelectorAll('#pbModalOverlay button')];bs[0]&&bs[0].click();});}
   out[id+'_'+val]={n:r.length,miss:miss(r)};console.log(id,val,r.length,out[id+'_'+val].miss.length,p.errs.length);}}
 } else {const [,sc,screen]=mode.split(':');const p=await L.SC[sc](b,{lang:'es'});if(screen)await p.evaluate((id)=>{if(!document.getElementById('screen-'+id).getClientRects().length)pbGoto(id,false,true);},screen);await p.waitForTimeout(800);
  const root=screen?'#screen-'+screen:'body';const n=await p.evaluate((root)=>{const bs=[...document.querySelectorAll(root+' button, '+root+' summary, '+root+' [role=button]')].filter(e=>e.getClientRects().length&&!e.disabled);bs.forEach((e,i)=>e.setAttribute('data-hx',i));return bs.length;},root);
  const r0=await L.scan(p,root);out[sc+'_base']={n:r0.length,miss:miss(r0)};
  for(let i=0;i<n;i++){const lab=await p.evaluate((i)=>{const e=document.querySelector('[data-hx="'+i+'"]');if(!e||!e.getClientRects().length)return null;const t=e.textContent.trim().slice(0,40);if(/EMERGENCY|Log Out|Delete|Sign|Call |Text |Email|Download|PDF|Share|Home$|Back/i.test(t+' '+(e.getAttribute('aria-label')||'')))return null;try{e.click();}catch(x){return null;}return t||e.getAttribute('aria-label')||'?';},i);
   if(lab==null)continue;await p.waitForTimeout(450);
   const r=await p.evaluate((root)=>{const o=[];const m=document.getElementById('pbModalOverlay');if(m&&getComputedStyle(m).display!=='none')o.push(...window.pbI18nScan(m));document.querySelectorAll('.pb-sheet,[role=dialog],.pb-gs-sheet,.rpf-sheet').forEach(d=>{if(d.getClientRects().length&&!d.closest('#pbModalOverlay'))o.push(...window.pbI18nScan(d));});const s=document.querySelector(root);if(s&&s.getClientRects().length)o.push(...window.pbI18nScan(s));else{const v=[...document.querySelectorAll('[id^="screen-"]')].find(e=>e.getClientRects().length);if(v)o.push(...window.pbI18nScan(v));}return o;},root);
   const m=miss(r);if(m.length)out[sc+'_'+i+'_'+lab]={n:r.length,miss:m};
   // cancel whatever opened, come back
   for(let k=0;k<3;k++){const open=await p.evaluate(()=>{const m=document.getElementById('pbModalOverlay');if(m&&getComputedStyle(m).display!=='none'){const bs=[...m.querySelectorAll('button')].filter(b=>b.offsetParent);const c=bs.find(b=>/^(Cancel|Close|Not Now|No|Keep|Go Back|Back|OK|Got It)/.test(b.textContent.trim()))||bs[0];if(c){c.click();return true;}}return false;});if(!open)break;await p.waitForTimeout(300);}
   if(screen)await p.evaluate((id)=>{const s=document.getElementById('screen-'+id);if(!s.getClientRects().length){try{pbGoto(id,true,true);}catch(e){}}},screen);await p.waitForTimeout(250);}
  console.log(sc,'buttons',n,'errs',p.errs.length,p.errs.slice(0,2).join('|').slice(0,200));}
 fs.writeFileSync(process.argv[2],JSON.stringify(out));await b.close();})();
