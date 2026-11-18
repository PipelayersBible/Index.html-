const L=require('./lib');
// architect rod, a fill stake, stations running DOWN, steep slope
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');
 await p.click('#rodToggle button[data-val="architect"]');await p.waitForTimeout(400);
 await T.photo('start',S('12+45.30',2589.06,1.25,'MH-A','101','fill'));
 console.log('ids:',JSON.stringify(await T.E(()=>[...document.querySelectorAll('#pointBody-start input,#pointBody-start select')].map(e=>e.id+'='+e.value))));
 await H.f('startStakeReading_ft','4');await H.f('startStakeReading_in','3');await p.selectOption('#startStakeReading_frac','0.5');await p.waitForTimeout(700);
 await T.addHub();await T.photo('hub0',S('11+80.05',2586.40,2.33,'AP','102'),'p01');
 await T.photo('end',S('10+95.30',2581.115,3.5,'MH-B','103'),'p05');
 await p.waitForTimeout(800);
 console.log('form:',JSON.stringify(await T.form(['startStaTxt','hub0StaTxt','hub0Station','endStaTxt','totalDist','interval','runWT','startCutFill','hub0CutFill'])));
 console.log('vals:',JSON.stringify(await T.E(()=>({se:getElevVal('startStakeElev'),cf:getElevVal('startCutFillVal'),sr:getElevVal('startStakeReading'),hse:getElevVal('hub0StakeElev'),hcf:getElevVal('hub0CutFillVal'),hsr:getElevVal('hub0StakeReading'),ese:getElevVal('endStakeElev'),ecf:getElevVal('endCutFillVal')}))));
 const c=await T.calc();console.log(JSON.stringify(c).slice(0,2500));
 await T.lock();
 console.log('screen',await H.screen(),'modal',await H.modal());
 console.log('table:\n'+(await T.table()).split('\n').filter(l=>/¦|—/.test(l)).join('\n'));
 console.log('summary:',(await p.evaluate(()=>document.getElementById('summaryGrid').innerText)).replace(/\s*\n+\s*/g,' | '));
 const txt=await L.pdf(T,'/tmp/claude-0/bughunt/grade/tests/g2.pdf');require('fs').writeFileSync('/tmp/claude-0/bughunt/grade/tests/g2.txt',txt||'');console.log('pdf chars',(txt||'').length);console.log('errs',p.errs.slice(0,5));await T.b.close();})();
