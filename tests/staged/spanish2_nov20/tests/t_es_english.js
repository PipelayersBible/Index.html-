// Spanish, phases 1 + 2: English is untouched (run it on hidden.html = as shipped, and on cur.html = Spanish offered, English chosen). The patched page, left in English, draws exactly what the unpatched r17.10
// source draws, screen by screen (same HTML after the clock times are masked). The only difference allowed: the new
// "Language / Idioma" row in Settings.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:9300/cur.html PB_BASE=http://127.0.0.1:9300/base.html node t_es_english.js
const L=require('./lib');const BASE0=process.env.PB_BASE||L.BASE.replace('cur.html','base.html');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const snap=(p)=>p.evaluate(()=>{const c=document.body.cloneNode(true);c.querySelectorAll('script,style,#langLabel,#langToggle').forEach(e=>e.remove());
  return c.innerHTML.replace(/<!-- spanish -->/g,'').replace(/\d{1,2}:\d{2}(:\d{2})?( ?[AP]M)?/g,'T').replace(/\b\d+ ?s\b|\b\d+ seconds?\b/g,'S').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{20,}/g,'ID').replace(/\b1[78]\d{11}\b/g,'STAMP').replace(/#join=[\w-]+|[A-Z0-9]{3} [A-Z0-9]{3}|\?[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]+/g,'CODE').replace(/\bunder 1 min ago|\b\d+ min ago/g,'AGO').replace(/\s+\n/g,'\n').replace(/\n\s*\n/g,'\n');});
const where=(a,b)=>{let i=0;while(i<a.length&&a[i]===b[i])i++;return 'at '+i+': "'+a.slice(Math.max(0,i-70),i+70)+'" vs "'+b.slice(Math.max(0,i-70),i+70)+'"';};
(async()=>{const b=await L.chromium.launch();
 for(const name of (process.argv[2]?process.argv[2].split(','):['login','join','setpw','home_pl','settings','run_setup','run_review','run_locked','permit_active','permit_airbad','home_fm','fm_dailyReport','fm_ticketForm','fm_notifications','calc_trenchCalc','calc_volumeCalc','fm_confinedPermit','pl_records'])){
  const p=await L.SC[name](b,{});const q=await L.SC[name](b,{url:BASE0});
  let a=await snap(p),c=await snap(q);for(let i=0;i<4&&a!==c;i++){await p.waitForTimeout(1500);a=await snap(p);c=await snap(q);} // the app tidies some hidden forms a moment after load: give both pages the same time
  ok(a===c,name+': English is the same as the unpatched page ('+a.length+' chars of HTML)'+(a===c?'':' '+where(a,c)));
  ok(await p.evaluate(()=>document.documentElement.lang==='en'&&!document.getElementById('pbLangOffer')),name+': lang="en", no language question');
  ok(p.errs.length===0,name+': no page errors '+p.errs.join('|').slice(0,160));
  await p.context().close();await q.context().close();}
 await b.close();console.log(fails?'FAILED '+fails:'ALL PASS');process.exit(fails?1:0);})();
