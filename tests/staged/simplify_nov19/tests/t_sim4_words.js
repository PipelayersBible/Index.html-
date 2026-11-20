// simplify 05: "sync" is "send / sent" on Home, My production and Field tickets. Words only.
const L=require('./_lib');const {ok}=L;
const grab=async(url)=>{const {b,p}=await L.start(url);const o={};
 o.home=await p.evaluate(()=>document.getElementById('homeProdMineSub').textContent);
 await p.click('#homeProdMine');await p.waitForTimeout(1200);o.prod=await p.evaluate(()=>document.getElementById('screen-prodMine').innerText.replace(/\s+/g,' '));
 o.btn=await p.evaluate(()=>document.getElementById('pmSyncBtn').textContent.trim());o.warn=await p.evaluate(()=>document.getElementById('pmFailWarn').textContent);
 await p.evaluate(()=>pbGoto('tickets'));await p.waitForTimeout(1000);o.tk=await p.evaluate(()=>document.getElementById('screen-tickets').innerText.replace(/\s+/g,' '));
 o.errs=p.errs.slice();await b.close();return o;};
(async()=>{const a=await grab(L.BASE),c=await grab(L.CUR);
 console.log('Home, My production line: "'+a.home+'" -> "'+c.home+'"');console.log('My production button: "'+a.btn+'" -> "'+c.btn+'"');
 ok(/sync state/.test(a.home)&&c.home==='What you logged, and what’s sent','Home line reworded');
 ok(a.btn==='Sync Now'&&c.btn==='Send Now','button: Send Now');
 ok(/^Sync paused/.test(a.warn)&&/^Sending paused/.test(c.warn)&&/safe on this phone/.test(c.warn),'paused warning reworded, still says the runs are safe on this phone');
 ok(/sync/i.test(a.home+a.prod+a.btn)&&!/sync/i.test(c.home+c.prod+c.btn+c.warn),'no "sync" left on Home line / My production (before: yes)');
 ok(!/sync/i.test(c.tk),'no "sync" on Field tickets: "'+c.tk.slice(0,140)+'"');
 const strip=s=>s.replace(/Updated [^.]*\./g,'').replace(/\d{1,2}:\d\d(:\d\d)? ?[AP]M/g,'');
 const map=s=>strip(s).replace(/not synced yet/g,'not sent yet').replace('All production synced.','All production sent.').replace('Sync Now','Send Now').replace('Field tickets: all synced','Field tickets: all sent').replace('Your jobs show here once your production has synced.','Your jobs show here once your production is sent.').replace('Sign in to sync production','Log in to send production');
 ok(map(a.prod)===strip(c.prod),'My production: nothing else changed');if(map(a.prod)!==strip(c.prod)){console.log(' before:',a.prod.slice(0,600));console.log(' after: ',c.prod.slice(0,600));}
 ok(c.errs.length===0,'no page errors');await L.done({close:async()=>{}});
})();
