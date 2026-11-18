const L=require('./lib');const mkrun=require('/home/claude/rig/mkrun');const fs=require('fs');
(async()=>{const {b,p,H}=await L({file:process.env.FILE||'cur.html',init:require('/home/claude/rig/co_fm.js'),extra:`;window.__sub=[];window.__rpcOverride.pb_daily_submit=(a)=>{window.__sub.push(a);if(window.__subFail)return window.__subFail(a);return {ok:true,id:'srv-'+window.__sub.length,version:window.__sub.length,received_at:new Date().toISOString(),server_sha256:a.p_sha256};};`});
 p.on('console',m=>{if(m.type()==='error'&&!/run sync failed/.test(m.text()))console.log('CONSOLE',m.text().slice(0,300));});
 const D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 await mkrun(p,100);
 await p.evaluate(()=>{const s=(id,v)=>{const e=document.getElementById(id);if(e){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}};s('saJobNumber','24-017');s('saJobsite','Test Sewer');});
 await mkrun.lock(p);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);}
 const sign=async(narr,reason)=>{await p.evaluate(([n,r])=>{document.getElementById('drNarrative').value=n;document.getElementById('drName').value='Tommy Fontaine';const a=document.getElementById('drAmendReason');if(a&&r)a.value=r;},[narr,reason]);
  await p.evaluate(()=>window.pbDlySign());await p.waitForTimeout(2500);
  console.log(' status:',await p.evaluate(()=>document.getElementById('drSignStatus').textContent));
  for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(2500);}};
 await p.evaluate(()=>window.pbOpenDailyReport({tab:'report'}));await p.waitForTimeout(4000);
 await sign('Laid pipe');
 console.log('reports',JSON.stringify(await D('pbDly.st.reports.map(r=>({state:r.state,v:r.version,sid:r.serverId,why:r.why,prev:r.prevCid&&1,am:r.amendReason}))')));
 // amendment 1
 await p.evaluate(()=>window.pbDlyAmendStart());await p.waitForTimeout(3500);
 console.log('amend view',JSON.stringify(await D('pbDlyView.amend')),'narr:',await p.evaluate(()=>document.getElementById('drNarrative').value));
 await sign('Laid pipe, corrected','Hours fixed');
 console.log('reports',JSON.stringify(await D('pbDly.st.reports.map(r=>({state:r.state,v:r.version,sid:r.serverId,why:r.why,prev:r.prevCid&&1,am:r.amendReason}))')));
 const sub=await p.evaluate(()=>window.__sub.map(a=>({sup:a.p_supersedes,reason:a.p_amend_reason,am:a.p_snapshot.amendment,narr:a.p_snapshot.narrative,crew:a.p_snapshot.crew_today&&a.p_snapshot.crew_today.people})));console.log('subs',JSON.stringify(sub));
 // amendment 2 while offline-ish (server refuses with retry)
 await p.evaluate(()=>{window.__subFail=()=>{throw new Error('Failed to fetch');};});
 await p.evaluate(()=>window.pbDlyAmendStart());await p.waitForTimeout(3500);
 console.log('amend2 view',JSON.stringify(await D('pbDlyView.amend')));
 await sign('Third','Again');
 console.log('reports',JSON.stringify(await D('pbDly.st.reports.map(r=>({state:r.state,v:r.version,sid:r.serverId,why:r.why,prev:r.prevCid&&1,am:r.amendReason,snapv:r.snapshot.amendment&&r.snapshot.amendment.version}))')));
 // amendment 3 on top of waiting amendment 2
 await p.evaluate(()=>window.pbDlyAmendStart());await p.waitForTimeout(3500);
 console.log('amend3 view',JSON.stringify(await D('pbDlyView.amend')));
 await sign('Fourth','Again2');
 console.log('reports',JSON.stringify(await D('pbDly.st.reports.map(r=>({state:r.state,v:r.version,sid:r.serverId,why:(r.why||"").slice(0,60),am:r.amendReason,snapv:r.snapshot.amendment&&r.snapshot.amendment.version}))')));
 await p.evaluate(()=>{window.__subFail=null;});await D('pbDlySync()');await p.waitForTimeout(4000);
 console.log('reports',JSON.stringify(await D('pbDly.st.reports.map(r=>({state:r.state,v:r.version,sid:r.serverId,why:(r.why||"").slice(0,60),am:r.amendReason,snapv:r.snapshot.amendment&&r.snapshot.amendment.version}))')));
 console.log('subs',JSON.stringify(await p.evaluate(()=>window.__sub.map(a=>({sup:a.p_supersedes,am:a.p_snapshot.amendment&&a.p_snapshot.amendment.version})))));
 console.log(await p.evaluate(()=>document.getElementById('drBody').innerText.slice(0,900)));
 // PDF of latest
 await p.evaluate(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;window.__pdfName=n;return this;};});
 const cid=await D('pbDly.st.reports[pbDly.st.reports.length-1].cid');await p.evaluate(c=>window.pbDlyLocalPdf(c),cid);await p.waitForTimeout(7000);
 const b64=await p.evaluate(()=>{if(!window.__pdfDoc)return null;const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 if(b64){fs.writeFileSync('d3.pdf',Buffer.from(b64,'base64'));console.log('pdf name',await p.evaluate(()=>window.__pdfName));}else console.log('NO PDF',await H.modal());
 console.log('errs',p.errs);await b.close();})();
