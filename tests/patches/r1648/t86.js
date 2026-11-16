const boot=require('./boot');const F=require('./flow');
(async()=>{const {b,p}=await boot('http://127.0.0.1:8843/'+(process.argv[2]||'idx48d.html'));const H=F(p);
 await p.getByText('New Run',{exact:true}).click();await p.waitForTimeout(1500);
 await H.sel('runIdSel','10"');
 await H.f('startStakeElev','100');await H.f('startCutFillVal','5');await H.f('startStakeReading','4');
 await H.f('endStakeElev','101');await H.f('endCutFillVal','5');await H.f('totalDist','300');
 for(const [i,d,e] of [[0,100,100.4],[1,200,100.7]]){await p.evaluate(()=>pbAddHub());await p.waitForTimeout(200);await H.f('hub'+i+'Station',d);await H.f('hub'+i+'StakeElev',e);await H.f('hub'+i+'CutFillVal','5');}
 await p.click('#hub0FitOn');await H.sel('hub0FitType','Reducer');await p.waitForTimeout(300);
 const st=()=>p.evaluate(()=>{const g=id=>document.getElementById(id);return 'brLabel="'+g('hub0FitBrL').textContent+'" opts='+[...g('hub0FitBr').options].slice(1).map(o=>o.value).join('/')+' red='+(g('hub0RedW').style.display!=='none')+' line="'+g('hub0RedLine').textContent+'" wt='+g('hub0RedWT').value+' lay='+g('hub0FitLay').value+' | id(start)='+(getPointIdFt? 'x':'');});
 console.log('reducer no size:',await st().catch(e=>e.message));
 await H.sel('hub0FitBr','8"');await p.waitForTimeout(400);
 console.log('reducer 8:',await st().catch(e=>e.message));
 console.log('ids:',await p.evaluate(()=>['start','hub0','hub1','end'].map(k=>k+'='+JSON.stringify(window.pbRedAt(k,true))).join(' ')));
 await p.click('#hub1FitOn');await H.sel('hub1FitType','Wye');await p.waitForTimeout(300);
 console.log('wye after reducer label:',await p.evaluate(()=>document.getElementById('hub1FitBrL').textContent));
 await H.click('Review & Calculate');await p.waitForTimeout(1500);
 console.log('review:',await p.evaluate(()=>document.getElementById('screen-review').innerText.replace(/\s+/g,' ').slice(0,1200)));
 await H.shot('90-review-reducer');
 await H.click('Lock This Run');await p.waitForTimeout(2500);
 for(let i=0;i<3;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();console.log('M',m.slice(0,100),bt);await H.modalClick(bt[bt.length-1]);}
 const rows=async()=>p.evaluate(()=>[...document.querySelectorAll('#resultsTable tbody tr')].filter(r=>!r.classList.contains('pb-noterow')).map(r=>r.innerText.replace(/\s+/g,' ').trim()).filter(t=>/^(0\.0|90\.0|100\.0|110\.0|250\.0|300\.0)/.test(t)).join(' || '));
 console.log('cols',await p.evaluate(()=>[...document.querySelectorAll('#resultsTable thead th')].map(t=>t.innerText.trim()).join(',')));
 console.log('rows:',await rows());
 // add interval at 250
 await H.click('Add Interval').catch(async()=>{await p.evaluate(()=>{const s=[...document.querySelectorAll('#screen-results summary')].find(s=>/More/.test(s.textContent));s&&s.click();});await H.click('Add Interval');});
 await p.waitForTimeout(500);console.log('add modal',await H.modal());
 console.log('errs',p.errs);await b.close();})();
