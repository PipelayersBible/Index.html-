// from Home: New Run, fill, Review & Calculate, Lock -> Run Results (same steps as critic_nov19 t_cr1_pill.js)
module.exports=async function(p){
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(400);
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1300);
 for(const [id,v] of [['saJobNumber','24-017'],['startStaTxt','1+50'],['startStakeElev','103.40'],['startCutFillVal','3.61'],['startStakeReading','4.36'],['endStaTxt','4+51'],['endStakeElev','104.26'],['endCutFillVal','3.83'],['endStakeReading','3.50']]){await p.click('#'+id);await p.fill('#'+id,v);await p.keyboard.press('Tab');await p.waitForTimeout(120);}
 await p.selectOption('#runIdSel',{label:'8"'});await p.waitForTimeout(200);
 await p.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>b.offsetParent&&b.textContent.trim()==='Review & Calculate').click();});await p.waitForTimeout(1500);
 await p.evaluate(()=>pbLock());await p.waitForTimeout(900);
 for(let i=0;i<3;i++){const had=await p.evaluate(()=>{const d=document.getElementById('pbModalOverlay');if(!d||d.style.display!=='flex')return false;const bs=[...d.querySelectorAll('button')].filter(x=>x.offsetParent);bs[bs.length-1].click();return true;});if(!had)break;await p.waitForTimeout(800);}
 await p.waitForTimeout(1200);return p.evaluate(()=>!!document.getElementById('screen-results').offsetParent);};
