// shared: boot a page (PG env = html file, default cur.html), load an archive JSON into runArchive, make a record PDF, return its text
const boot=require(__dirname+'/../../rig/boot');const co=require(__dirname+'/../../rig/co');const fs=require('fs');const cp=require('child_process');
const P=module.exports={};
P.open=async(init)=>{const {b,p}=await boot((process.env.PB_ROOT||'http://127.0.0.1:8843/')+(process.env.PG||'cur.html'),{init:init||co});const E=(fn,...a)=>p.evaluate(([s,a])=>window.__ev('('+s+')(...'+JSON.stringify(a)+')'),[fn.toString(),a]);return {b,p,E};};
P.load=async(T,arr)=>{await T.p.evaluate((s)=>{window.__arch=s;},JSON.stringify(arr));await T.E(()=>{runArchive=JSON.parse(window.__arch).map(e=>normalizeArchiveEntry({...e,lockTime:new Date(e.lockTime)}));return runArchive.length;});};
P.hook=(T)=>T.p.evaluate(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;window.__pdfName=n;return this;};window.__pdfDoc=null;});
P.grab=async(T,out)=>{const p=T.p;for(let k=0;k<60&&!(await p.evaluate(()=>!!window.__pdfDoc));k++)await p.waitForTimeout(500);
 const b64=await p.evaluate(()=>{if(!window.__pdfDoc)return null;const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 if(!b64)return {txt:'',name:null};fs.writeFileSync(out,Buffer.from(b64,'base64'));return {txt:cp.execSync('pdftotext -layout '+out+' -',{maxBuffer:1<<27}).toString(),name:await p.evaluate(()=>window.__pdfName)};};
P.recPdf=async(T,i,out)=>{await P.hook(T);await T.p.evaluate((i)=>{window.pbDownloadArchivePDF(i);},i);return P.grab(T,out);};
P.flat=(t)=>t.replace(/\s+/g,' ');
