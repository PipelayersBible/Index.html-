// node harvest_all.js <rig: fm|pl> <out.json>  -> for every screen: the English pieces (shown or hidden) with no Spanish yet
const L=require('./lib');const fs=require('fs');
(async()=>{const b=await L.chromium.launch();const rig=process.argv[2]||'fm';
 const p=await L.SC[rig==='pl'?'home_pl':'home_fm'](b,{lang:'es'});
 const ids=await p.evaluate(()=>[...document.querySelectorAll('[id^="screen-"]')].map(e=>e.id.slice(7)));
 const out={};let tot=0,miss=0;
 for(const id of ids){try{await p.evaluate((id)=>{try{pbGoto(id,false,true);}catch(e){}},id);await p.waitForTimeout(350);}catch(e){}
  // close any dialog a screen opens by itself
  await p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');if(d&&getComputedStyle(d).display!=='none'){const bs=[...d.querySelectorAll('button')];if(bs.length)bs[0].click();}});
  const r=await p.evaluate((id)=>window.pbI18nScan(document.getElementById('screen-'+id),true),id);
  const seen=new Set();const m=[];for(const x of r){if(x.kind==='mixed'&&!x.hit){}if(x.hit)continue;const k=x.kind+'|'+x.k;if(seen.has(k))continue;seen.add(k);m.push([x.kind,x.k]);}
  out[id]={n:r.length,miss:m};tot+=r.length;miss+=m.length;console.log(id.padEnd(22),String(r.length).padStart(5),String(m.length).padStart(5));}
 const r=await p.evaluate(()=>{const o=[];for(const e of document.body.children){if(/^screen-/.test(e.id)||e.querySelector&&e.querySelector('[id^="screen-"]'))continue;o.push(...window.pbI18nScan(e,true));}return o;});
 const seen=new Set();const m=[];for(const x of r){if(x.hit)continue;const k=x.kind+'|'+x.k;if(seen.has(k))continue;seen.add(k);m.push([x.kind,x.k]);}out._chrome={n:r.length,miss:m};console.log('_chrome',r.length,m.length);
 console.log('total',tot,'miss',miss,'errs',p.errs.length);fs.writeFileSync(process.argv[3]||'/tmp/claude-0/es20/harvest.json',JSON.stringify(out,null,0));await b.close();})();
