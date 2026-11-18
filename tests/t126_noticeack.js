const boot=require(__dirname+'/rig/boot');const co=require(__dirname+'/rig/co');const F=require(__dirname+'/rig/flow');
// r16.96: the crew notice (now mentions the crew view) is recorded on the server when "Got It" is tapped; offline it waits on
// the phone and is sent on a later Home visit. Settings has an Email Support row.
(async()=>{const {b,p}=await boot((process.env.PB_URL||'http://127.0.0.1:8843/cur.html'),{init:co+";try{localStorage.removeItem('pbCrewNotice:00000000-0000-4000-8000-000000000001')}catch(e){};window.__acks=[];window.__rpcOverride=window.__rpcOverride||{};window.__rpcOverride.pb_notice_ack=(a)=>{window.__acks.push(a);return {ok:true,at:new Date().toISOString()};};"});const H=F(p);
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(3500);
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(800);await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(2500);
 const m=await p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');return d&&getComputedStyle(d).display!=='none'?d.innerText:'';});console.log('notice:',JSON.stringify(m).slice(0,80),'| crew line:',/read-only copy of the crew/.test(m));
 if(!/read-only copy of the crew/.test(m||''))p.errs.push('notice missing crew-view line');
 await p.context().setOffline(true);await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});});
 await H.modalClick('Got It');await p.waitForTimeout(800);
 const q=await p.evaluate(()=>({acks:window.__acks.length,pend:localStorage.getItem('pbCrewNoticeAck:00000000-0000-4000-8000-000000000001')}));console.log('offline:',JSON.stringify(q));
 if(q.acks!==0||!q.pend)p.errs.push('offline ack not kept');
 await p.context().setOffline(false);await p.evaluate(()=>{Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true});});
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(500);await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(2500);
 const r=await p.evaluate(()=>({acks:window.__acks,pend:localStorage.getItem('pbCrewNoticeAck:00000000-0000-4000-8000-000000000001'),again:!!document.querySelector('#pbModalOverlay')&&getComputedStyle(document.querySelector('#pbModalOverlay')).display!=='none'}));console.log('online:',JSON.stringify(r).slice(0,200));
 if(r.acks.length!==1||r.acks[0].p_notice!=='crew_notice'||r.acks[0].p_version!=='3'||r.pend)p.errs.push('ack not sent once');
 if(r.again)p.errs.push('notice shown again');
 await p.evaluate(()=>pbGoto('settings'));await p.waitForTimeout(600);
 const sup=await p.evaluate(()=>{const e=document.getElementById('settingsSupportEmail');return e?{href:e.getAttribute('href'),vis:!!e.offsetParent}:null;});console.log('support:',JSON.stringify(sup));
 if(!sup||!sup.vis||!/mailto:admin@pipelayersbible.com/.test(sup.href))p.errs.push('support row');
 console.log('errs',p.errs.slice(0,4));await b.close();})();
