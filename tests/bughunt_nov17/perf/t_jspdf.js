// patch 04 test: jsPDF is not run at start-up; the run report PDF (tables + text) comes out the same, offline too.
// usage: node t_jspdf.js <page, e.g. p04.html>   (compares with index.html)
const P=require('./perf');const L=require(__dirname+'/../offline/rig/lib');const fs=require('fs');const cp=require('child_process');
const PG=process.argv[2]||'p04.html';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
async function run(pg){const {b,ctx}=await P.launch({sw:false});const p=await P.page(ctx,1);await P.open(p,P.ORIGIN+'/'+pg);await p.waitForTimeout(2500);
 const lazy=await p.evaluate(()=>{const d=Object.getOwnPropertyDescriptor(window,'jspdf');return !!(d&&d.get);});
 await L.newRun(p,450);await L.lock(p);const r=await L.rows(p);await L.markLaid(p,r[6]);
 await ctx.setOffline(true);
 await p.evaluate(()=>{const J=window.jspdf.jsPDF;J.API.save=function(){window.__pdf=this;return this;};});
 await p.evaluate(()=>window.pbArchiveTap('pbDownloadArchivePDF',window.__pbRrDebug.run().id));
 for(let i=0;i<60&&!(await p.evaluate(()=>!!window.__pdf));i++)await p.waitForTimeout(250);
 const b64=await p.evaluate(()=>{if(!window.__pdf)return null;const a=new Uint8Array(window.__pdf.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 const f=((process.env.PB_OUT||'/tmp/claude-0/audit/perf/tests')+'/')+pg+'.pdf';let txt='';if(b64){fs.writeFileSync(f,Buffer.from(b64,'base64'));txt=cp.execSync('pdftotext -layout '+f+' -').toString();}
 const errs=p.errs.slice(0,3);await b.close();return {lazy,txt,errs};}
(async()=>{const a=await run('index.html'),c=await run(PG);
 const norm=t=>t.replace(/\d{1,2}:\d\d(:\d\d)?\s?(AM|PM)?/g,'T').replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g,'D').replace(/\b(Nov|November)\s+\d+,?\s*\d*/g,'D').replace(/\b1[67]\d{11}\b/g,'ID').replace(/PB-[A-Z0-9-]+/g,'REF').replace(/[0-9a-f]{8,}/g,'H').split('\n').map(l=>l.replace(/\s+/g,' ').trim()).filter(Boolean);
 ok(!a.lazy&&c.lazy,'start-up: jsPDF waits for first use (before: '+a.lazy+', after: '+c.lazy+')');
 ok(c.txt.length>500,'offline run report PDF made after the change ('+c.txt.length+' chars)');
 const A=norm(a.txt),C=norm(c.txt);const d=A.filter((l,i)=>l!==C[i]);ok(A.length===C.length&&d.length===0,'PDF text identical to before ('+A.length+' lines, '+d.length+' differ)');if(d.length)console.log(d.slice(0,5),C.filter((l,i)=>l!==A[i]).slice(0,5));
 ok(!c.errs.length,'no page errors '+JSON.stringify(c.errs));process.exit(fails?1:0);})();
