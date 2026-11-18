const L=require('./lib');const fs=require('fs');(async()=>{const {b,p,H}=await L({file:process.env.FILE||'cur.html'});
 const D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 await H.lock({cpJobNumber:'24-017',cpAtmoInterval:'15',cpCommInterval:'10',cpMaxCO:'35',cpMinO2:'20'});
 for(let i=0;i<3;i++){const m=await H.modal();if(!m)break;console.log('M',m.slice(0,150));const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(600);}
 console.log('screen',await H.screen(),JSON.stringify(await D('({min:confinedPermit.minO2,co:confinedPermit.maxCO})')));
 console.log(JSON.stringify(await H.read(20,10,10,35)).slice(0,160));
 console.log(JSON.stringify(await H.read(19.99,0,null,null)).slice(0,200));
 console.log(JSON.stringify(await H.read(20.9,0,null,35.1)).slice(0,200));
 console.log(JSON.stringify(await H.read(20.9,0,null,null)).slice(0,200));
 console.log(JSON.stringify(await H.read(20.9,0,0,0)).slice(0,200));
 await p.evaluate(()=>{document.getElementById('cpRosterName').value='Ed Entrant';document.getElementById('cpRosterRole').value='Entrant';return pbAddRosterPerson();});await p.waitForTimeout(600);
 await p.evaluate(()=>pbToggleRosterStatus(2));await p.waitForTimeout(900);
 console.log('in modal',await H.modal());
 console.log('roster',JSON.stringify(await D('confinedRoster.map(r=>[r.name,r.status])')),'timers',await p.evaluate(()=>[document.getElementById('cpAtmoCountdown').textContent,document.getElementById('cpCommCountdown').textContent]));
 await p.evaluate(()=>pbCloseConfinedPermit());await p.waitForTimeout(900);
 for(let i=0;i<5;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('CLOSE M',m.slice(0,300),bt);await H.modalClick(bt[0]);await p.waitForTimeout(700);}
 console.log('still open',await D('!!confinedPermit'));
 await p.evaluate(()=>pbToggleRosterStatus(2));await p.waitForTimeout(900);console.log('out modal',await H.modal());
 await p.evaluate(()=>pbCloseConfinedPermit());await p.waitForTimeout(900);
 for(let i=0;i<5;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('CLOSE M',m.slice(0,300),bt);await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(700);}
 console.log('open after',await D('!!confinedPermit'));
 await p.evaluate(()=>{const J=window.jspdf.jsPDF;J.API.save=function(n){window.__pdfDoc=this;window.__pdfName=n;return this;};});
 await p.evaluate(()=>window.pbDownloadArchivePDF(0));await p.waitForTimeout(6000);
 const b64=await p.evaluate(()=>{if(!window.__pdfDoc)return null;const a=new Uint8Array(window.__pdfDoc.output('arraybuffer'));let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);});
 if(b64){fs.writeFileSync('p5.pdf',Buffer.from(b64,'base64'));}else console.log('NO PDF',await H.modal());
 console.log('errs',p.errs);await b.close();})();
