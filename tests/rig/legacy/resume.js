const mkrun=require('./mkrun');
module.exports.modal=async function(p,pick){for(let i=0;i<8;i++){const btns=await p.evaluate(()=>{const d=[...document.querySelectorAll('.pb-modal-overlay,.pb-modal,[role=dialog],[role=alertdialog]')].find(x=>x.offsetParent&&x.innerText.trim());return d?[d.innerText.replace(/\s+/g,' ').slice(0,200),[...d.querySelectorAll('button')].map(b=>b.textContent.trim())]:null;});
 if(!btns)break;console.log('MODAL',JSON.stringify(btns));const last=(pick&&btns[1].includes(pick))?pick:btns[1][btns[1].length-1];await p.locator('button',{hasText:last}).last().click();await p.waitForTimeout(1000);}};
module.exports.dump=(p)=>p.evaluate(()=>{const U='00000000-0000-4000-8000-000000000001:';const a=JSON.parse(localStorage.getItem(U+'runArchive')||'[]');return a.filter(x=>x.kind==='run');});
module.exports.endShort=async function(p,ft){await p.evaluate(()=>window.pbToggleEndIncomplete());await p.waitForTimeout(400);
 await p.evaluate((ft)=>{const s=document.getElementById('endIncompleteStation');s.value=[...s.options].find(o=>o.getAttribute('data-station-ft')===String(ft)).value;},ft);
 await p.evaluate(()=>window.pbEndRunIncomplete());await p.waitForTimeout(1200);await module.exports.modal(p);};
