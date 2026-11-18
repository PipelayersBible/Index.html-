// daily export harness: node exp.js <case>; prints certificate lines + file list
const boot=require('/home/claude/rig/boot');const co=require('/home/claude/rig/co');const fs=require('fs');
const snap=fs.readFileSync('/tmp/claude-0/fx/daily.json','utf8');
const JPG='/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=';
const PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
module.exports=async function(CASE){
 const {b,p}=await boot('http://127.0.0.1:8861/'+(process.env.PG||'cur.html'),{init:co+`;(()=>{const CASE='${CASE}';const S=${snap};const base={ok:true,client_report_id:'c1',job_number:'26014',jobsite:'Test Sewer',work_date:'2026-10-30',foreman:'Brandon Jones',signed_name:'Brandon Jones',signed_at:'2026-10-31T15:10:44.910Z',signed_tz:'America/Los_Angeles',signature_png_b64:CASE==='nosig'?null:'${PNG}',snapshot:S,snapshot_sha256:'abc',server_sha256:CASE==='oldhash'?null:'abc',sha_matches:true};
 let calls=0;
 window.__rpcOverride.pb_daily_get=(a)=>{calls++;
   if(CASE==='many'){const n=Number(String(a.p_report_id).slice(1));return Object.assign({},base,{id:'r'+n,version:n,supersedes:n>1?'r'+(n-1):null,received_at:'2026-10-31T16:00:00Z',phone_clock_ahead_s:3});}
   if(a.p_report_id==='r2')return Object.assign({},base,{id:'r2',version:2,supersedes:'r1',amend_reason:'Fixed hours',received_at:'2026-10-31T16:00:00Z',phone_clock_ahead_s:-400});
   if(CASE==='chainfail'&&calls>1)return {ok:false,code:'pb:busy'};
   return Object.assign({},base,{id:'r1',version:1,supersedes:null,received_at:'2026-10-31T15:11:00Z',phone_clock_ahead_s:3});};
 window.__rpcOverride.pb_daily_report_photo=()=>CASE==='photofail'?({ok:false}):({ok:true,b64:'${JPG}'});window.__rpcOverride.pb_daily_report_event_photo=()=>CASE==='photofail'?({ok:false}):({ok:true,b64:'${JPG}'});
 window.__rpcOverride.pb_daily_attach_list=()=>({ok:true,items:[]});
})();`});
 await p.waitForTimeout(1500);
 await p.evaluate(()=>{window.pbDlyCanAsk=async()=>true;});
 await p.evaluate((c)=>window.__pbRpfDebug.openDaily(c==='many'?'r40':'r2'),CASE);
 for(let i=0;i<30;i++){await p.waitForTimeout(1000);const ok=await p.evaluate(()=>{const b=document.getElementById('pdfvExport');return b&&b.style.display!=='none'&&!b.disabled;});if(ok)break;}
 if(CASE==='chainfail')await p.evaluate(()=>{const o=window.__rpcOverride.pb_daily_get;let n=0;window.__rpcOverride.pb_daily_get=(a)=>{n++;return n>1?{ok:false,code:'pb:busy'}:o(a);};});
 const zip=await p.evaluate(async()=>{let blob=null;const oc=URL.createObjectURL;URL.createObjectURL=(x)=>{blob=x;return oc(x);};await window.pbPdfViewExport();await new Promise(r=>setTimeout(r,500));URL.createObjectURL=oc;
   if(!blob)return null;const a=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 const out={zip:!!zip,files:'',cert:'',manifest:''};
 if(zip){const d='/tmp/claude-0/bughunt/new/t/ex_'+CASE;require('child_process').execSync('rm -rf '+d+' && mkdir -p '+d);fs.writeFileSync(d+'/x.zip',Buffer.from(zip,'base64'));require('child_process').execSync('cd '+d+' && unzip -q x.zip');
   out.files=require('child_process').execSync('cd '+d+' && find . -type f | sort | grep -v x.zip').toString().trim().split('\n');out.cert=fs.readFileSync(d+'/CUSTODIAN-CERTIFICATE-draft.txt','utf8');out.manifest=fs.readFileSync(d+'/MANIFEST.txt','utf8');}
 out.modal=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?d.innerText.replace(/\s+/g,' ').slice(0,300):null;});
 out.errs=p.errs.slice(0,3);await b.close();return out;};
if(require.main===module)(async()=>{const o=await module.exports(process.argv[2]||'base');console.log('files',o.files.length,o.files.slice(0,12).join(' '));console.log(o.cert.split('\n').filter(l=>/^(4|9|10)\. /.test(l)).join('\n'));console.log(o.manifest.split('\n').slice(3,8).join('\n').slice(0,900));console.log('modal',o.modal,'errs',o.errs);})();
