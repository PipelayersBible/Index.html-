// critic: (a) daily report after a run on job 24-017: is the job filled in? (b) the Home Screen sheet's heading outline (c) Quick Run full page
const R=__dirname+'/../../../rig';const boot=require(R+'/boot');const co=require(R+'/co');const F=require(R+'/flow');
const URL=process.env.PB_URL||'http://127.0.0.1:9150/cur.html';const SH=__dirname+'/../shots/';
(async()=>{const {b,p}=await boot(URL,{init:co,wait:3500});const H=F(p);await p.setViewportSize({width:390,height:664});
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 console.log('PIPELAYER NAME prefill (foreman account):',await p.evaluate(()=>{const e=[...document.querySelectorAll('#screen-input input')].find(i=>/pipelayer/i.test((i.closest('label,div')||{}).innerText||''));return e?e.id+'='+e.value:'?'}));
 await H.f('saJobNumber','24-017');await H.f('saJobsite','Wildomar Sewer Ph 2');await H.sel('runIdSel','8"');
 for(const [id,v] of [['startStaTxt','1+50'],['startStakeElev','103.40'],['startCutFillVal','3.61'],['startStakeReading','4.36'],['endStaTxt','4+51'],['endStakeElev','104.26'],['endCutFillVal','3.83'],['endStakeReading','3.50']]){await H.f(id,v).catch(e=>console.log('noid',id));}
 console.log('ids',await p.evaluate(()=>[...document.querySelectorAll('#screen-input input:not([type=file]):not([type=hidden])')].filter(e=>e.offsetParent).map(e=>e.id).join(' ')));
 await H.click('Review & Calculate');await p.waitForTimeout(1500);console.log('after review:',await H.screen(),await H.modal(),await p.evaluate(()=>[...document.querySelectorAll('#screen-input .pb-error,#screen-input [role=alert]')].filter(e=>e.offsetParent).map(e=>e.innerText.slice(0,150)).join(' || ')));await p.screenshot({path:SH+'c_review_fail.png'});
 await H.click('Lock This Run').catch(e=>console.log(e.message));await p.waitForTimeout(900);for(let i=0;i<3;i++){const bt=await H.modalBtns();if(!bt.length)break;console.log('modal',await H.modal());await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(900);}
 console.log('screen',await H.screen());
 await p.evaluate(()=>pbGoto('home'));await p.waitForTimeout(800);await p.screenshot({path:SH+'c_fm_home_running.png'});
 console.log('HOME running, New Run y:',await p.evaluate(()=>{const e=[...document.querySelectorAll('#screen-home *')].find(x=>x.children.length===0&&x.textContent.trim()==='New Run');return e?Math.round(e.getBoundingClientRect().top):null}),'viewport',664);
 await H.click('Daily report');await p.waitForTimeout(1500);
 console.log('DAILY fields',await p.evaluate(()=>[...document.querySelectorAll('#screen-dailyReport input,#screen-dailyReport select')].filter(e=>e.offsetParent).map(e=>e.id+'='+JSON.stringify(e.value)).join(' ')));
 await p.screenshot({path:SH+'c_daily_after_run.png'});
 await p.evaluate(()=>pbGoto('quickrun'));await p.waitForTimeout(700);await p.screenshot({path:SH+'c_quick_full.png',fullPage:true});
 console.log('errs',p.errs.slice(0,3));await b.close();})();
