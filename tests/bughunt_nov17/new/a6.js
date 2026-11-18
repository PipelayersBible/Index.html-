const mk=require('./mk');
const unit=process.argv[2]||'architect';
(async()=>{const {b,p,H,rowMenu,dists}=await mk({noReading:unit==='lenker',arch:unit==='architect',pre:async(p)=>{await p.evaluate(()=>{document.getElementById('runSecMore').open=true;});/* r16.95: rod is under More settings */await p.click('#rodToggle button[data-val="'+unit+'"]');await p.waitForTimeout(300);}});
 await p.setViewportSize({width:390,height:800});
 console.log('screen',await H.screen().catch(()=>null),'rows',dists.length);
 const info=await p.evaluate(()=>{const e=window.__pbCsEntry();return e?{unit:e.rodUnit,rows:e.intervalRows.slice(0,4).map(r=>[r.station,r.top,r.bop,r.inv])}:null;});console.log(JSON.stringify(info));
 if(!info){console.log(JSON.stringify(await H.modal()));await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/bughunt/new/t')+'/a6.png')});await b.close();return;}
 await p.evaluate(()=>window.pbCsOpen(3));await p.waitForTimeout(500);
 console.log(await p.evaluate(()=>document.querySelector('#pbCsSheet .pb-help').textContent));
 console.log('label:',await p.evaluate(()=>document.querySelector('#pbCsSheet label').textContent));
 const tryv=async(v,ref)=>{if(ref)await p.click('#pbCsRefs [data-ref="'+ref+'"]');await p.fill('#pbCsRod',v);return v+' ['+(ref||'')+'] -> '+await p.evaluate(()=>document.getElementById('pbCsOut').textContent);};
 const row=info.rows[3];
 for(const v of [row[3],row[1],'7-10','7\' 10 1/4"','7.86','7-10-1/4','94"','99.90','99.95','-1.5']) console.log(await tryv(v,'inv'));
 console.log(await tryv(row[1],'top'));console.log(await tryv(row[2],'bop'));
 await p.screenshot({path:((process.env.PB_OUT||'/tmp/claude-0/bughunt/new/t')+'/cs_')+unit+'.png'});
 // save one off-grade
 await p.click('#pbCsRefs [data-ref="inv"]');
 const t=await p.evaluate(()=>{const e=window.__pbCsEntry();return pbCsParse(e.intervalRows[3].inv);});
 await p.fill('#pbCsRod',unit==='architect'?"7' 10 1/4\"":String((t+0.05).toFixed(2)));console.log('live',await p.evaluate(()=>document.getElementById('pbCsOut').textContent));
 await p.click('#pbCsSave');await p.waitForTimeout(900);console.log('saved:',JSON.stringify(await H.modal()));await H.modalClick('OK').catch(()=>{});
 console.log('stored',JSON.stringify(await p.evaluate(()=>window.__pbCsEntry().checkShots)));
 await rowMenu(dists[6]);console.log('menu:',JSON.stringify((await H.modal()||'').slice(0,300)));await H.modalClick('Close').catch(()=>{});
 await p.evaluate(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;return this;};});await p.evaluate(()=>window.pbDownloadArchivePDF(0));await p.waitForTimeout(6000);
 const b64=await p.evaluate(()=>{const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});require('fs').writeFileSync(((process.env.PB_OUT||'/tmp/claude-0/bughunt/new/t')+'/cs_')+unit+'.pdf',Buffer.from(b64,'base64'));
 console.log(require('child_process').execSync(('pdftotext -layout '+(process.env.PB_OUT||'/tmp/claude-0/bughunt/new/t')+'/cs_')+unit+'.pdf - | grep -B2 -A8 "Check shots (" | head -30').toString());
 console.log('errs',p.errs.slice(0,5));await b.close();})();
