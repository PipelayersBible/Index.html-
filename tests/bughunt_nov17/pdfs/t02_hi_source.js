// A run whose HI is worked out from a stake rod shot must not print the HI as "(entered)". FAIL r16.97, PASS patched.
const L=require('./glib');
(async()=>{const T=await L();const {p,H,S}=T;
 await T.newRun();await H.sel('runIdSel','8"');
 await T.photo('start',S('1+50',103.40,3.61,'MH-1','3860'));await H.f('startStakeReading','4.36');
 await T.photo('end',S('4+51',104.26,3.83,'MH-2','3863'),'p05');
 await H.click('Review & Calculate');await p.waitForTimeout(1500);await H.click('Lock This Run');await p.waitForTimeout(800);
 for(let i=0;i<4;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt.find(x=>/Lock Without|I Checked/.test(x))||bt[bt.length-1]);await p.waitForTimeout(1200);}
 const txt=(await L.pdf(T,((process.env.PB_OUT||'/tmp/claude-0/pdfout')+'/t02.pdf'))||'').replace(/\s+/g,' ');
 const m=(txt.match(/107\.760 ft \([^)]*\)/)||[''])[0];console.log('HI:',m);
 const ok=/107\.760 ft \(worked out from the rod shot/.test(txt)&&!/107\.760 ft \(entered\)/.test(txt);
 console.log(ok?'PASS':'FAIL','errs',p.errs.slice(0,3));await T.b.close();process.exit(ok?0:1);})();
