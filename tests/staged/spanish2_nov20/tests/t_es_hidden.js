// Spanish, phase 2: THE SWITCH IS OFF (PB_ES_ENABLED = False, how it ships this week). Nothing Spanish shows anywhere.
//   A. The shipped file is the r17.10 source plus the inserted blocks, byte for byte.
//   B. An English phone, and a phone set to Spanish that even has an old saved "Español" choice: no Language row, no offer
//      bar, <html lang="en">, the layer never switches on, the dictionary is never read, pbSetLang('es') does nothing, and
//      every text and label on the page is exactly what unpatched r17.10 draws.
//   C. The reviewer's link (#es-review) turns it on for that one phone only; #es-review-off undoes it; a build with the
//      link turned off ignores it.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_ROOT=http://127.0.0.1:9450/ PB_SITE=/tmp/claude-0/es20/site node t_es_hidden.js
const fs=require('fs');const ROOT=process.env.PB_ROOT||'http://127.0.0.1:9450/';const SITE=process.env.PB_SITE||'/tmp/claude-0/es20/site';
process.env.PB_URL=ROOT+'hidden.html';const L=require('./lib');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const ES_PHONE="try{Object.defineProperty(navigator,'language',{get:()=>'es-MX'});Object.defineProperty(navigator,'languages',{get:()=>['es-MX','es']});}catch(e){}try{localStorage.setItem('pbLang','es');}catch(e){}";
const NATIVE="window.__nativeTC=Object.getOwnPropertyDescriptor(Node.prototype,'textContent').get;window.__nativeGA=Element.prototype.getAttribute;window.__nativeClone=Node.prototype.cloneNode;";
const snap=(p)=>p.evaluate(()=>{const out=[];const w=document.createTreeWalker(document.body,5);let n;
  while((n=w.nextNode())){if(n.nodeType===3){const pt=n.parentNode&&n.parentNode.tagName;if(pt==='SCRIPT'||pt==='STYLE')continue;if(n.parentNode.closest&&n.parentNode.closest('#langLabel,#langToggle'))continue;const s=n.data.replace(/\s+/g,' ').trim();if(s)out.push(s);}
   else{if(n.id==='langLabel'||n.id==='langToggle'||n.closest('#langToggle'))continue;for(const a of ['placeholder','aria-label','title','alt','value','lang','href']){const v=n.getAttribute(a);if(v)out.push(a+'='+v);}}}
  return out.map(s=>s.replace(/\d{1,2}:\d{2}(:\d{2})?( ?[AP]M)?/g,'T').replace(/\b\d+ ?s\b|\b\d+ seconds?\b/g,'S').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f-]{20,}/g,'ID').replace(/\b1[78]\d{11}\b(_\d+)?/g,'STAMP').replace(/#join=[\w-]+|\b[A-Z0-9]{3} [A-Z0-9]{3}\b|\?[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]+/g,'CODE').replace(/under 1 min ago|\d+ min ago/g,'AGO')).sort();});
const SPANISH=/¿|¡|\b(Inicio|Tramo|Permiso|Ajustes|Registros|Preguntar|Contraseña|Iniciar sesión|cuadrilla|Español|Idioma|Calculadoras)\b/;
const state=(p)=>p.evaluate(()=>{const vis=(id)=>{const e=document.getElementById(id);return !!e&&e.getClientRects().length>0;};const st=window.pbI18nStats();
  return {lang:document.documentElement.lang,pbLang:window.pbLang(),offer:!!document.getElementById('pbLangOffer'),row:vis('langLabel')||vis('langToggle'),enabled:st.enabled,armed:st.armed,loaded:st.loaded,
   nativeTC:Object.getOwnPropertyDescriptor(Node.prototype,'textContent').get===window.__nativeTC,nativeGA:Element.prototype.getAttribute===window.__nativeGA,nativeClone:Node.prototype.cloneNode===window.__nativeClone,
   css:(()=>{const t=document.querySelector('#pbTabBar .pb-tab[data-tab="calculators"] .lb');return t?getComputedStyle(t,'::after').content:'';})()};});
(async()=>{
 // A. file level
 {const base=fs.readFileSync(SITE+'/base.html','utf8');let h=fs.readFileSync(SITE+'/hidden.html','utf8');
  const cut=(s,a,b)=>{const i=s.indexOf(a);const j=s.indexOf(b,i);if(i<0||j<0)return null;return s.slice(0,i)+s.slice(j+b.length);};
  let x=cut(h,'<script type="application/json" id="pbI18nDict">','</style>\n');ok(x!==null,'A: the inserted block (dictionary data, layer, 7 CSS lines) is in one piece right after <body>');
  if(x!==null){const y=cut(x,'        <p class="pb-set-label" id="langLabel"','        </div>\n');ok(y!==null&&y===base,'A: remove the inserted block and the hidden Language row: the shipped file is the r17.10 source byte for byte ('+base.length+' chars)');}
  ok(/var PB_ES_ENABLED = false;/.test(h)&&/id="langLabel" data-noi18n style="display:none"/.test(h)&&/id="langToggle"[^>]*style="display:none"/.test(h),'A: PB_ES_ENABLED = false in the page; the Language row is in the page with display:none');
  const dict=h.slice(h.indexOf('id="pbI18nDict">'),h.indexOf('</script>',h.indexOf('id="pbI18nDict">')));ok(!/<script(?! type="application\/json")[^>]*>[^<]*"Tramo nuevo"/.test(h)&&dict.length>100000,'A: the Spanish words sit in a data block the browser does not run ('+Math.round(dict.length/1024)+' KB), not in code');}
 const b=await L.chromium.launch();
 // B. screens, English phone and Spanish phone with a stale saved choice
 const SCN=(process.argv[2]?process.argv[2].split(','):['login','join','home_pl','fm_settings','run_locked','permit_active','calc_trenchCalc','pl_records']);
 for(const name of SCN){
  const q=await L.SC[name](b,{url:ROOT+'base.html'});let base=await snap(q);
  for(const [who,init] of [['English phone',NATIVE],['Spanish phone + old saved Español',NATIVE+ES_PHONE]]){
   const p=await L.SC[name](b,{init});const st=await state(p);
   ok(st.lang==='en'&&st.pbLang==='en'&&!st.offer&&!st.row,name+' / '+who+': <html lang="en">, no offer bar, no Language row');
   ok(st.enabled===false&&st.armed===false&&st.loaded===false&&st.nativeTC&&st.nativeGA&&st.nativeClone,name+' / '+who+': the layer is off, the dictionary was never read, the page\'s own text functions are untouched');
   await p.evaluate(()=>{window.pbSetLang('es');});await p.waitForTimeout(300);const st2=await state(p);
   ok(st2.lang==='en'&&st2.pbLang==='en'&&!st2.armed&&!st2.loaded,name+' / '+who+': pbSetLang("es") does nothing');
   let a=await snap(p);for(let i=0;i<6&&JSON.stringify(a)!==JSON.stringify(base);i++){await p.waitForTimeout(1500);await q.waitForTimeout(10);a=await snap(p);base=await snap(q);}
   const d=a.filter((x,i)=>x!==base[i]);ok(a.length===base.length&&d.length===0,name+' / '+who+': every text and label on the page ('+a.length+' pieces, shown or hidden) is what unpatched r17.10 draws'+(d.length?': only here: '+a.filter(x=>!base.includes(x)).slice(0,3).join(' | ').slice(0,200)+' ; only in r17.10: '+base.filter(x=>!a.includes(x)).slice(0,3).join(' | ').slice(0,200):''));
   const sp=a.filter(x=>SPANISH.test(x)&&!base.includes(x));ok(sp.length===0,name+' / '+who+': no Spanish words'+(sp.length?': '+sp.slice(0,3).join(' | '):''));
   ok(!/Calc\./.test(st.css),name+' / '+who+': Spanish CSS words not applied');
   ok(p.errs.length===0,name+' / '+who+': no page errors '+p.errs.join('|').slice(0,160));
   await p.context().close();}
  await q.context().close();}
 // C. reviewer link
 {const p=await L.SC.fm_settings(b,{url:ROOT+'hidden.html#es-review',init:NATIVE});let st=await state(p);
  ok(st.enabled===true&&st.row&&st.lang==='en'&&!st.armed,'C: opened once with #es-review: the Language row shows on this phone (still English until Español is tapped)');
  await p.click('#langToggle [data-val=es]');await p.waitForTimeout(500);st=await state(p);ok(st.lang==='es'&&st.armed,'C: tap Español: Spanish on this phone');
  await p.context().close();
  const q=await L.SC.fm_settings(b,{url:ROOT+'hidden.html#es-review',init:NATIVE+"try{if(!sessionStorage.getItem('x')){sessionStorage.setItem('x','1');}}catch(e){}"});
  await q.goto(ROOT+'hidden.html#es-review-off');await q.reload({waitUntil:'load'});await q.waitForTimeout(2500);st=await state(q);
  ok(st.enabled===false&&!st.row&&st.lang==='en','C: #es-review-off turns it back off on that phone');await q.context().close();
  if(fs.existsSync(SITE+'/nolink.html')){const r=await L.SC.fm_settings(b,{url:ROOT+'nolink.html#es-review',init:NATIVE});st=await state(r);ok(st.enabled===false&&!st.row,'C: a build with PB_ES_REVIEW_LINK off ignores #es-review');await r.context().close();}}
 await b.close();console.log(fails?'FAILED '+fails:'ALL PASS');process.exit(fails?1:0);})();
