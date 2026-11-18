const boot=require('/home/claude/rig/boot');const co=require('/tmp/claude-0/feat/onboard/tests/rig_local/co');const fs=require('fs');
const snap=fs.readFileSync('/tmp/claude-0/fx/daily.json','utf8');
// a tiny real JPEG (1x1) for photos and a 1x1 PNG for the signature
const JPG='/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
(async()=>{const {b,p}=await boot('http://127.0.0.1:8878/index.html',{init:co+`;(()=>{const S=${snap};const base={ok:true,client_report_id:'c1',job_number:'26014',jobsite:'Test Sewer',work_date:'2026-10-30',foreman:'Brandon Jones',signed_name:'Brandon Jones',signed_at:'2026-10-31T15:10:44.910Z',signed_tz:'America/Los_Angeles',signature_png_b64:'${PNG}',snapshot:S,snapshot_sha256:'abc',server_sha256:'abc',sha_matches:true};
 window.__rpcOverride.pb_daily_get=(a)=>a.p_report_id==='r2'?Object.assign({},base,{id:'r2',version:2,supersedes:'r1',amend_reason:'Fixed hours',received_at:'2026-10-31T16:00:00Z',phone_clock_ahead_s:-400}):Object.assign({},base,{id:'r1',version:1,supersedes:null,received_at:'2026-10-31T15:11:00Z',phone_clock_ahead_s:3});
 window.__rpcOverride.pb_daily_report_photo=()=>({ok:true,b64:'${JPG}'});window.__rpcOverride.pb_daily_report_event_photo=()=>({ok:true,b64:'${JPG}'});
 window.__rpcOverride.pb_daily_attach_list=()=>({ok:true,items:[]});
})();`});
 await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.pbDlyCanAsk=async()=>true;});
 await p.evaluate(()=>window.__pbRpfDebug.openDaily('r2'));
 for(let i=0;i<30;i++){await p.waitForTimeout(1000);const ok=await p.evaluate(()=>{const b=document.getElementById('pdfvExport');return b&&b.style.display!=='none'&&!b.disabled;});if(ok)break;}
 console.log('export btn:',await p.evaluate(()=>{const b=document.getElementById('pdfvExport');return b?{shown:b.style.display!=='none',dis:b.disabled}:null;}));
 const zip=await p.evaluate(async()=>{let blob=null;const oc=URL.createObjectURL;URL.createObjectURL=(x)=>{blob=x;return oc(x);};await window.pbPdfViewExport();await new Promise(r=>setTimeout(r,500));URL.createObjectURL=oc;
   if(!blob)return null;const a=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 if(zip){fs.writeFileSync('/tmp/claude-0/export111.zip',Buffer.from(zip,'base64'));console.log(require('child_process').execSync('cd /tmp/claude-0 && rm -rf ex111 && mkdir ex111 && cd ex111 && unzip -q ../export111.zip && ls -R && head -12 MANIFEST.txt && grep -n "^4\\\\.\\\\|^9\\\\.\\\\|^10\\\\." CUSTODIAN-CERTIFICATE-draft.txt').toString());}else console.log('no zip');
 const m=await p.evaluate(()=>{const t=document.querySelector('.pb-modal-title, #pbModalTitle');const b=document.querySelector('.pb-modal-body, #pbModalBody, .pb-modal p');return (t?t.textContent:'')+' | '+(b?b.textContent:'');});console.log('modal:',m.slice(0,220));
 console.log('errs',p.errs.slice(0,3));await b.close();})();
