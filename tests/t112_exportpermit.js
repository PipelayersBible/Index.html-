const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const fs=require('fs');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/cur.html',{init:co+`;(()=>{const R=(v)=>({kind:'confined',id:'cp1',space:'MH-4 Wet Well',jobsite:'Test Sewer',jobNumber:'26014',lockTime:'2026-11-10T22:00:00Z',reportText:'CONFINED SPACE PERMIT v'+v,permit:{supervisor:'Brandon Jones',attendant:'Mike Smith',entrants:['Operator 1'],issuedAt:'2026-11-10T15:00:00Z',readings:[]}});
 window.__rpcOverride.pb_reports_permit=()=>({ok:true,row_id:'perm-1',client_permit_id:'cps-1',space:'MH-4 Wet Well',jobsite:'Test Sewer',job_number:'26014',closed_at:'2026-11-10T22:01:00Z',version:2,record:R(2)});
 window.__rpcOverride.pb_reports_permit_versions=(a)=>({ok:true,row_id:a.p_id,space:'MH-4 Wet Well',jobsite:'Test Sewer',job_number:'26014',closed_at:'2026-11-10T22:01:00Z',first_backed_up_at:'2026-11-10T15:05:00Z',versions:[{version:1,received_at:'2026-11-10T15:05:00Z',record_sha256:'s1',record:R(1)},{version:2,received_at:'2026-11-10T22:01:00Z',record_sha256:'s2',record:R(2)}]});
})();`});
 await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.pbDlyCanAsk=async()=>true;});
 await p.evaluate(()=>window.__pbRpfDebug.openPermit({id:'perm-1'}));
 for(let i=0;i<20;i++){await p.waitForTimeout(800);const ok=await p.evaluate(()=>{const b=document.getElementById('pdfvExport');return b&&b.style.display!=='none'&&!b.disabled;});if(ok)break;}
 console.log('export btn:',await p.evaluate(()=>{const b=document.getElementById('pdfvExport');return b?{shown:b.style.display!=='none',dis:b.disabled}:null;}));
 const zip=await p.evaluate(async()=>{let blob=null;const oc=URL.createObjectURL;URL.createObjectURL=(x)=>{blob=x;return oc(x);};await window.pbPdfViewExport();await new Promise(r=>setTimeout(r,500));URL.createObjectURL=oc;
   if(!blob)return null;const a=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 if(zip){fs.writeFileSync('/tmp/claude-0/export112.zip',Buffer.from(zip,'base64'));console.log(require('child_process').execSync('cd /tmp/claude-0 && rm -rf ex112 && mkdir ex112 && cd ex112 && unzip -q ../export112.zip && ls -R && head -9 MANIFEST.txt && grep -n "^4\\\\.\\\\|^9\\\\." CUSTODIAN-CERTIFICATE-draft.txt && pdftotext permit.pdf - | head -5').toString());}else console.log('no zip');
 // a run report viewer has no export button
 await p.evaluate(()=>window.pbPdfViewOpen({key:'x',entry:{kind:'report',reportText:'x'},make:async()=>{const J=window.jspdf.jsPDF;return new J();}}));await p.waitForTimeout(800);
 console.log('plain viewer export shown:',await p.evaluate(()=>document.getElementById('pdfvExport').style.display!=='none'));
 console.log('errs',p.errs.slice(0,3));await b.close();})();
