// A hazardous reading refused as a record (LEL left blank) is kept on the permit as an unlogged hazard.
// The daily report's permit line must count it as OUTSIDE RANGE.
const L=require('./lib');(async()=>{const {b,p,H}=await L({file:process.env.FILE||'cur.html',init:require(__dirname+'/../../rig/co_fm.js')});
 const D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 await H.lock({cpJobNumber:'24-017'});
 const r=await H.read(16,null,null,null);console.log('refused+latched:',/NOT added/.test(r.modal||''),'banner:',!!r.banner);
 // OPEN permit seen by the daily
 let sec=await D('pbDlyPermitSection("24-017",pbFmToday())');
 console.log('OPEN  air_tests',sec.items[0].air_tests,'air_outside',sec.items[0].air_outside,'alerts',JSON.stringify(await D('pbDlyPermitAlerts(pbDlyPermitSection("24-017",pbFmToday()).items)')));
 const openOk=sec.items[0].air_outside===1;
 await p.evaluate(()=>{document.querySelector('#cpCloseoutReasonToggle button[data-val="prohibited"]').click();pbCloseConfinedPermit();});await p.waitForTimeout(900);
 for(let i=0;i<5;i++){const m=await H.modal();if(!m)break;const bt=await H.modalBtns();await H.modalClick(bt[bt.length-1]);await p.waitForTimeout(700);}
 const rt=await D('(runArchive.find(e=>e.kind==="confined")||{}).reportText');
 console.log('permit report mentions it:',/16%/.test(rt||''));
 sec=await D('pbDlyPermitSection("24-017",pbFmToday())');
 console.log('CLOSED air_tests',sec.items[0].air_tests,'air_outside',sec.items[0].air_outside,'alerts',JSON.stringify(await D('pbDlyPermitAlerts(pbDlyPermitSection("24-017",pbFmToday()).items)')));
 const ok=openOk&&sec.items[0].air_outside===1;
 console.log(ok?'PASS':'FAIL','errs',p.errs);await b.close();process.exit(ok?0:1);})();
