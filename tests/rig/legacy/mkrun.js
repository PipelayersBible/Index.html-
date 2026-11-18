// create and lock a 100 ft run with 10 ft rows
module.exports=async function mkrun(p,dist=100){
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1200);
 await p.evaluate(()=>{const lr=[...document.querySelectorAll('#screen-input button')].find(b=>b.textContent.trim()==="Engineer's Rod");lr&&lr.click();});
 const f=async(id,v)=>p.evaluate(([id,v])=>{const e=document.getElementById(id);e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},[id,String(v)]);
 await f('runBedding',0.5);await f('runTrenchWidth',3);await f('runWT',0.08);
 await p.evaluate(()=>{const e=document.getElementById('runIdSel');e.value=[...e.options].find(o=>o.text.trim()==='8"').value;e.dispatchEvent(new Event('change',{bubbles:true}));});
 await f('startStakeElev',100);await f('startCutFillVal',5);await f('startStakeReading',4.8);
 await f('endStakeElev',99);await f('endCutFillVal',5);await f('endStakeReading',5.8);
 await f('totalDist',dist);await f('interval',10);
 await p.waitForTimeout(500);
 await p.getByText('Review & Calculate',{exact:true}).click();await p.waitForTimeout(1500);
};
module.exports.lock=async function(p){
 await p.getByText('Lock This Run',{exact:true}).click();await p.waitForTimeout(1500);
 for(let i=0;i<5;i++){const m=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,.pb-modal,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?d.innerText.slice(0,300):null;});
  if(!m)break;console.log('MODAL:',m.replace(/\s+/g,' '));
  const btns=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,.pb-modal,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return [...d.querySelectorAll('button')].map(b=>b.textContent.trim());});
  console.log('BTNS',btns);return;}
};
