// One tap on Close Out Permit must not close the permit: it asks first; Keep Permit Open keeps it; Close Out Permit closes it.
const L=require('./lib');(async()=>{const {b,p,H}=await L({file:process.env.FILE||'cur.html'});
 const D=(s)=>p.evaluate(x=>{const r=window.__dbg(x);return r===undefined?null:JSON.parse(JSON.stringify(r));},s);
 await H.lock({cpJobNumber:'24-017'});await H.read(20.9,0,0,0);
 await p.evaluate(()=>pbCloseConfinedPermit());await p.waitForTimeout(1200);
 const m=await H.modal(),bt=await H.modalBtns();const openAfterTap=await D('!!confinedPermit');
 console.log('after one tap: permit open =',openAfterTap,'| modal:',m&&m.slice(0,160),bt);
 let keptOk=false,closedOk=false;
 if(openAfterTap&&bt.includes('Keep Permit Open')){await H.modalClick('Keep Permit Open');await p.waitForTimeout(600);keptOk=await D('!!confinedPermit');
  await p.evaluate(()=>pbCloseConfinedPermit());await p.waitForTimeout(800);await H.modalClick('Close Out Permit');await p.waitForTimeout(1500);
  closedOk=!(await D('!!confinedPermit'))&&(await D('runArchive.filter(e=>e.kind==="confined").length'))===1;}
 // the reason check still asks only once
 const ok=openAfterTap&&keptOk&&closedOk;console.log({openAfterTap,keptOk,closedOk});console.log(ok?'PASS':'FAIL','errs',p.errs);await b.close();process.exit(ok?0:1);})();
