// Spanish, phase 1: the setting. English is the default and untouched; Settings > Language / Idioma switches and switches
// back; the choice is kept; a Spanish phone is offered Spanish once (first open and the join screen); the app's own code
// still reads English while Spanish is shown; a locked run's record is the same in both languages.
// Run: NODE_PATH=/opt/npm-tools/node_modules PB_URL=http://127.0.0.1:9300/cur.html node t_es_switch.js
const L=require('./lib');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const tab=(p)=>p.evaluate(()=>{const n=[...document.querySelectorAll('nav button, nav a, [aria-label="Main"] button, [aria-label="Principal"] button')].filter(e=>e.getClientRects().length);return n.map(e=>{let s='';const w=document.createTreeWalker(e,4);let t;while((t=w.nextNode()))s+=window.__nativeData.get.call(t);return s.trim();}).join('|');});
const painted=(p,sel)=>p.evaluate((sel)=>{const e=document.querySelector(sel);if(!e)return null;const d=window.__nativeData;let s='';const w=document.createTreeWalker(e,4);let t;while((t=w.nextNode()))s+=d.get.call(t);return s.replace(/\s+/g,' ').trim();},sel);
const NATIVE="window.__nativeData=Object.getOwnPropertyDescriptor(CharacterData.prototype,'data');window.__nativeTC=Object.getOwnPropertyDescriptor(Node.prototype,'textContent').get;";
// every piece of text and every label on the whole page (shown or not), as painted; clock times masked
const snap=(p)=>p.evaluate(()=>{const d=window.__nativeData,out=[];const w=document.createTreeWalker(document.body,5);let n;
  while((n=w.nextNode())){if(n.nodeType===3){const pt=n.parentNode&&n.parentNode.tagName;if(pt==='SCRIPT'||pt==='STYLE')continue;const s=d.get.call(n).replace(/\s+/g,' ').trim();if(s)out.push(s);}
   else{if(n.id==='pbLangOffer')continue;for(const a of ['placeholder','aria-label','title','alt','value','lang']){const v=Element.prototype.hasAttribute.call(n,a)?n.attributes[a].value:null;if(v)out.push(a+'='+v);}}}
  return out.map(s=>s.replace(/\d{1,2}:\d{2}(:\d{2})?( [AP]M)?/g,'T').replace(/\b\d+ ?s\b|\b\d+ seconds\b/g,'S')).sort();});
const settingsHtml=(p)=>p.evaluate(()=>{const c=document.getElementById('screen-settings').cloneNode(true);return c.innerHTML;});
(async()=>{const b=await L.chromium.launch();
 // 1. English phone, nothing chosen: English, nothing armed, no offer
 {const p=await L.SC.home_pl(b,{init:NATIVE});
  ok(await p.evaluate(()=>pbLang()==='en'&&document.documentElement.lang==='en'),'1: default is English');
  ok(await p.evaluate(()=>Object.getOwnPropertyDescriptor(Node.prototype,'textContent').get===window.__nativeTC&&pbI18nStats().armed===false),'1: English: the translation layer is not switched on at all (the page\'s own text reading is untouched)');
  ok(!(await p.$('#pbLangOffer')),'1: an English phone is not asked about Spanish');
  ok(/^Home\|/.test(await tab(p)),'1: tab bar in English ('+await tab(p)+')');
  // 2. Settings > Language / Idioma
  await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(600);
  ok(await p.evaluate(()=>{const t=document.getElementById('langToggle');return !!t&&t.getClientRects().length>0&&document.getElementById('langLabel').textContent==='Language / Idioma'&&[...t.querySelectorAll('button')].map(x=>x.textContent).join('|')==='English|Español'&&t.querySelector('[data-val=en]').getAttribute('aria-pressed')==='true';}),'2: Settings > Preferences shows "Language / Idioma": English (on) | Español');
  await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(600);await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(600); // the same walk as below, so only the language differs
  await p.evaluate(()=>{pbSetLang('es');});await p.waitForTimeout(400);await p.evaluate(()=>{pbSetLang('en');try{localStorage.removeItem('pbLang');}catch(e){}});await p.waitForTimeout(400); // (the app tidies its Run Setup form the first time anything on the page changes; let it, so the two snapshots differ only by language)
  const before=await snap(p),beforeH=await settingsHtml(p);
  await p.click('#langToggle [data-val=es]');await p.waitForTimeout(500);
  ok(await p.evaluate(()=>pbLang()==='es'&&document.documentElement.lang==='es'&&localStorage.getItem('pbLang')==='es'&&document.querySelector('#langToggle [data-val=es]').getAttribute('aria-pressed')==='true'),'2: tap Español: Spanish is on and saved on this phone');
  ok(/^Inicio\|Calculadoras/.test(await tab(p)),'2: the tab bar is Spanish at once, no reload ('+await tab(p)+')');
  ok(await p.evaluate(()=>{const e=[...document.querySelectorAll('button,a')].find(x=>x.getClientRects().length&&x.textContent.trim()==='Home');return !!e;}),'2: the app\'s own code still reads the English text ("Home") while "Inicio" is painted');
  await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(600);
  ok(/Tramo nuevo/.test(await painted(p,'#screen-home'))&&/New Run/.test(await p.evaluate(()=>document.getElementById('screen-home').textContent))&&/New Run/.test(await p.evaluate(()=>document.getElementById('screen-home').innerText))&&/New Run/.test(await p.evaluate(()=>document.getElementById('screen-home').innerHTML)),'2: Home paints "Tramo nuevo"; textContent, innerText and innerHTML still answer "New Run"');
  // 3. back to English: everything exactly as before
  await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(600);
  await p.click('#langToggle [data-val=en]');await p.waitForTimeout(500);
  const after=await snap(p),afterH=await settingsHtml(p);
  ok(await p.evaluate(()=>pbLang()==='en'&&document.documentElement.lang==='en'&&localStorage.getItem('pbLang')==='en'),'3: tap English: English is on and saved');
  const d1=after.filter((x,i)=>x!==before[i]);
  ok(after.length===before.length&&d1.length===0,'3: every text and label on the whole page (shown or hidden, '+after.length+' pieces) is exactly the English it was before'+(d1.length?': '+d1.slice(0,4).join(' | ').slice(0,300):''));
  ok(afterH===beforeH,'3: the Settings screen\'s HTML is exactly what it was ('+afterH.length+' chars)');
  await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(500);
  ok(/New Run/.test(await painted(p,'#screen-home'))&&!/Tramo/.test(await painted(p,'#screen-home')),'3: Home is English again');
  await p.evaluate(()=>pbSetLang('es'));await p.reload({waitUntil:'load'});await p.waitForTimeout(3500);
  ok(/^Inicio\|/.test(await tab(p))&&/Tramo nuevo/.test(await painted(p,'#screen-home')),'3b: Spanish again, and still Spanish after the app is reopened');
  ok(p.errs.length===0,'1-3: no page errors '+p.errs.join('|').slice(0,200));await p.context().close();}
 // 4. a Spanish phone: offered once on first open (Log In) and on the join screen
 {const p=await L.SC.login(b,{init:NATIVE,ua:L.AND});await p.context().close();}
 for(const [name,loc] of [['login','es-MX'],['join','es-US'],['join_ios','es-419']]){
  const p=await L.SC[name](b,{init:NATIVE+"Object.defineProperty(navigator,'language',{get:()=>'"+loc+"'});Object.defineProperty(navigator,'languages',{get:()=>['"+loc+"','en-US']});"});
  ok(await p.evaluate(()=>{const o=document.getElementById('pbLangOffer');return !!o&&o.getClientRects().length>0&&/español/i.test(o.textContent)&&!!document.getElementById('pbLangOfferEs')&&!!document.getElementById('pbLangOfferEn');}),'4 '+name+' ('+loc+' phone): asked "¿Ver la app en español?" with Español / English');
  ok(await p.evaluate(()=>pbLang()==='en'),'4 '+name+': still English until they choose');
  ok(await p.evaluate(()=>{const o=document.getElementById('pbLangOffer').getBoundingClientRect();return o.left>=0&&o.right<=innerWidth+0.5&&document.documentElement.scrollWidth<=innerWidth;}),'4 '+name+': the question fits 390 px');
  await p.click('#pbLangOfferEs');await p.waitForTimeout(500);
  const txt=await painted(p,name==='login'?'#screen-login':'#pbObSheet');
  ok(await p.evaluate(()=>pbLang()==='es'&&!document.getElementById('pbLangOffer')&&localStorage.getItem('pbLang')==='es')&&(name==='login'?/Iniciar sesión/.test(txt):/Únase a|Ponga la app/.test(txt)),'4 '+name+': tap Español: the screen is Spanish, the question is gone ('+String(txt).slice(0,60)+')');
  ok(p.errs.length===0,'4 '+name+': no page errors');await p.context().close();}
 {const p=await L.SC.login(b,{init:"Object.defineProperty(navigator,'language',{get:()=>'es-MX'});Object.defineProperty(navigator,'languages',{get:()=>['es-MX']});"});
  await p.click('#pbLangOfferEn');await p.waitForTimeout(300);
  ok(await p.evaluate(()=>pbLang()==='en'&&!document.getElementById('pbLangOffer')&&localStorage.getItem('pbLang')==='en'),'5: a Spanish phone that taps English stays English');
  await p.reload({waitUntil:'load'});await p.waitForTimeout(3000);
  ok(!(await p.$('#pbLangOffer')),'5: and is not asked again');await p.context().close();}
 // 6. the join works in Spanish (the Terms tick and Join Crew do what they do in English)
 {const p=await L.SC.join(b,{lang:'es'});
  await p.click('#pbObJoinBtn',{force:true}).catch(()=>{});await p.waitForTimeout(300);
  const dis=await p.evaluate(()=>document.getElementById('pbObJoinBtn').disabled);
  await p.evaluate(()=>{const c=document.querySelector('#pbObSheet input[type=checkbox]');c.click();});await p.waitForTimeout(300);
  const en=await p.evaluate(()=>!document.getElementById('pbObJoinBtn').disabled);
  ok(dis&&en,'6: Join Crew ("Unirme a la cuadrilla") is off until the Terms box is ticked, then on');
  await p.click('#pbObJoinBtn');await p.waitForTimeout(5000);
  ok(await p.evaluate(()=>{const h=document.getElementById('screen-home');return !!h&&h.getClientRects().length>0;})&&p.srv.st.links.some(l=>l.used_at||l.used||l.joined_at||l.used_by),'6: tapping it joins and lands on Home');
  ok(p.errs.length===0,'6: no page errors '+p.errs.join('|').slice(0,200));await p.context().close();}
 // 7. a run locked in Spanish sends the same record as one locked in English
 {const rec=async(lang)=>{const p=await L.SC.run_locked(b,{lang});let put=null;for(let i=0;i<24&&!put;i++){await p.waitForTimeout(500);put=await p.evaluate(()=>{const a=(window.__rpcArgs||[]).filter(x=>x[0]==='pb_prod_run_record_put').pop();return a?a[1]:null;});}
   const flat=[];(function go(o,path){if(o&&typeof o==='object'){for(const k of Object.keys(o).sort())go(o[k],path+'.'+k);}else if(typeof o==='string'&&!/^\d{4}-\d\d-\d\dT|^[0-9a-f]{8}-[0-9a-f]{4}-/.test(o)&&!/(At|_at|Id|_id|id|time|Time|hash|Hash|key|Key|uid|stamp)$/.test(path))flat.push(path+'='+o.replace(/\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}(:\d{2})? [AP]M|\d{1,2}:\d{2}(:\d{2})? ?[AP]M/g,'TIME'));})(put,'');
   const errs=p.errs.slice();await p.context().close();return {put:!!put,flat,errs};};
  const en=await rec('en'),es=await rec('es');
  ok(en.put&&es.put,'7: both runs were locked and sent (pb_prod_run_record_put)');
  const diff=es.flat.filter(x=>!en.flat.includes(x));
  ok(es.flat.length>10&&diff.length===0,'7: every word in the Spanish phone\'s record is the same as the English phone\'s ('+es.flat.length+' text values)'+(diff.length?' differs: '+diff.slice(0,5).join(' ; ').slice(0,300):''));
  ok(!/Tramo|Estaci[oó]n|Regla|Lectura|Instalad/.test(es.flat.join('\n')),'7: no Spanish words in the record');
  ok(es.errs.length===0,'7: no page errors '+es.errs.join('|').slice(0,200));}
 // 8. phase 2: dates, the words drawn by CSS, the laid toast, the Terms links, record text and typed text left alone
 {const p=await L.SC.laid_done(b,{lang:'es',init:NATIVE});
  const T=(x)=>p.evaluate((x)=>window.pbT(x),x);
  const want={'Thu, Nov 19':'jue 19 nov','Nov 19, 10:02 PM':'19 nov, 10:02 PM','Nov 19, 2026, 10:02 PM':'19 nov 2026, 10:02 PM','November 19, 2026':'19 de noviembre de 2026','Thursday, November 19':'jueves 19 de noviembre','Fri 10:04 PM':'vie 10:04 PM','November 2026':'noviembre de 2026','Nov 16 – Nov 22':'16 nov – 22 nov','Locked Nov 19, 10:02 PM':'Bloqueado 19 nov, 10:02 PM','May 5':'5 may','10:02 PM':'10:02 PM','11/19/2026':'11/19/2026'};
  const got={};for(const k in want)got[k]=await T(k);const bad=Object.keys(want).filter(k=>got[k]!==want[k]);
  ok(bad.length===0,'8: dates read in Spanish ('+Object.keys(want).length+' shapes; clock times and all-number dates unchanged)'+(bad.length?': '+bad.map(k=>k+' -> '+got[k]).join(' ; '):''));
  ok(await T('Marcar 5 filas')==='Marcar 5 filas'&&await T('Mark laid to here (and the rows before)')==='Marcar instalado hasta aquí (y las filas de antes)','8: a word that only starts like a month ("Marcar 5") is not taken for a date');
  const css=await p.evaluate(()=>{const tr=document.querySelector('#resultsBody tr[data-laid-idx]:not([data-laid-strip])');const td=tr.children[1];tr.classList.add('pb-laid-armed');const a=getComputedStyle(td,'::before').content;tr.classList.remove('pb-laid-armed');tr.classList.add('pb-laid-armedundo');const u=getComputedStyle(td,'::before').content;tr.classList.remove('pb-laid-armedundo');return [a,u];});
  ok(/Suelte: instalado/.test(css[0])&&/Suelte: deshacer/.test(css[1]),'8: press-and-hold cue on a grade row says "Suelte: instalado" / "Suelte: deshacer" ('+css.join(' | ')+')');
  const toast=await p.evaluate(()=>{const t=document.getElementById('pbLaidToast');if(!t||t.hidden)return null;const x=t.querySelector('.pb-laid-toastt');const r=t.getBoundingClientRect();let s='';const w=document.createTreeWalker(x,4);let n;while((n=w.nextNode()))s+=window.__nativeData.get.call(n);return {txt:s,cut:x.scrollWidth>x.clientWidth+1,l:r.left,r:r.right,W:innerWidth,btn:t.querySelector('button').getBoundingClientRect().width};});
  ok(toast&&/^Inst\. hasta /.test(toast.txt)&&!toast.cut&&toast.l>=0&&toast.r<=toast.W&&toast.btn>=72,'8: the laid toast shows whole in Spanish, on screen, with its Deshacer button ('+JSON.stringify(toast)+')');
  await p.setViewportSize({width:320,height:700});await p.waitForTimeout(300);
  const rod=await p.evaluate(()=>{pbGoto('rodElevCalc',false,true);document.getElementById('pbApp').classList.add('pb-text-big');const s=document.getElementById('screen-rodElevCalc');const i=[...s.querySelectorAll('input')].filter(e=>e.getClientRects().length);i.forEach(e=>{e.value='5';e.dispatchEvent(new Event('input',{bubbles:true}));});[...s.querySelectorAll('button')].filter(e=>e.getClientRects().length&&/Add to List/.test(e.textContent)).forEach(e=>e.click());const td=s.querySelector('#rodElevLogSection table.pb-table tbody tr:not(.pb-shot-setup) td:nth-child(2)');return td?getComputedStyle(td,'::before').content:null;});
  ok(rod===null||/Lectura/.test(rod),'8: Rod Elevation at large text on a small phone: the row label says "Lectura" ('+rod+')'+(rod===null?' [no row in this state: not checked]':''));
  await p.setViewportSize({width:390,height:844});
  const links=await p.evaluate(()=>{pbGoto('settings',false,true);const a=[...document.querySelectorAll('#settingsLegal a')];return a.map(x=>window.__nativeGA.call(x,'href')+'>'+x.getAttribute('href'));});
  ok(links.join(',')==='terms_es.html>terms.html,privacy_es.html>privacy.html','8: in Spanish the Terms and Privacy links open the Spanish courtesy copies; the app still reads the English addresses ('+links.join(',')+')');
  const pre=await p.evaluate(()=>{const s=document.getElementById('screen-settings');const x=document.createElement('pre');x.textContent='EMERGENCY\n\nActive Permit\n\nLog In';const ta=document.createElement('textarea');ta.value='Home';ta.setAttribute('placeholder','Quick note');const d=document.createElement('div');d.id='inboxDetail';d.textContent='Home';s.appendChild(x);s.appendChild(ta);s.appendChild(d);return new Promise(r=>setTimeout(()=>{const raw=(e)=>{let t='';const w=document.createTreeWalker(e,4);let n;while((n=w.nextNode()))t+=window.__nativeData.get.call(n);return t;};const o=[raw(x),ta.value,window.__nativeGA.call(ta,'placeholder'),ta.placeholder,raw(d)];x.remove();ta.remove();d.remove();r(o);},200));});
  ok(pre[0]==='EMERGENCY\n\nActive Permit\n\nLog In'&&pre[1]==='Home'&&pre[4]==='Home','8: report text (<pre>), an opened report and what a person typed are never translated');
  ok(pre[2]==='Nota rápida'&&pre[3]==='Quick note','8: the hint in an empty text box is Spanish; the app still reads the English hint');
  await p.evaluate(()=>window.pbSetLang('en'));await p.waitForTimeout(300);
  const back=await p.evaluate(()=>[...document.querySelectorAll('#settingsLegal a')].map(x=>window.__nativeGA.call(x,'href')).join(','));
  ok(back==='terms.html,privacy.html','8: back to English: the links are the English documents again');
  ok(p.errs.length===0,'8: no page errors '+p.errs.join('|').slice(0,200));await p.context().close();}
 // 9. the Spanish courtesy copies exist, say the English version controls, and are marked draft
 {const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
  for(const [f,en] of [['terms_es.html','terms.html'],['privacy_es.html','privacy.html']]){const r=await p.goto(L.BASE.replace(/[^/]+$/,f));const t=r&&r.ok()?await p.evaluate(()=>document.body.innerText):'';
   ok(/La versión en inglés es la que vale/.test(t.slice(0,600))&&/The English version controls/.test(t.slice(0,900)),'9: '+f+' opens and says at the top that the English version controls (in Spanish and in English)');
   ok(/BORRADOR \/ DRAFT/.test(t.slice(0,1200))&&await p.evaluate((en)=>document.documentElement.lang==='es'&&!!document.querySelector('a[href="'+en+'"]')&&/noindex/.test(document.querySelector('meta[name=robots]').content),en),'9: '+f+' is marked DRAFT, lang="es", links to the English original, and is not indexed');
   ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'9: '+f+' fits 390 px');}
  await ctx.close();}
 await b.close();console.log(fails?'FAILED '+fails:'ALL PASS');process.exit(fails?1:0);})();
