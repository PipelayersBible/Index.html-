// Daily Materials: an ended-early session's volume must not be called a whole-run figure. FAIL r16.97, PASS patched.
// Daily report built from real records on the phone (the messy ended-early + resumed run, the permit), signed, PDF.
const P=require('./plib');const fs=require('fs');const F=require(__dirname+'/../../rig/flow');const OUT=__dirname+'/../../bughunt_nov17/pdfs/fixtures/';
(async()=>{const T=await P.open(require(__dirname+'/../../rig/co_fm.js')+`;window.__sub=[];window.__rpcOverride.pb_daily_submit=(a)=>{window.__sub.push(a);return {ok:true,id:'srv-'+window.__sub.length,version:window.__sub.length,received_at:new Date().toISOString(),server_sha256:a.p_sha256};};`);const {p}=T;const H=F(p);
 const a=JSON.parse(fs.readFileSync(OUT+'arch2b.json')).concat(JSON.parse(fs.readFileSync(OUT+'archp.json')));
 // the permit's job number = the run's, so it lands on the same daily
 a.forEach(e=>{if(e.kind==='confined'){e.jobNumber='24-017';}});
 await P.load(T,a);await T.E(()=>saveRunArchive());
 await p.evaluate(()=>window.pbOpenDailyReport({tab:'report'}));await p.waitForTimeout(5000);
 const day=await p.evaluate((t)=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');},a[0].lockTime);await p.evaluate((v)=>{const e=document.getElementById('drDate');if(e.value!==v){e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}},day);await p.waitForTimeout(5000);
 console.log('screen',await H.screen());
 0&&fs.writeFileSync(OUT+'daily_screen.txt',await p.evaluate(()=>document.getElementById('drBody')?document.getElementById('drBody').innerText:document.body.innerText));
 console.log('fields',await p.evaluate(()=>[...document.querySelectorAll('#screen-dailyReport input,#screen-dailyReport textarea,#screen-dailyReport select')].filter(e=>e.offsetParent).map(e=>e.id).join(' ')));
 await p.evaluate(()=>{document.getElementById('drNarrative').value='Laid 8" PVC from MH-1 toward MH-2. Stopped at 3+50 for the gas service conflict (SoCalGas ticket A26111700), resumed after the locate and finished to MH-2. Entered MH-4 wet well under permit; one emergency declared and resolved.';document.getElementById('drName').value='Tommy Fontaine';});
 await p.evaluate(()=>window.pbDlySign());await p.waitForTimeout(3000);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;console.log('sign modal',m.slice(0,200));const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(2500);}
 console.log(' status:',await p.evaluate(()=>{const e=document.getElementById('drSignStatus');return e&&e.textContent;}));
 await P.hook(T);const cid=await T.E(()=>pbDly.st.reports[pbDly.st.reports.length-1].cid);await p.evaluate(c=>window.pbDlyLocalPdf(c),cid);
 const r=await P.grab(T,((process.env.PB_OUT||'/tmp/claude-0/pdfout')+'/t05.pdf'));const f=P.flat(r.txt);const m=f.match(/Bedding \(calculated estimate\) 11\.11 yd³ .{0,200}/);console.log(m&&m[0]);const ok=!!m&&/to the stop point only/.test(m[0]);console.log(ok?'PASS':'FAIL');process.exitCode=ok?0:1;
 0&&fs.writeFileSync(OUT+'daily_snap.json',JSON.stringify(await T.E(()=>pbDly.st.reports[pbDly.st.reports.length-1].snapshot),null,1));
 console.log('errs',p.errs.slice(0,5));await T.b.close();})();
