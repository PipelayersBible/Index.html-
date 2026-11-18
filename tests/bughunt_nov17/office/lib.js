process.env.NODE_PATH='/opt/npm-tools/node_modules';require('module').Module._initPaths();
const {chromium}=require('playwright');const fs=require('fs');
const co=require(__dirname+'/../../rig/co');const mgr=require(__dirname+'/../../rig/mgr');const F=require(__dirname+'/../../rig/flow');
const URL=(process.env.PB_ROOT||'http://127.0.0.1:8866/')+(process.env.PAGE||'cur.html');
async function boot(url,opts={}){const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:800},serviceWorkers:'block'});await require(__dirname+'/../../rig/env').applyClock(ctx);
 await ctx.route(/supabase-js/,r=>r.fulfill({contentType:'application/javascript',body:fs.readFileSync(__dirname+'/fakesb.js','utf8')}));
 await ctx.route(/supabase\.co/,r=>r.fulfill({status:200,contentType:'application/json',body:'null'}));
 if(opts.init)await ctx.addInitScript(opts.init);const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))p.errs.push('console: '+m.text().slice(0,200));});
 await p.goto(url,{waitUntil:'load'});await p.waitForTimeout(opts.wait||3500);return {b,p,ctx};}
const dlg='.pb-modal-overlay,[role=dialog],[role=alertdialog]';
module.exports={boot,co,mgr,F,URL,
 modal:(p)=>p.evaluate((dlg)=>{const d=[...document.querySelectorAll(dlg)].find(x=>x.offsetParent&&x.innerText.trim());return d?d.innerText.replace(/\s+/g,' ').slice(0,600):null;},dlg),
 modalClick:async(p,t)=>{await p.evaluate(([dlg,t])=>{const ds=[...document.querySelectorAll(dlg)].filter(x=>x.offsetParent&&x.innerText.trim());for(const d of ds){const b=[...d.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()===t);if(b){b.click();return;}}throw new Error('no modal button '+t);},[dlg,t]);await p.waitForTimeout(500);},
 scr:(p)=>p.evaluate(()=>{const s=[...document.querySelectorAll('[id^=screen-]')].find(x=>x.offsetParent);return s&&s.id;}),
 txt:(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?e.innerText.replace(/\s+/g,' ').trim():null;},sel),
 ovf:(p)=>p.evaluate(()=>{const w=document.documentElement.clientWidth;const bad=[];document.querySelectorAll('body *').forEach(e=>{if(!e.offsetParent)return;const r=e.getBoundingClientRect();if(r.width>0&&r.height>0&&(r.right>w+2||r.left<-2)){let a=e.parentElement,hid=false;while(a&&a!==document.body){const cs=getComputedStyle(a);if(/(auto|scroll|hidden|clip)/.test(cs.overflowX)){hid=true;break;}a=a.parentElement;}if(!hid)bad.push((e.id||String(e.className).slice(0,30)||e.tagName)+':'+Math.round(r.left)+'-'+Math.round(r.right));}});return bad.slice(0,8);}),
};
