// service worker: an app update while a run is open, and while offline (real sw.js, routed https origin)
const {chromium}=require('/opt/npm-tools/node_modules/playwright');const fs=require('fs');const co=require('./co_ok');const L=require('./lib');const F=require('./flow');
const SITE='/tmp/claude-0/audit/offline/swsite/';const FAKE=fs.readFileSync(__dirname+'/fakesb2.js','utf8');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:400,height:850},serviceWorkers:'allow'});
 let hits=[];
 await ctx.route('https://app.pipelayersbible.com/**',r=>{const u=new URL(r.request().url());let n=u.pathname.replace(/^\//,'')||'index.html';hits.push(n);
   const f=SITE+n;if(!fs.existsSync(f))return r.fulfill({status:404,body:''});r.fulfill({status:200,contentType:n.endsWith('.js')?'application/javascript':n.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream',headers:{'cache-control':'no-cache'},body:fs.readFileSync(f)});});
 await ctx.route(/supabase-js/,r=>r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:FAKE}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 await ctx.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
 await ctx.addInitScript(co);
 const open=async()=>{const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('framenavigated',f=>{if(f===p.mainFrame())p.navs=(p.navs||0)+1;});await p.goto('https://app.pipelayersbible.com/',{waitUntil:'load'}).catch(e=>console.log('goto fail',e.message.slice(0,60)));await p.waitForTimeout(5000);return p;};
 const p=await open();
 console.log('sw controller:',await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();return {reg:!!r,active:r&&r.active&&r.active.state,ctl:!!navigator.serviceWorker.controller,caches:await caches.keys()};}));
 await L.newRun(p,100);await L.lock(p);const r=await L.rows(p);await L.markLaid(p,r[4]);await p.waitForTimeout(800);
 const navs0=p.navs;
 // a new build is published while the run is open (page + sw.js change)
 fs.writeFileSync(SITE+'index.html',fs.readFileSync(SITE+'index.html','utf8').replace("const PB_APP_BUILD = 'r16.95 · 2026-11-17'","const PB_APP_BUILD = 'r16.96 · 2026-11-18'"));
 fs.writeFileSync(SITE+'sw.js',fs.readFileSync(SITE+'sw.js','utf8').replace("const PB_SW_BUILD = 'r16.95 · 2026-11-17'","const PB_SW_BUILD = 'r16.96 · 2026-11-18'"));
 console.log('update():',await p.evaluate(async()=>{try{const r=await navigator.serviceWorker.getRegistration();await r.update();return 'ok';}catch(e){return e.message.slice(0,80);}}));
 const px=await open();console.log('second tab build',await px.evaluate(()=>document.documentElement.innerHTML.match(/PB_APP_BUILD = '([^']+)'/)[1]),'hits',hits.slice(-4));await px.close();await p.waitForTimeout(6000);
 console.log('after update: page reloaded?',p.navs!==navs0,'screen',await F(p).screen(),'caches',await p.evaluate(()=>caches.keys()));
 await L.markLaid(p,r[8]);await p.waitForTimeout(800);
 console.log('marks in open page:',await p.evaluate(()=>Object.keys(window.__pbRrDebug.run().laid.marks).length));
 // phone goes offline and the app is reopened: the kept copy is the NEW build, with the run
 await ctx.setOffline(true);await p.close({runBeforeUnload:false});
 const p2=await open();
 console.log('offline reopen build:',await p2.evaluate(()=>{try{return document.body.innerText.includes('PIPELAYER')?(window.__pbRrDebug?Object.keys(window.__pbRrDebug.run().laid.marks).length+' marks':'no app'):'blank';}catch(e){return 'err '+e.message;}}));
 console.log('build shown:',await p2.evaluate(()=>{const m=document.documentElement.innerHTML.match(/PB_APP_BUILD = '([^']+)'/);return m&&m[1];}));
 // an update published while the phone is offline: nothing changes, nothing lost
 fs.writeFileSync(SITE+'sw.js',fs.readFileSync(SITE+'sw.js','utf8').replace("r16.96 · 2026-11-18","r16.97 · 2026-11-19"));
 await p2.evaluate(async()=>{try{const r=await navigator.serviceWorker.getRegistration();await r.update();}catch(e){return e.message;}}).then(x=>console.log('update offline:',x));
 await p2.reload().catch(e=>console.log('reload fail',e.message.slice(0,60)));await p2.waitForTimeout(5000);
 console.log('offline reload:',await p2.evaluate(()=>window.__pbRrDebug?Object.keys(window.__pbRrDebug.run().laid.marks).length+' marks':'no app'));
 console.log('errs',p2.errs.slice(0,3));await b.close();})();
