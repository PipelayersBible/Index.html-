const F=require('./flow');
const L={};
L.newRun=async(p,dist=100,job='24-017')=>{
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(500);
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 await p.evaluate(()=>{const lr=[...document.querySelectorAll('#screen-input button')].find(b=>b.textContent.trim()==="Engineer's Rod");lr&&lr.click();});
 const f=async(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);if(!e)return;e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[id,String(v)]);
 await f('saJobNumber',job);await f('saJobsite','Test Sewer');
 await f('runBedding',0.5);await f('runTrenchWidth',3);await f('runWT',0.08);
 await p.evaluate(()=>{const e=document.getElementById('runIdSel');e.value=[...e.options].find(o=>o.text.trim()==='8"').value;e.dispatchEvent(new Event('change',{bubbles:true}));});
 await f('startStakeElev',100);await f('startCutFillVal',5);await f('startStakeReading',4.8);
 await f('endStakeElev',99);await f('endCutFillVal',5);await f('endStakeReading',5.8);
 await f('totalDist',dist);await f('interval',10);
 await p.waitForTimeout(400);
 await p.getByText('Review & Calculate',{exact:true}).click();await p.waitForTimeout(1500);
};
L.modalText=(p)=>F(p).modal();
L.clearModals=async(p,prefer=['Lock Without It','I Checked Them','Use It','Got It','OK','Close'])=>{const H=F(p);for(let i=0;i<6;i++){const m=await H.modal();if(!m)return;const bs=await H.modalBtns();const c=prefer.find(x=>bs.includes(x));if(!c){console.log('MODAL?',m.slice(0,200),bs);return;}await H.modalClick(c);await p.waitForTimeout(400);}};
L.lock=async(p)=>{const H=F(p);await H.click('Lock This Run');await p.waitForTimeout(900);
 for(let i=0;i<6;i++){const m=await H.modal();if(!m)break;const bs=await H.modalBtns();
  if(/Which Job/.test(m)){await p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');const i=d.querySelector('input');if(i){i.value='24-017';i.dispatchEvent(new Event('input',{bubbles:true}));}});}
  const c=['Lock Without It','I Checked Them','Use It','Lock','Got It','OK'].find(x=>bs.includes(x));if(!c){console.log('LOCK MODAL?',m.slice(0,200),bs);break;}await H.modalClick(c);await p.waitForTimeout(700);}
 await p.waitForTimeout(1500);};
L.rows=(p)=>p.evaluate(()=>[...document.querySelectorAll('#screen-results [aria-label^="Distance "]')].map(e=>e.getAttribute('aria-label').split(' ')[1]));
L.markLaid=async(p,d)=>{const H=F(p);await p.evaluate(d=>{const e=[...document.querySelectorAll('#screen-results [aria-label]')].find(e=>e.getAttribute('aria-label').startsWith('Distance '+d+' '));e.click();},d);await p.waitForTimeout(500);await H.modalClick('Mark laid to here (and the rows before)');await p.waitForTimeout(500);};
L.entry=(p)=>p.evaluate(()=>{const e=window.__pbCsEntry&&window.__pbCsEntry();return e?{id:e.id,laid:e.laid,onBreak:e.onBreak,breaks:e.breaks,completed:e.completed,incomplete:e.incomplete,runEndTime:e.runEndTime}:null;});
module.exports=L;
